import { useSyncExternalStore } from "react";
import type { Coin, Point, Quote } from "./types";
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
        this.states.set(c.id, { history: [], running: false, alerted: false });
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
    try {
      const [qa, qb] = await Promise.all([
        VENUES[c.venueA].quote(c, symbolForVenue(c, c.venueA)).catch(() => null),
        VENUES[c.venueB].quote(c, symbolForVenue(c, c.venueB)).catch(() => null),
      ]);
      st.qa = qa ?? undefined;
      st.qb = qb ?? undefined;
      if (qa && qb) {
        const pa = priceForBasis(qa, c.basis, "A");
        const pb = priceForBasis(qb, c.basis, "B");
        const spread = pa > 0 ? ((pb - pa) / pa) * 100 : 0;
        st.priceA = pa;
        st.priceB = pb;
        st.spread = spread;
        const t = Math.floor(Date.now() / 1000);
        const last = st.history[st.history.length - 1];
        if (!last || last.t !== t) st.history.push({ t, a: pa, b: pb, spread });
        if (st.history.length > this.maxHistory) {
          st.history.splice(0, st.history.length - this.maxHistory);
        }
        st.lastUpdate = Date.now();
        st.error = undefined;
        const hit = c.threshold >= 0 ? spread >= c.threshold : spread <= c.threshold;
        if (hit && !st.alerted) {
          st.alerted = true;
          if (c.sound) {
            this.onAlert?.(c, `${c.label}: спред ${spread.toFixed(2)}% пересёк порог ${c.threshold}%`);
          }
        } else if (!hit) {
          st.alerted = false;
        }
      } else {
        st.error = !qa ? `нет данных: ${c.venueA}` : `нет данных: ${c.venueB}`;
      }
    } catch (e) {
      st.error = String(e);
    }
    this.emit();
  }
}

export const engine = new Engine();

export function useEngineVersion(): number {
  return useSyncExternalStore(engine.subscribe, engine.getVersion, engine.getVersion);
}
