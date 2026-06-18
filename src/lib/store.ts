import type { Coin, Settings } from "./types";

const KEY = "spread-monitor-config-v1";

export interface Config {
  coins: Coin[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = { maxHistory: 3000, autoStart: true, palette: "slate" };

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function defaultConfig(): Config {
  return {
    coins: [
      {
        id: uid(), base: "PEPE", label: "PEPE",
        contract: "0x6982508145454ce325ddbe47a25d4ec3d2311933", chain: "ethereum",
        venueA: "binance", venueB: "gate",
        threshold: 1, interval: 5, basis: "last", sound: true,
      },
      {
        id: uid(), base: "BTC", label: "BTC",
        venueA: "binance", venueB: "hyperliquid",
        threshold: 0.1, interval: 5, basis: "last", sound: false,
      },
    ],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadConfig(): Config {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as Partial<Config>;
      return {
        coins: c.coins ?? [],
        settings: { ...DEFAULT_SETTINGS, ...(c.settings ?? {}) },
      };
    }
  } catch {
    /* ignore */
  }
  return defaultConfig();
}

export function saveConfig(c: Config): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}
