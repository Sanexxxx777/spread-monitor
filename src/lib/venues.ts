import { fetch } from "@tauri-apps/plugin-http";
import type { Coin, Market, Quote, VenueId } from "./types";

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : undefined;
}

async function getJSON(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000), ...init });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const jsonCache = new Map<string, { t: number; p: Promise<unknown> }>();

function cachedJSON(url: string, ttlMs: number): Promise<unknown> {
  const now = Date.now();
  const hit = jsonCache.get(url);
  if (hit && now - hit.t < ttlMs) return hit.p;
  const p = getJSON(url).catch((e) => {
    jsonCache.delete(url);
    throw e;
  });
  jsonCache.set(url, { t: now, p });
  return p;
}

export interface Venue {
  id: VenueId;
  name: string;
  color: string;
  kind: "cex" | "dex";
  markets: Market[];
  symbolFor: (base: string, market: Market) => string;
  // hint — цена другой площадки (для DEX без контракта: выбрать пару, ближайшую по цене)
  quote: (coin: Coin, symbol: string, market: Market, hint?: number) => Promise<Quote | null>;
}

const U = (b: string) => b.toUpperCase();

export const VENUES: Record<VenueId, Venue> = {
  dexscreener: {
    id: "dexscreener",
    name: "DEX (Dexscreener)",
    color: "#8FBC5A",
    kind: "dex",
    markets: ["spot"],
    symbolFor: (b) => b,
    async quote(coin, _s, _m, hint) {
      const query = coin.contract || coin.base;
      if (!query) return null;
      const d = await getJSON(
        `https://api.dexscreener.com/latest/dex/search/?q=${encodeURIComponent(query)}`,
      );
      const pairs = (d.pairs ?? []).filter((p: any) => p?.priceUsd);
      let pool: any[] = [];
      if (coin.contract) {
        // контракт = точное совпадение по адресу
        const addr = coin.contract.toLowerCase();
        pool = pairs.filter((p: any) => (p.baseToken?.address ?? "").toLowerCase() === addr);
      }
      if (!pool.length && coin.base) {
        // фолбэк: по тикеру
        const sym = coin.base.toUpperCase();
        pool = pairs.filter((p: any) => (p.baseToken?.symbol ?? "").toUpperCase() === sym);
      }
      // сеть не фиксируется вручную — определяется автоматически по лучшей паре ниже
      if (!pool.length) pool = pairs;
      if (!pool.length) return null;
      let best: any;
      if (!coin.contract && hint && hint > 0) {
        // без контракта — ближайшая по цене к др. площадке
        best = pool.reduce((m: any, p: any) =>
          Math.abs((num(p.priceUsd) ?? Infinity) - hint) <
          Math.abs((num(m.priceUsd) ?? Infinity) - hint)
            ? p
            : m,
        );
      } else {
        best = pool.reduce((m: any, p: any) =>
          (num(p.liquidity?.usd) ?? 0) > (num(m.liquidity?.usd) ?? 0) ? p : m,
        );
      }
      const last = num(best.priceUsd);
      if (last === undefined) return null;
      return {
        last,
        change24: (num(best.priceChange?.h24) ?? 0) / 100,
        source: best.dexId,
        liquidity: num(best.liquidity?.usd),
        volume: num(best.volume?.h24),
        marketCap: num(best.marketCap) ?? num(best.fdv),
      };
    },
  },

  binance: {
    id: "binance",
    name: "Binance",
    color: "#F0B90B",
    kind: "cex",
    markets: ["perp", "spot"],
    symbolFor: (b) => `${U(b)}USDT`,
    async quote(_c, s, m) {
      if (m === "spot") {
        const d = await getJSON(`https://api.binance.com/api/v3/ticker/bookTicker?symbol=${s}`);
        const bid = num(d.bidPrice),
          ask = num(d.askPrice);
        if (bid === undefined || ask === undefined) return null;
        return { last: (bid + ask) / 2, bid, ask };
      }
      const [bt, pi] = await Promise.all([
        getJSON(`https://fapi.binance.com/fapi/v1/ticker/bookTicker?symbol=${s}`),
        (
          cachedJSON(
            `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${s}`,
            300_000,
          ) as Promise<any>
        ).catch(() => null),
      ]);
      const bid = num(bt.bidPrice),
        ask = num(bt.askPrice);
      if (bid === undefined || ask === undefined) return null;
      return {
        last: (bid + ask) / 2,
        bid,
        ask,
        funding: pi ? num(pi.lastFundingRate) : undefined,
        mark: pi ? num(pi.markPrice) : undefined,
        fundingTime: pi ? num(pi.nextFundingTime) : undefined,
      };
    },
  },

  aster: {
    id: "aster",
    name: "Aster",
    color: "#7C5CFF",
    kind: "cex",
    markets: ["perp", "spot"],
    symbolFor: (b) => `${U(b)}USDT`,
    async quote(_c, s, m) {
      if (m === "spot") {
        const d = await getJSON(`https://sapi.asterdex.com/api/v1/ticker/bookTicker?symbol=${s}`);
        const bid = num(d.bidPrice),
          ask = num(d.askPrice);
        if (bid === undefined || ask === undefined) return null;
        return { last: (bid + ask) / 2, bid, ask };
      }
      const [bt, pi] = await Promise.all([
        getJSON(`https://fapi.asterdex.com/fapi/v1/ticker/bookTicker?symbol=${s}`),
        (
          cachedJSON(
            `https://fapi.asterdex.com/fapi/v1/premiumIndex?symbol=${s}`,
            300_000,
          ) as Promise<any>
        ).catch(() => null),
      ]);
      const bid = num(bt.bidPrice),
        ask = num(bt.askPrice);
      if (bid === undefined || ask === undefined) return null;
      const p = Array.isArray(pi) ? pi[0] : pi;
      return {
        last: (bid + ask) / 2,
        bid,
        ask,
        funding: p ? num(p.lastFundingRate) : undefined,
        mark: p ? num(p.markPrice) : undefined,
        fundingTime: p ? num(p.nextFundingTime) : undefined,
      };
    },
  },

  bybit: {
    id: "bybit",
    name: "Bybit",
    color: "#F7A600",
    kind: "cex",
    markets: ["perp", "spot"],
    symbolFor: (b) => `${U(b)}USDT`,
    async quote(_c, s, m) {
      const cat = m === "spot" ? "spot" : "linear";
      const d = await getJSON(
        `https://api.bybit.com/v5/market/tickers?category=${cat}&symbol=${s}`,
      );
      const r = d?.result?.list?.[0];
      if (!r) return null;
      const last = num(r.lastPrice);
      if (last === undefined) return null;
      return {
        last,
        bid: num(r.bid1Price),
        ask: num(r.ask1Price),
        funding: m === "perp" ? num(r.fundingRate) : undefined,
        fundingTime: m === "perp" ? num(r.nextFundingTime) : undefined,
        mark: num(r.markPrice),
        change24: num(r.price24hPcnt),
      };
    },
  },

  okx: {
    id: "okx",
    name: "OKX",
    color: "#5BC0FF",
    kind: "cex",
    markets: ["perp", "spot"],
    symbolFor: (b, m) => (m === "spot" ? `${U(b)}-USDT` : `${U(b)}-USDT-SWAP`),
    async quote(_c, s, m) {
      const reqs: Promise<any>[] = [
        getJSON(`https://www.okx.com/api/v5/market/ticker?instId=${s}`),
      ];
      if (m === "perp")
        reqs.push(
          (
            cachedJSON(
              `https://www.okx.com/api/v5/public/funding-rate?instId=${s}`,
              300_000,
            ) as Promise<any>
          ).catch(() => null),
        );
      const [t, fr] = await Promise.all(reqs);
      const r = t?.data?.[0];
      if (!r) return null;
      const last = num(r.last);
      if (last === undefined) return null;
      const open = num(r.open24h);
      return {
        last,
        bid: num(r.bidPx),
        ask: num(r.askPx),
        change24: open ? (last - open) / open : undefined,
        funding: fr ? num(fr.data?.[0]?.fundingRate) : undefined,
        fundingTime: fr ? num(fr.data?.[0]?.fundingTime) : undefined,
      };
    },
  },

  bitget: {
    id: "bitget",
    name: "Bitget",
    color: "#00E1C4",
    kind: "cex",
    markets: ["perp", "spot"],
    symbolFor: (b) => `${U(b)}USDT`,
    async quote(_c, s, m) {
      if (m === "spot") {
        const d = await getJSON(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${s}`);
        const r = d?.data?.[0];
        if (!r) return null;
        const last = num(r.lastPr);
        if (last === undefined) return null;
        return { last, bid: num(r.bidPr), ask: num(r.askPr), change24: num(r.change24h) };
      }
      const [d, ft] = await Promise.all([
        getJSON(
          `https://api.bitget.com/api/v2/mix/market/ticker?symbol=${s}&productType=USDT-FUTURES`,
        ),
        (
          cachedJSON(
            `https://api.bitget.com/api/v2/mix/market/funding-time?symbol=${s}&productType=USDT-FUTURES`,
            300_000,
          ) as Promise<any>
        ).catch(() => null),
      ]);
      const r = d?.data?.[0];
      if (!r) return null;
      const last = num(r.lastPr);
      if (last === undefined) return null;
      return {
        last,
        bid: num(r.bidPr),
        ask: num(r.askPr),
        funding: num(r.fundingRate),
        change24: num(r.change24h),
        fundingTime: ft ? num(ft.data?.[0]?.nextFundingTime) : undefined,
      };
    },
  },

  kucoin: {
    id: "kucoin",
    name: "KuCoin",
    color: "#01BC8D",
    kind: "cex",
    markets: ["perp", "spot"],
    symbolFor: (b, m) =>
      m === "spot" ? `${U(b)}-USDT` : `${b.toUpperCase() === "BTC" ? "XBT" : U(b)}USDTM`,
    async quote(_c, s, m) {
      if (m === "spot") {
        const d = await getJSON(
          `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${s}`,
        );
        const r = d?.data;
        if (!r) return null;
        const last = num(r.price);
        if (last === undefined) return null;
        return { last, bid: num(r.bestBid), ask: num(r.bestAsk) };
      }
      const [t, fr] = await Promise.all([
        getJSON(`https://api-futures.kucoin.com/api/v1/ticker?symbol=${s}`),
        (
          cachedJSON(
            `https://api-futures.kucoin.com/api/v1/funding-rate/${s}/current`,
            300_000,
          ) as Promise<any>
        ).catch(() => null),
      ]);
      const r = t?.data;
      if (!r) return null;
      const last = num(r.price);
      if (last === undefined) return null;
      const tp = fr ? num(fr.data?.timePoint) : undefined;
      const gr = fr ? num(fr.data?.granularity) : undefined;
      return {
        last,
        bid: num(r.bestBidPrice),
        ask: num(r.bestAskPrice),
        funding: fr ? num(fr.data?.value) : undefined,
        fundingTime: tp !== undefined && gr !== undefined ? tp + gr : undefined,
      };
    },
  },

  hyperliquid: {
    id: "hyperliquid",
    name: "Hyperliquid",
    color: "#50D2C1",
    kind: "cex",
    markets: ["perp"],
    symbolFor: (b) => U(b),
    async quote(_c, s) {
      const d = await getJSON("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "allMids" }),
      });
      const v = num(d[s]) ?? num(d[`k${s}`]);
      if (v === undefined) return null;
      return { last: v };
    },
  },

  mexc: {
    id: "mexc",
    name: "MEXC",
    color: "#1972F5",
    kind: "cex",
    markets: ["perp", "spot"],
    symbolFor: (b, m) => (m === "spot" ? `${U(b)}USDT` : `${U(b)}_USDT`),
    async quote(_c, s, m) {
      if (m === "spot") {
        const [bt, t24] = await Promise.all([
          getJSON(`https://api.mexc.com/api/v3/ticker/bookTicker?symbol=${s}`),
          getJSON(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${s}`).catch(() => null),
        ]);
        const bid = num(bt.bidPrice),
          ask = num(bt.askPrice);
        if (bid === undefined || ask === undefined) return null;
        const chg = t24 ? num(t24.priceChangePercent) : undefined;
        return {
          last: (bid + ask) / 2,
          bid,
          ask,
          change24: chg !== undefined ? chg / 100 : undefined,
        };
      }
      const [d, fr] = await Promise.all([
        getJSON(`https://contract.mexc.com/api/v1/contract/ticker?symbol=${s}`),
        (
          cachedJSON(
            `https://contract.mexc.com/api/v1/contract/funding_rate/${s}`,
            300_000,
          ) as Promise<any>
        ).catch(() => null),
      ]);
      const raw = Array.isArray(d?.data) ? d.data.find((x: any) => x.symbol === s) : d?.data;
      if (!raw) return null;
      const last = num(raw.lastPrice);
      if (last === undefined) return null;
      return {
        last,
        bid: num(raw.bid1),
        ask: num(raw.ask1),
        change24: num(raw.riseFallRate),
        funding: fr ? num(fr.data?.fundingRate) : undefined,
        fundingTime: fr ? num(fr.data?.nextSettleTime) : undefined,
      };
    },
  },

  gate: {
    id: "gate",
    name: "Gate",
    color: "#D06AC0",
    kind: "cex",
    markets: ["perp", "spot"],
    symbolFor: (b) => `${U(b)}_USDT`,
    async quote(_c, s, m) {
      if (m === "spot") {
        const d = await getJSON(`https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${s}`);
        const r = Array.isArray(d) ? d[0] : null;
        if (!r) return null;
        const last = num(r.last);
        if (last === undefined) return null;
        return {
          last,
          bid: num(r.highest_bid),
          ask: num(r.lowest_ask),
          change24: (num(r.change_percentage) ?? 0) / 100,
        };
      }
      const [d, cd] = await Promise.all([
        getJSON(`https://api.gateio.ws/api/v4/futures/usdt/tickers?contract=${s}`),
        (
          cachedJSON(
            `https://api.gateio.ws/api/v4/futures/usdt/contracts/${s}`,
            300_000,
          ) as Promise<any>
        ).catch(() => null),
      ]);
      const r = Array.isArray(d) ? d[0] : null;
      if (!r) return null;
      const last = num(r.last);
      if (last === undefined) return null;
      const cc = Array.isArray(cd) ? cd[0] : cd;
      const fna = cc ? num(cc.funding_next_apply) : undefined; // секунды
      return {
        last,
        bid: num(r.highest_bid),
        ask: num(r.lowest_ask),
        funding: num(r.funding_rate),
        mark: num(r.mark_price),
        change24: (num(r.change_percentage) ?? 0) / 100,
        fundingTime: fna ? fna * 1000 : undefined,
      };
    },
  },
};

export const VENUE_LIST = Object.values(VENUES);

export function symbolForVenue(coin: Coin, id: VenueId, market: Market): string {
  return VENUES[id].symbolFor(coin.base, market);
}

/** Привести рынок к поддерживаемому площадкой (DEX=spot, Aster/HL=perp). */
export function clampMarket(id: VenueId, market: Market): Market {
  const ms = VENUES[id].markets;
  return ms.includes(market) ? market : ms[0];
}

/** Цена для расчёта спреда по выбранной базе. */
export function priceForBasis(q: Quote, basis: "last" | "exec", side: "A" | "B"): number {
  if (basis === "exec") {
    if (side === "A") return q.ask ?? q.last;
    return q.bid ?? q.last;
  }
  return q.last;
}
