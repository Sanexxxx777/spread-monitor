import { fetch } from "@tauri-apps/plugin-http";
import type { Coin, Quote, VenueId } from "./types";

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : undefined;
}

async function getJSON(url: string, init?: RequestInit): Promise<unknown> {
  const r = await fetch(url, { method: "GET", ...init });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export interface Venue {
  id: VenueId;
  name: string;
  color: string;
  kind: "cex" | "dex";
  /** символ площадки из базового тикера; для DEX игнорируется */
  symbolFor: (base: string) => string;
  quote: (coin: Coin, symbol: string) => Promise<Quote | null>;
}

const upper = (b: string) => b.toUpperCase();

export const VENUES: Record<VenueId, Venue> = {
  dexscreener: {
    id: "dexscreener", name: "DEX (Dexscreener)", color: "#8FBC5A", kind: "dex",
    symbolFor: (b) => b,
    async quote(coin) {
      if (!coin.contract) return null;
      const url = `https://api.dexscreener.com/latest/dex/search/?q=${coin.contract}`;
      const d = (await getJSON(url)) as { pairs?: any[] };
      const addr = coin.contract.toLowerCase();
      const pairs = (d.pairs ?? []).filter((p) => p?.priceUsd);
      let pool = pairs.filter((p) => (p.baseToken?.address ?? "").toLowerCase() === addr);
      if (coin.chain) {
        const c = pool.filter((p) => p.chainId === coin.chain);
        if (c.length) pool = c;
      }
      if (!pool.length) pool = pairs;
      if (!pool.length) return null;
      const best = pool.reduce((m, p) =>
        (num(p.liquidity?.usd) ?? 0) > (num(m.liquidity?.usd) ?? 0) ? p : m);
      const last = num(best.priceUsd);
      if (last === undefined) return null;
      return {
        last,
        change24: (num(best.priceChange?.h24) ?? 0) / 100,
        source: best.dexId,
        liquidity: num(best.liquidity?.usd),
      };
    },
  },

  binance: {
    id: "binance", name: "Binance", color: "#F0B90B", kind: "cex",
    symbolFor: (b) => `${upper(b)}USDT`,
    async quote(_coin, s) {
      const d = (await getJSON(
        `https://fapi.binance.com/fapi/v1/ticker/bookTicker?symbol=${s}`)) as any;
      const bid = num(d.bidPrice), ask = num(d.askPrice);
      if (bid === undefined || ask === undefined) return null;
      return { last: (bid + ask) / 2, bid, ask };
    },
  },

  aster: {
    id: "aster", name: "Aster", color: "#7C5CFF", kind: "cex",
    symbolFor: (b) => `${upper(b)}USDT`,
    async quote(_coin, s) {
      const d = (await getJSON(
        `https://fapi.asterdex.com/fapi/v1/ticker/bookTicker?symbol=${s}`)) as any;
      const bid = num(d.bidPrice), ask = num(d.askPrice);
      if (bid === undefined || ask === undefined) return null;
      return { last: (bid + ask) / 2, bid, ask };
    },
  },

  bybit: {
    id: "bybit", name: "Bybit", color: "#F7A600", kind: "cex",
    symbolFor: (b) => `${upper(b)}USDT`,
    async quote(_coin, s) {
      const d = (await getJSON(
        `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${s}`)) as any;
      const r = d?.result?.list?.[0];
      if (!r) return null;
      const last = num(r.lastPrice);
      if (last === undefined) return null;
      return {
        last, bid: num(r.bid1Price), ask: num(r.ask1Price),
        funding: num(r.fundingRate), mark: num(r.markPrice),
        change24: num(r.price24hPcnt),
      };
    },
  },

  okx: {
    id: "okx", name: "OKX", color: "#5BC0FF", kind: "cex",
    symbolFor: (b) => `${upper(b)}-USDT-SWAP`,
    async quote(_coin, s) {
      const d = (await getJSON(
        `https://www.okx.com/api/v5/market/ticker?instId=${s}`)) as any;
      const r = d?.data?.[0];
      if (!r) return null;
      const last = num(r.last);
      if (last === undefined) return null;
      const open = num(r.open24h);
      return {
        last, bid: num(r.bidPx), ask: num(r.askPx),
        change24: open ? (last - open) / open : undefined,
      };
    },
  },

  bitget: {
    id: "bitget", name: "Bitget", color: "#00E1C4", kind: "cex",
    symbolFor: (b) => `${upper(b)}USDT`,
    async quote(_coin, s) {
      const d = (await getJSON(
        `https://api.bitget.com/api/v2/mix/market/ticker?symbol=${s}&productType=USDT-FUTURES`)) as any;
      const r = d?.data?.[0];
      if (!r) return null;
      const last = num(r.lastPr);
      if (last === undefined) return null;
      return {
        last, bid: num(r.bidPr), ask: num(r.askPr),
        funding: num(r.fundingRate), change24: num(r.change24h),
      };
    },
  },

  kucoin: {
    id: "kucoin", name: "KuCoin", color: "#01BC8D", kind: "cex",
    symbolFor: (b) => `${b.toUpperCase() === "BTC" ? "XBT" : upper(b)}USDTM`,
    async quote(_coin, s) {
      const d = (await getJSON(
        `https://api-futures.kucoin.com/api/v1/ticker?symbol=${s}`)) as any;
      const r = d?.data;
      if (!r) return null;
      const last = num(r.price);
      if (last === undefined) return null;
      return { last, bid: num(r.bestBidPrice), ask: num(r.bestAskPrice) };
    },
  },

  hyperliquid: {
    id: "hyperliquid", name: "Hyperliquid", color: "#50D2C1", kind: "cex",
    symbolFor: (b) => upper(b),
    async quote(_coin, s) {
      const d = (await getJSON("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "allMids" }),
      })) as Record<string, string>;
      const v = num(d[s]) ?? num(d[`k${s}`]);
      if (v === undefined) return null;
      return { last: v };
    },
  },

  mexc: {
    id: "mexc", name: "MEXC", color: "#1972F5", kind: "cex",
    symbolFor: (b) => `${upper(b)}_USDT`,
    async quote(_coin, s) {
      const d = (await getJSON(
        `https://contract.mexc.com/api/v1/contract/ticker?symbol=${s}`)) as any;
      const raw = Array.isArray(d?.data)
        ? d.data.find((x: any) => x.symbol === s)
        : d?.data;
      if (!raw) return null;
      const last = num(raw.lastPrice);
      if (last === undefined) return null;
      return {
        last, bid: num(raw.bid1), ask: num(raw.ask1),
        change24: num(raw.riseFallRate),
      };
    },
  },

  gate: {
    id: "gate", name: "Gate", color: "#D06AC0", kind: "cex",
    symbolFor: (b) => `${upper(b)}_USDT`,
    async quote(_coin, s) {
      const d = (await getJSON(
        `https://api.gateio.ws/api/v4/futures/usdt/tickers?contract=${s}`)) as any[];
      const r = Array.isArray(d) ? d[0] : null;
      if (!r) return null;
      const last = num(r.last);
      if (last === undefined) return null;
      return {
        last, bid: num(r.highest_bid), ask: num(r.lowest_ask),
        funding: num(r.funding_rate), mark: num(r.mark_price),
        change24: (num(r.change_percentage) ?? 0) / 100,
      };
    },
  },
};

export const VENUE_LIST = Object.values(VENUES);

export function symbolForVenue(coin: Coin, id: VenueId): string {
  return VENUES[id].symbolFor(coin.base);
}

/** Цена для расчёта спреда по выбранной базе. */
export function priceForBasis(q: Quote, basis: "last" | "exec", side: "A" | "B"): number {
  if (basis === "exec") {
    // покупаем на A по ask, продаём на B по bid
    if (side === "A") return q.ask ?? q.last;
    return q.bid ?? q.last;
  }
  return q.last;
}
