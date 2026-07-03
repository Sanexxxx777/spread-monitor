import { LazyStore } from "@tauri-apps/plugin-store";
import type { Coin, Settings } from "./types";
import { clampMarket } from "./venues";

export const CONFIG_KEY = "spread-monitor-config-v1";
const KEY = CONFIG_KEY;
const backupStore = new LazyStore("config.json");

export interface Config {
  coins: Coin[];
  settings: Settings;
}

const SETTINGS_V = 3;
export const DEFAULT_SETTINGS: Settings = {
  maxHistory: 3000,
  autoStart: true,
  palette: "setup",
  v: SETTINGS_V,
};

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function defaultConfig(): Config {
  return {
    coins: [
      {
        id: uid(),
        base: "PEPE",
        label: "PEPE",
        contract: "0x6982508145454ce325ddbe47a25d4ec3d2311933",
        venueA: "binance",
        venueB: "gate",
        marketA: "perp",
        marketB: "perp",
        threshold: 1,
        interval: 5,
        basis: "last",
        sound: true,
      },
      {
        id: uid(),
        base: "BTC",
        label: "BTC",
        venueA: "binance",
        venueB: "hyperliquid",
        marketA: "perp",
        marketB: "perp",
        threshold: 0.1,
        interval: 5,
        basis: "last",
        sound: false,
      },
    ],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function normalizeConfig(c: Partial<Config>): Config {
  const stored: Partial<Settings> = c.settings ?? {};
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  // разовая миграция палитры: проверяем СЫРОЕ stored.v (после merge v подтянулось
  // бы из дефолта и условие не сработало бы — это и был баг «цвета остались старые»).
  if ((stored.v ?? 0) < SETTINGS_V) {
    settings.palette = DEFAULT_SETTINGS.palette;
    settings.v = SETTINGS_V;
  }
  // нормализация старых монет без полей рынка
  const coins = (c.coins ?? []).map((coin) => ({
    ...coin,
    marketA: clampMarket(
      coin.venueA,
      coin.marketA ?? (coin.venueA === "dexscreener" ? "spot" : "perp"),
    ),
    marketB: clampMarket(
      coin.venueB,
      coin.marketB ?? (coin.venueB === "dexscreener" ? "spot" : "perp"),
    ),
  }));
  return { coins, settings };
}

export function loadConfig(): Config {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      return normalizeConfig(JSON.parse(raw) as Partial<Config>);
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
  try {
    void backupStore
      .set(KEY, c)
      .then(() => backupStore.save())
      .catch(() => {});
  } catch {
    /* ignore */
  }
}

// durable-бэкап: localStorage — первичный (синхронный, надёжный при закрытии),
// файл через tauri-plugin-store — на случай эвикции WebKit storage pressure.
export async function restoreFromBackup(): Promise<Config | null> {
  try {
    const raw = await backupStore.get<Partial<Config>>(KEY);
    if (!raw) return null;
    return normalizeConfig(raw);
  } catch {
    return null;
  }
}
