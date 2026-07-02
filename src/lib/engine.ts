import { useSyncExternalStore } from "react";
import type { Coin, Market, Point, Quote, VenueId } from "./types";
import { priceForBasis, symbolForVenue, VENUES } from "./venues";

export interface CoinState {
  qa?: Quote;
  qb?: Quote;
  priceA?: number;
  priceB?: number;
  spread?: number;
  history: Point[];
  lastUpdate?: number;
  running: boolean;
  alerted: boolean;
  error?: string;
  epoch: number;
}

type Listener = () => void;

class Engine {
  coins: Coin[] = [];
  states = new Map<string, CoinState>();
  maxHistory = 3000;
  version = 0;
  onAlert?: (coin: Coin, msg: string) => void;

  private timers = new Map<string, number>();
  private listeners = new Set<Listener>();

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  getVersion = () => this.version;

  setCoins(coins: Coin[], maxHistory: number) {
    this.maxHistory = maxHistory;
    const ids = new Set(coins.map((c) => c.id));
    for (const id of [...this.states.keys()]) {
      if (!ids.has(id)) {
        this.stop(id);
        this.states.delete(id);
      }
    }
    this.coins = coins;
    for (const c of coins) {
      if (!this.states.has(c.id)) {
        this.states.set(c.id, { history: [], running: false, alerted: false, epoch: 0 });
      }
    }
    this.emit();
  }

  state(id: string): CoinState | undefined {
    return this.states.get(id);
  }

  start(id: string) {
    const st = this.states.get(id);
    if (!st || st.running) return;
    st.running = true;
    // монету берём заново каждую итерацию — смена площадки/интервала/порога
    // подхватывается «на лету», без перезапуска.
    const loop = async () => {
      const c = this.coins.find((x) => x.id === id);
      if (!c || !this.states.get(id)?.running) return;
      await this.fetchOnce(c);
      if (this.states.get(id)?.running) {
        this.timers.set(id, window.setTimeout(loop, Math.max(1, c.interval) * 1000));
      }
    };
    void loop();
    this.emit();
  }

  stop(id: string) {
    const st = this.states.get(id);
    if (st) st.running = false;
    const t = this.timers.get(id);
    if (t !== undefined) {
      clearTimeout(t);
      this.timers.delete(id);
    }
    this.emit();
  }

  startAll() {
    this.coins.forEach((c) => this.start(c.id));
  }
  stopAll() {
    this.coins.forEach((c) => this.stop(c.id));
  }

  clear(id: string) {
    const st = this.states.get(id);
    if (st) {
      st.epoch++;
      st.history = [];
      st.lastUpdate = undefined;
      st.spread = undefined;
      st.qa = st.qb = undefined;
      st.priceA = st.priceB = undefined;
      st.alerted = false;
    }
    this.emit();
  }

  private async fetchOnce(c: Coin) {
    const st = this.states.get(c.id);
    if (!st) return;
    const epoch = st.epoch;
    try {
      let errA: string | undefined;
      let errB: string | undefined;
      const q =
        (side: "A" | "B") =>
        (id: VenueId, market: Market, hint?: number): Promise<Quote | null> =>
          VENUES[id].quote(c, symbolForVenue(c, id, market), market, hint).catch((e) => {
            const msg = String((e as Error)?.message ?? e);
            if (side === "A") errA = msg;
            else errB = msg;
            return null;
          });
      const qA = q("A");
      const qB = q("B");
      const aDexNoC = VENUES[c.venueA].kind === "dex" && !c.contract;
      const bDexNoC = VENUES[c.venueB].kind === "dex" && !c.contract;

      let qa: Quote | null;
      let qb: Quote | null;
      if (bDexNoC && !aDexNoC) {
        // B — DEX без контракта: сначала A как ценовой ориентир
        qa = await qA(c.venueA, c.marketA);
        qb = await qB(c.venueB, c.marketB, qa?.last);
      } else if (aDexNoC && !bDexNoC) {
        qb = await qB(c.venueB, c.marketB);
        qa = await qA(c.venueA, c.marketA, qb?.last);
      } else {
        [qa, qb] = await Promise.all([qA(c.venueA, c.marketA), qB(c.venueB, c.marketB)]);
      }

      if (this.states.get(c.id) !== st || st.epoch !== epoch) return;

      // Цены ставим НЕЗАВИСИМО: даже если одна сторона без данных, вторая видна.
      st.qa = qa ?? undefined;
      st.qb = qb ?? undefined;
      const pa = qa ? priceForBasis(qa, c.basis, "A") : undefined;
      const pb = qb ? priceForBasis(qb, c.basis, "B") : undefined;
      st.priceA = pa;
      st.priceB = pb;
      st.lastUpdate = Date.now();

      if (pa !== undefined && pb !== undefined && pa > 0) {
        const spread = ((pb - pa) / pa) * 100;
        st.spread = spread;
        const t = Math.floor(Date.now() / 1000);
        const last = st.history[st.history.length - 1];
        if (!last || last.t !== t) st.history.push({ t, a: pa, b: pb, spread });
        if (st.history.length > this.maxHistory) {
          st.history.splice(0, st.history.length - this.maxHistory);
        }
        st.error = undefined;
        const hit =
          c.threshold !== 0 && (c.threshold >= 0 ? spread >= c.threshold : spread <= c.threshold);
        if (hit && !st.alerted) {
          st.alerted = true;
          this.onAlert?.(
            c,
            `${c.label}: спред ${spread.toFixed(2)}% пересёк порог ${c.threshold}%`,
          );
        } else if (!hit && st.alerted) {
          const margin = Math.max(0.05, Math.abs(c.threshold) * 0.1);
          const released =
            c.threshold >= 0 ? spread < c.threshold - margin : spread > c.threshold + margin;
          if (released) st.alerted = false;
        }
      } else {
        st.spread = undefined;
        st.error = !qa
          ? `нет данных: ${c.venueA}${errA ? ` (${errA})` : ""}`
          : !qb
            ? `нет данных: ${c.venueB}${errB ? ` (${errB})` : ""}`
            : undefined;
      }
    } catch (e) {
      if (this.states.get(c.id) !== st || st.epoch !== epoch) return;
      st.error = String(e);
    }
    this.emit();
  }
}

export const engine = new Engine();

export function useEngineVersion(): number {
  return useSyncExternalStore(engine.subscribe, engine.getVersion, engine.getVersion);
}
