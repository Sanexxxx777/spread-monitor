# Spread Monitor

Нативное macOS-приложение (Tauri) для мониторинга спреда между **любыми двумя
площадками** из 10: DEX (Dexscreener) + фьючерсы Binance, Bybit, OKX, Bitget,
KuCoin, Hyperliquid, Aster, MEXC, Gate.

Выбираете площадку **A** и площадку **B** из выпадающих списков — и видите всю
динамику спреда между ними: цены, спред по `last` или по стакану, funding,
24h-изменение, реал-тайм графики.

Премиальный интерфейс с настоящим **liquid glass** (нативный vibrancy macOS) в
стиле дизайн-системы gamma. Преемник Qt-версии (`../dex-spread-monitor`).

## Возможности
- **Пара площадок A ⇄ B** для каждой монеты, переключение «на лету».
- KPI: цена A, цена B, спред B/A, funding/24h, контекст.
- Два графика (lightweight-charts): цены A/B и спред с линией порога; зум/пан.
- Сигнал (звук + тост) при пробое порога — один раз на пересечение.
- Несколько отслеживаемых пар, боковой список со спредами.
- Конфиг сохраняется автоматически.

## Запуск (разработка)
```bash
npm install
npm run tauri dev
```

## Сборка приложения
```bash
npm run tauri build
# → src-tauri/target/release/bundle/macos/Spread Monitor.app  (~5.5 МБ)
```

## Стек
- **Tauri v2** (Rust) — нативное окно, vibrancy, HTTP к биржам без CORS.
- **React 19 + Vite 8 + TypeScript** — фронтенд.
- **Tailwind v4** + **Radix UI** — премиальные компоненты, gamma-стекло.
- **lightweight-charts v5** — финансовые графики.

## Площадки и форматы символов
| Площадка | Символ из базы | Данные |
|---|---|---|
| Binance / Aster | `BTCUSDT` | bid/ask |
| Bybit | `BTCUSDT` | last/bid/ask/funding/mark |
| OKX | `BTC-USDT-SWAP` | last/bid/ask |
| Bitget | `BTCUSDT` | last/bid/ask/funding |
| KuCoin | `XBTUSDTM` (BTC→XBT) | last/bid/ask |
| Hyperliquid | `BTC` / `kPEPE` | mid |
| MEXC / Gate | `BTC_USDT` | last/bid/ask (+funding у Gate) |
| Dexscreener (DEX) | контракт + сеть | priceUsd |

Графики lightweight-charts © TradingView (Apache-2.0).
