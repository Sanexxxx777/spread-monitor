# Spread Monitor (Tauri) — заметки для агента

Нативное macOS-приложение: спред между ЛЮБЫМИ двумя площадками из 10 (DEX +
9 CEX-фьючерсов). Tauri v2 + React 19 + Vite 8 + Tailwind v4 + lightweight-charts.
Преемник Qt-версии `~/Projects/dex-spread-monitor` (она оставлена как фолбэк).

## Run / Build
- Dev: `npm run tauri dev`. Сборка: `npm run tauri build` → `src-tauri/target/release/bundle/macos/Spread Monitor.app` (~5.5 МБ).
- Только фронтенд (быстрая проверка типов): `npm run build` (= `tsc -b && vite build`).

## Гетчи (НЕ переоткрывать заново)
- **Vite 8 = rolldown, БЕЗ esbuild.** `minify: "esbuild"` падает («Cannot find package 'esbuild'»). Использовать `minify: "oxc"` (нативный для Vite 8).
- **TS 6: `baseUrl` запрещён** (deprecated → ошибка). Алиас `@/*` задан ТОЛЬКО через `paths` в `tsconfig.app.json`.
- **Liquid glass = НАТИВНЫЙ vibrancy Tauri**, НЕ CSS-самоделка: `tauri.conf.json` → `windowEffects.effects: ["sidebar"]` + `transparent: true` + `app.macOSPrivateApi: true` (требует cargo-feature `macos-private-api` у `tauri` — добавляется автоматически). Плюс в CSS: `body{background:transparent}` и панели `.glass` с `backdrop-filter`. НЕ делать панели/боди непрозрачными — пропадёт стекло.
- **HTTP к биржам — через `@tauri-apps/plugin-http` fetch** (идёт через Rust, обходит CORS). Каждый хост биржи ДОЛЖЕН быть в `src-tauri/capabilities/default.json` (`http:default.allow`). Добавляешь площадку → добавь её хост туда, иначе запрос блокируется.
- **Движок (`lib/engine.ts`): цикл опроса берёт монету по id КАЖДУЮ итерацию** (не захватывает ссылку) — смена площадки/интервала/порога подхватывается на лету.
- **`history` мутируется in-place** → графики и UI завязаны на `engine.version` через `useSyncExternalStore` (`useEngineVersion`), НЕ на идентичность массива. Если завязать на массив — обновлений не будет.
- **Квирки символов площадок** (`lib/venues.ts` `symbolFor`): Binance/Bybit/Bitget/Aster = `{BASE}USDT`; MEXC/Gate = `{BASE}_USDT`; OKX = `{BASE}-USDT-SWAP`; KuCoin = `{BASE или XBT для BTC}USDTM`; Hyperliquid = `{BASE}` или `k{BASE}` (1000×, напр. kPEPE); DEX = контракт+сеть, НЕ тикер.
- **Графики (lightweight-charts v5):** `addSeries(LineSeries, opts)` (не старый `addLineSeries`). Для мелких цен обязателен кастомный `priceFormat` (`PRICE_FORMAT`), иначе ось показывает «0.00». `layout.attributionLogo:false` убирает лого TradingView.
- **Палитры (`lib/themes.ts`): 4 шт** (slate/carbon/aurora/graphite), переключатель в шапке. `applyPalette()` ставит CSS-переменные на `documentElement` — Tailwind v4 читает токены как var(), поэтому смена «на лету». Фон окна = `--app-bg` на `#root` (НЕПРОЗРАЧНЫЙ — цвет диктует палитра, а не системный vibrancy-материал). `.glass`-панели делают backdrop-filter поверх этого фона = слоистое стекло в цветах палитры. Токены `--color-gold/gold2` = акцент (имя историческое, значение зависит от палитры).
- **Графики читают цвета через `cssVar()`** из CSS-переменных (canvas НЕ понимает `var()` — нельзя передавать `"var(--color-gold)"` напрямую в lightweight-charts, будет чёрная линия). При смене палитры графики ПЕРЕМОНТИРУЮТСЯ (React `key={paletteKey}`), чтобы перечитать токены.
- **Конфиг — в localStorage вебвью** (`spread-monitor-config-v1`), не в файле. Сид-монеты в `lib/store.ts`.
- **dev-only:** `window.__engine` экспонируется в `main.tsx` под `import.meta.env.DEV` (для headless-скриншотов Playwright); в prod вырезается.

## Don't
- Не запускать ботов/ордера — это read-only монитор, без ключей.
- Не коммитить `dist/`, `src-tauri/target/`, `node_modules/`.
- Скриншот живого нативного окна агентом недоступен (нет прав Screen Recording) → проверять UI headless-Chromium по `npm run dev` (Vite слушает IPv6 `[::1]:1420` → ходить на `localhost`, Chromium запускать с `--no-proxy-server`).
