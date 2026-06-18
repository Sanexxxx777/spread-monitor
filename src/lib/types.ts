export type VenueId =
  | "dexscreener" | "binance" | "bybit" | "okx" | "bitget"
  | "kucoin" | "hyperliquid" | "aster" | "mexc" | "gate";

export type Market = "spot" | "perp";

export interface Quote {
  last: number;
  bid?: number;
  ask?: number;
  funding?: number;   // доля (0.0001 = 0.01%)
  change24?: number;  // доля
  mark?: number;
  source?: string;    // напр. имя DEX-пула
  liquidity?: number; // только DEX
}

export interface Coin {
  id: string;
  base: string;        // BTC, PEPE, ...
  label: string;       // отображаемое имя
  contract?: string;   // адрес токена для DEX (Dexscreener)
  chain?: string;      // сеть DEX
  venueA: VenueId;
  venueB: VenueId;
  marketA: Market;     // спот или фьючерс для площадки A
  marketB: Market;
  threshold: number;   // % порог сигнала
  interval: number;    // сек опрос
  basis: "last" | "exec";
  sound: boolean;
}

export interface Point {
  t: number;       // секунды (unix)
  a: number;       // цена A
  b: number;       // цена B
  spread: number;  // %
}

export interface Settings {
  maxHistory: number;
  autoStart: boolean;
  palette: string;
  v?: number; // версия настроек (для разовых миграций палитры)
}
