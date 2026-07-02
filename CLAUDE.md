# Spread Monitor (Tauri) — заметки для агента

Нативное macOS-приложение: спред между ЛЮБЫМИ двумя из 10 площадок (DEX + спот/перп
9 бирж), выбор пары A⇄B и рынка (спот/фьючерс) по каждой колонке. Tauri v2 + React 19 +
Vite 8 + Tailwind v4 + lightweight-charts. Преемник Qt-версии `~/Projects/dex-spread-monitor` (фолбэк).

**Публичный** репо: github.com/Sanexxxx777/spread-monitor (origin=ssh, branch `main`).
Приложение: `/Applications/Spread Monitor.app`. Лицензия: некоммерческая + обязательная
атрибуция (`LICENSE`, © @Aleksandr_NFA).

**Деплой (.app в /Applications):** `trash` старую → `ditto`/`cp -R` свежую из `target/.../macos/` в `/Applications/` → **удалить билд-артефакт из `target/`** (`trash` его) → `lsregister -f "/Applications/Spread Monitor.app"` + `killall Dock`.
⚠️ **Дубль в Launchpad — НЕ от Spotlight.** Корень: собранный `.app` остаётся в `target/` и регистрируется в **LaunchServices** (при запуске оттуда ИЛИ при `lsregister -r`, который рекурсивно сканит `~`), → Launchpad показывает ДВЕ иконки. `.metadata_never_index` влияет ТОЛЬКО на Spotlight (`mdfind`), Launchpad берёт из LaunchServices — НЕ помогает. Лечение: (1) не держать `.app` в `target/` после установки; (2) НЕ запускать `lsregister -r` пока артефакт лежит в `target/` — звать `lsregister -f <одна нужная>`. Проверка «сколько реально видит Launchpad» = `find /Applications ~/Applications -iname "*spread monitor*.app"` (а НЕ `lsregister -dump`, он показывает stale + корзину).

## Run / Build
- Dev: `npm run tauri dev`. Сборка: `npm run tauri build` → `src-tauri/target/release/bundle/macos/Spread Monitor.app` (~6 МБ).
- Только фронтенд (быстрая проверка типов): `npm run build` (= `tsc -b && vite build`). Формат: `npx prettier --write src` (`.prettierrc`).

