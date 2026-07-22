# Spread Monitor

<!-- TODO: demo GIF (20-40s) -->

<details>
<summary>🇬🇧 English summary</summary>

Native macOS app (Tauri) for monitoring the spread between **any two venues** out of 10: DEX (Dexscreener) + futures on Binance, Bybit, OKX, Bitget, KuCoin, Hyperliquid, Aster, MEXC, Gate. Pick venue **A** and venue **B** from dropdowns and see the full spread dynamics: prices, spread by last price or orderbook, funding, 24h change, real-time charts. Liquid-glass UI — native macOS vibrancy, warm-gold gamma design system. Successor to the Qt version.

Run: `npm install && npm run tauri dev`. Build: `npm run tauri build`. Stack: Tauri v2 (Rust) + React 19 + Vite + TypeScript + Tailwind v4 + Radix UI + lightweight-charts.

⚠️ **Not financial advice (NFA).** This tool only displays market data — it does not execute trades, provide signals, or guarantee data accuracy/latency. Use at your own risk.

Full README below is in Russian.

</details>

Нативное macOS-приложение (Tauri) для мониторинга спреда между **любыми двумя
площадками** из 10: DEX (Dexscreener) + фьючерсы Binance, Bybit, OKX, Bitget,
KuCoin, Hyperliquid, Aster, MEXC, Gate.

Выбираете площадку **A** и площадку **B** из выпадающих списков — и видите всю
динамику спреда между ними: цены, спред по `last` или по стакану, funding,
24h-изменение, реал-тайм графики.

Интерфейс на **liquid glass** — нативный vibrancy macOS, тёплое золото
дизайн-системы gamma. Преемник Qt-версии (`../dex-spread-monitor`).

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

## ⚠️ Дисклеймер / Disclaimer

Не является финансовой консультацией (NFA). Приложение только отображает рыночные данные из публичных API бирж/DEX — не исполняет сделки, не даёт торговых сигналов и не гарантирует точность или задержку данных. Используйте на свой риск.

Not financial advice (NFA). Spread Monitor only displays market data pulled from public exchange/DEX APIs — it does not execute trades, provide signals, or guarantee data accuracy or latency. Use at your own risk.

## Автор

**Aleksandr Shulgin** ([@Aleksandr_NFA](https://t.me/Aleksandr_NFA))
- GitHub: [github.com/Sanexxxx777](https://github.com/Sanexxxx777)
- Портфолио: [shulgin.is-a.dev](https://shulgin.is-a.dev)
- Telegram-канал: [@driptrade3](https://t.me/driptrade3)

## Лицензия

Некоммерческая лицензия с обязательной атрибуцией — см. [LICENSE](LICENSE).
- ✅ Личное и **некоммерческое** использование, копирование, доработка.
- ⛔ **Коммерческое** использование — только с письменного разрешения автора.
- ⛔ Распространение **без указания авторства** запрещено.

© 2026 Aleksandr Shulgin ([@Aleksandr_NFA](https://t.me/driptrade3)).