## Гетчи (НЕ переоткрывать заново)
- **Vite 8 = rolldown, БЕЗ esbuild.** `minify: "esbuild"` падает («Cannot find package 'esbuild'»). Использовать `minify: "oxc"` (нативный для Vite 8).
- **TS 6: `baseUrl` запрещён** (deprecated → ошибка). Алиас `@/*` задан ТОЛЬКО через `paths` в `tsconfig.app.json`.
- **Liquid glass = НАТИВНЫЙ vibrancy Tauri**, НЕ CSS-самоделка: `tauri.conf.json` → `windowEffects.effects: ["sidebar"]` + `transparent: true` + `app.macOSPrivateApi: true` (требует cargo-feature `macos-private-api` у `tauri` — добавляется автоматически). Плюс в CSS: `body{background:transparent}` и панели `.glass` с `backdrop-filter`. НЕ делать панели/боди непрозрачными — пропадёт стекло.
- **HTTP к биржам — через `@tauri-apps/plugin-http` fetch** (идёт через Rust, обходит CORS). Каждый хост биржи ДОЛЖЕН быть в `src-tauri/capabilities/default.json` (`http:default.allow`). Добавляешь площадку → добавь её хост туда, иначе запрос блокируется.
- **Движок (`lib/engine.ts`): цикл опроса берёт монету по id КАЖДУЮ итерацию** (не захватывает ссылку) — смена площадки/интервала/порога подхватывается на лету.
- **`history` мутируется in-place** → графики и UI завязаны на `engine.version` через `useSyncExternalStore` (`useEngineVersion`), НЕ на идентичность массива. Если завязать на массив — обновлений не будет.
- **Квирки символов площадок** (`lib/venues.ts` `symbolFor`): Binance/Bybit/Bitget/Aster = `{BASE}USDT`; MEXC/Gate = `{BASE}_USDT`; OKX = `{BASE}-USDT-SWAP`; KuCoin = `{BASE или XBT для BTC}USDTM`; Hyperliquid = `{BASE}` или `k{BASE}` (1000×, напр. kPEPE); DEX = контракт+сеть, НЕ тикер.
- **Графики (lightweight-charts v5):** `addSeries(LineSeries, opts)` (не старый `addLineSeries`). Для мелких цен обязателен кастомный `priceFormat` (`PRICE_FORMAT`), иначе ось показывает «0.00». `layout.attributionLogo:false` убирает лого TradingView.
- **Перетаскивание окна: `getCurrentWindow().startDragging()` по `onMouseDown`** на шапке (App.tsx), НЕ `data-tauri-drag-region` — он при `transparent:true`+overlay-titlebar НЕ срабатывает. CSS `-webkit-app-region:drag/no-drag` в WKWebView вообще no-op. Нужно разрешение `core:window:allow-start-dragging`. Кнопка Theme гасит propagation.
- **Спот/фьючерс — на коине поля `marketA`/`marketB`** (тип `Market`). `VENUES[id].markets` — что поддерживается; `clampMarket` приводит рынок под возможности (DEX=spot, Aster=spot+perp, Hyperliquid=perp). Адаптер `quote(coin, symbol, market, hint?)`. Funding/время списания — только для перпов (`fundingTime` ms; у Binance/Aster/OKX/KuCoin/MEXC доп. запрос premiumIndex/funding-rate/contracts).
- **DEX без контракта = поиск по ТИКЕРУ + выбор пары ближайшей по цене к другой площадке** (`hint` из движка). Иначе «самый ликвидный» берёт ЧУЖОЙ одноимённый токен (ESPORTS: base $0.072 vs BSC $0.047 → фейк-спред). Контракт = точное совпадение по адресу (приоритет). Единственная DEX-площадка = `dexscreener`.
- **Сеть DEX определяется АВТОМАТИЧЕСКИ** (25.06): ручного выбора сети НЕТ — `dexscreener.quote` фильтрует пары по адресу контракта и берёт лучшую по ликвидности, её `chainId` = сеть. Поле «Сеть DEX» и тип `Coin.chain` УБРАНЫ. Краевой случай (один адрес на нескольких EVM-сетях) → выбирается сеть с макс. ликвидностью.
- **Объём + капитализация в сайдбаре** (`Quote.volume`/`marketCap`): тянутся со стороны, где `kind==="dex"` (Dexscreener: `volume.h24`, `marketCap`||`fdv`). Серой строкой `Vol … · MC … (Dex)` под токеном, обновляется через `useEngineVersion`. Только DEX (CEX не отдаёт эти поля).
- **DEX-форма (`AddCoinDialog`): для DEX поле «Имя» в 1-й строке заменяется на «Контракт токена»** (обязателен), «Имя (опц.)» уходит строкой ниже. `dex` = `VENUES[venueA/B].kind==="dex"` (НЕ хардкод имени). Работает и в ADD, и в EDIT. Поля выбора сети нет — сеть авто (см. выше).
- **`<AddCoinDialog>` ДОЛЖЕН иметь `key={dialog.open ? (dialog.edit?.id ?? "new") : "closed"}`** (App.tsx): компонент всегда смонтирован, `useState(initial?.…)` инициализируется ОДИН раз → без `key` «Изменить» показывало бы дефолты (binance/gate, «Имя») вместо значений монеты, а повторное «Добавить» тянуло stale-ввод. `key` форсит ремоунт на каждое открытие. (Был баг, исправлен 25.06.)
- **Движок ставит цены сторон НЕЗАВИСИМО**: даже если одна без данных, вторая видна; спред — только когда обе. (Раньше priceA/B ставились лишь при обеих → пустое «—» при молчащей стороне.)
- **Внешние ссылки — `@tauri-apps/plugin-opener` `openUrl()`** (значок автора в статус-баре). Разрешение `opener:default`+`opener:allow-open-url`.
- **`color-scheme: dark` на body** — иначе нативные стрелки number-инпутов/чекбоксы рендерятся в светлом режиме (тёмное на тёмном, не видно).
- **Палитры (`lib/themes.ts`): 5 шт** (setup/slate/carbon/aurora/graphite), по умолчанию **setup** (Setup Manager / gamma, gold #D4A574). Переключатель «Theme» в шапке (magic-btn анимация). `applyPalette()` ставит CSS-переменные на `documentElement` — Tailwind v4 читает токены как var(), смена «на лету». Фон окна = `--app-bg` на `#root` (НЕПРОЗРАЧНЫЙ — цвет диктует палитра). `.glass`-панели = backdrop-filter поверх. Токены `--color-gold/gold2` = акцент (имя историческое). Миграция палитры: проверять СЫРОЕ `stored.settings.v` (после merge `v` тянется из дефолта → баг «цвета не сменились»); бамп `SETTINGS_V` форсит дефолт. Playfair-заголовки через `@fontsource/playfair-display` (`.font-display`).
- **Графики читают цвета через `cssVar()`** из CSS-переменных (canvas НЕ понимает `var()` — нельзя передавать `"var(--color-gold)"` напрямую в lightweight-charts, будет чёрная линия). При смене палитры графики ПЕРЕМОНТИРУЮТСЯ (React `key={paletteKey}`), чтобы перечитать токены.
- **Конфиг — в localStorage вебвью** (`spread-monitor-config-v1`), не в файле. Сид-монеты в `lib/store.ts`.
- **dev-only:** `window.__engine` экспонируется в `main.tsx` под `import.meta.env.DEV` (для headless-скриншотов Playwright); в prod вырезается.
- **Звук (App.tsx): WKWebView замораживает AudioContext, созданный вне user gesture** (state=suspended, беззвучно, без ошибки — был баг «нет бипа», фикс 03.07). Решение: ОДИН модульный `audioCtx` + разблокировка первым `pointerdown` + `resume()` в `beep()`. НЕ создавать новый контекст на каждый бип — вернётся тишина.
- **Алерты (engine.ts):** `threshold===0` = выключено; гистерезис — `alerted` сбрасывается только при выходе за `threshold∓margin` (`margin=max(0.05,|thr|·0.1)`), иначе дребезг у порога = серия бипов. `onAlert` зовётся ВСЕГДА при hit (toast), звук гейтится по `coin.sound` в App — не возвращать `if(c.sound)` внутрь движка.
- **fetchOnce — epoch-guard**: `CoinState.epoch` инкрементится в `clear()`; результат in-flight запроса пишется только при совпадении epoch и идентичности `st`. Убрать — смена площадки во время запроса будет перетирать состояние старым ответом (богус-пойнт в истории).
- **HTTP (venues.ts):** `getJSON` с `AbortSignal.timeout(8000)` — без него зависшая биржа останавливает цикл монеты НАВСЕГДА. Funding/premiumIndex/мета — через `cachedJSON(url, 300_000)` (промис-кэш, reject не кэшируется); запросы ЦЕНЫ через кэш НЕ гонять.
- **Графики (Charts.tsx) — инкрементальные**: `series.update()` новых точек через `lastRef {len,t}`, полный `setData` только при сбросе/усечении истории. НЕ возвращать безусловный `setData(вся история)` — это O(3000) на каждый тик каждой монеты. Корневой `App` НЕ подписан на `useEngineVersion` (только листья Sidebar/CoinDetail/StatusBar) — не добавлять подписку в App, иначе ререндер всего дерева на каждый фетч любой монеты.
- **saveConfig дебаунсится 300мс** + флаш по `pagehide` (`configRef`) — иначе правка перед закрытием окна теряется.

## Don't
- Не запускать ботов/ордера — это read-only монитор, без ключей.
- Не коммитить `dist/`, `src-tauri/target/`, `node_modules/`.
- Скриншот живого нативного окна агентом недоступен (нет прав Screen Recording) → проверять UI headless-Chromium по `npm run dev` (Vite слушает IPv6 `[::1]:1420` → ходить на `localhost`, Chromium запускать с `--no-proxy-server`).

## TODO (по аудиту 03.07, ждут решения Саши)
- **Базис цены НЕ унифицирован**: Binance/Aster/MEXC-спот/Hyperliquid отдают MID `(bid+ask)/2`, Bybit/OKX/Bitget/KuCoin/Gate/MEXC-перп — last-trade → спред mid⇄last систематически искажён на долю бид-аск спреда (на BTC незаметно, на неликвидах — десятки бп). Фикс = общий helper «mid если есть bid/ask, иначе last» во всех ~10 адаптерах; ИЗМЕНИТ показываемые цифры.
- **Свёрнутое окно**: WKWebView троттлит setTimeout → опрос и алерты фактически встают. Настоящий фикс = опрос+порог+нативные уведомления в Rust (Tokio), заодно системный звук вместо Web Audio. Крупная переделка, отдельным заходом.
- **Конфиг в localStorage = evictable** (WebKit storage pressure может вычистить пары). Фикс = tauri-plugin-store (JSON в app config dir), localStorage как миграционный источник.
- Binance funding: берётся `lastFundingRate` (реализованная), остальные биржи — предстоящая; мелкая несогласованность цифры fund%.
- Glass/backdrop-filter на KPI-карточках + анимация чисел (rAF 420мс) = самый тяжёлый пейнт-паттерн WebKit; если понадобится ещё скорость — убрать blur с часто обновляемых карточек.
- Per-coin подписка вместо глобального `version` (фоновые монеты не будут ререндерить видимый график) — следующий шаг перфа после 03.07.

## TODO (low)
- Hyperliquid спот не добавлен (другая схема символов HYPE/USDC) — при желании прикрутить как у Aster.
- DEX через шапку без поля контракта → работает по тикеру+hint, но контракт точнее. Можно добавить инлайн-поле контракта или авто-открытие «Изменить» при выборе DEX.
- **Настоящий OKX DEX** (не реализован): `POST web3.okx.com/api/v6/dex/market/price` требует API-ключ + HMAC-подпись каждого запроса (OK-ACCESS-KEY/SIGN/PASSPHRASE/TIMESTAMP) — ломает принцип «монитор без ключей». Публичного эндпоинта нет. Если понадобится именно цена OKX: ввод ключа+секрета в настройках + подпись через Rust-команду Tauri + сети как числовой `chainIndex` (1=ETH). Пока вместо OKX добавлен публичный `geckoterminal`.
- Funding у Hyperliquid не тянем (только mid из allMids) — при желании через metaAndAssetCtxs.

## Долг (выявлен прогоном /harness 23.06)
- **`eslint .` НЕ зелёный — 29 ошибок:** 13× `@typescript-eslint/no-explicit-any` в `lib/venues.ts` (строки 9,42,43,47,52,55,60,63,70,188,339 — типизировать адаптеры площадок) + 1× `react-hooks/set-state-in-effect`. `npm run build` при этом проходит (lint не в build-пайплайне).
- **Тестов нет:** `playwright` в devDeps, но `test`-скрипта в package.json НЕТ (UI проверяется только headless через `npm run dev`).
- **Бандл `dist/assets/index-*.js` ~521 КБ** (>500 КБ vite-warning) — нет code-splitting (dynamic `import()` / rolldown `output.codeSplitting`).
