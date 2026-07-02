import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { engine, useEngineVersion } from "@/lib/engine";
import { loadConfig, saveConfig, type Config } from "@/lib/store";
import { applyPalette, PALETTE_ORDER, PALETTES } from "@/lib/themes";
import type { Coin } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";
import { CoinDetail } from "@/components/CoinDetail";
import { AddCoinDialog } from "@/components/AddCoinDialog";
import { AuthorBadge } from "@/components/AuthorBadge";

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playBeep(ctx: AudioContext) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.type = "sine";
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
  o.start();
  o.stop(ctx.currentTime + 0.36);
}

function beep() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") {
      ctx
        .resume()
        .then(() => playBeep(ctx))
        .catch(() => {});
    } else {
      playBeep(ctx);
    }
  } catch {
    /* ignore */
  }
}

function StatusBar({ coins, toast }: { coins: Coin[]; toast: string }) {
  useEngineVersion();
  const running = coins.filter((c) => engine.state(c.id)?.running).length;
  return (
    <div className="h-9 shrink-0 px-6 flex items-center justify-between text-[11px] text-muted border-t border-white/5">
      <span className="mono truncate">{toast || `пар: ${coins.length} · активно: ${running}`}</span>
      <AuthorBadge />
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<Config>(loadConfig);
  const [selectedId, setSelectedId] = useState<string | null>(config.coins[0]?.id ?? null);
  const [dialog, setDialog] = useState<{ open: boolean; edit: Coin | null }>({
    open: false,
    edit: null,
  });
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const saveTimer = useRef<number | null>(null);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
    engine.setCoins(config.coins, config.settings.maxHistory);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveConfig(config), 300);
  }, [config]);

  useEffect(() => {
    applyPalette(config.settings.palette);
  }, [config.settings.palette]);

  function cyclePalette() {
    const i = PALETTE_ORDER.indexOf(config.settings.palette as (typeof PALETTE_ORDER)[number]);
    const next = PALETTE_ORDER[(i + 1) % PALETTE_ORDER.length];
    setConfig((c) => ({ ...c, settings: { ...c.settings, palette: next } }));
  }

  useEffect(() => {
    // страховка дебаунса: не потерять несохранённый конфиг при закрытии окна
    window.addEventListener("pagehide", () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
        saveConfig(configRef.current);
      }
    });
    window.addEventListener(
      "pointerdown",
      () => {
        void getAudioCtx()
          .resume()
          .catch(() => {});
      },
      { once: true },
    );
    engine.onAlert = (coin, msg) => {
      if (coin.sound) beep();
      setToast(msg);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(""), 6000);
    };
    if (config.settings.autoStart) engine.startAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = config.coins.find((c) => c.id === selectedId) ?? null;

  function patchCoin(id: string, patch: Partial<Coin>) {
    // смена площадки/рынка = другой инструмент → чистим историю графика
    if (patch.venueA || patch.venueB || patch.marketA || patch.marketB) {
      engine.clear(id);
    }
    setConfig((c) => ({ ...c, coins: c.coins.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }
  function saveCoin(coin: Coin) {
    setConfig((c) => {
      const old = c.coins.find((x) => x.id === coin.id);
      if (
        old &&
        (old.venueA !== coin.venueA ||
          old.venueB !== coin.venueB ||
          old.marketA !== coin.marketA ||
          old.marketB !== coin.marketB ||
          old.contract !== coin.contract)
      ) {
        engine.clear(coin.id);
      }
      const exists = !!old;
      return {
        ...c,
        coins: exists ? c.coins.map((x) => (x.id === coin.id ? coin : x)) : [...c.coins, coin],
      };
    });
    setSelectedId(coin.id);
    setDialog({ open: false, edit: null });
    window.setTimeout(() => engine.start(coin.id), 60);
  }
  function removeCoin(id: string) {
    setConfig((c) => ({ ...c, coins: c.coins.filter((x) => x.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="h-screen w-screen flex flex-col text-ink">
      <div
        onMouseDown={(e) => {
          if (e.button === 0)
            void getCurrentWindow()
              .startDragging()
              .catch(() => {});
        }}
        className="h-9 shrink-0 flex items-center gap-2 px-4 cursor-default"
      >
        <div className="w-[76px] shrink-0 self-stretch" />
        <span className="flex-1 text-center text-[11px] font-semibold tracking-[0.22em] text-muted uppercase truncate">
          Spread Monitor
        </span>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={cyclePalette}
          className="magic-btn shrink-0 rounded-lg px-4 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
          title={`Тема: ${PALETTES[config.settings.palette]?.label ?? ""} — клик, чтобы сменить`}
        >
          Theme
        </button>
      </div>

      <div className="flex-1 min-h-0 flex gap-5 px-6 pb-3">
        <Sidebar
          coins={config.coins}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRemove={removeCoin}
          onAdd={() => setDialog({ open: true, edit: null })}
        />
        {selected ? (
          <CoinDetail
            key={selected.id}
            coin={selected}
            paletteKey={config.settings.palette}
            onChange={(patch) => patchCoin(selected.id, patch)}
            onEdit={() => setDialog({ open: true, edit: selected })}
            onRemove={() => removeCoin(selected.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted">
            Выберите пару слева или добавьте новую
          </div>
        )}
      </div>

      <StatusBar coins={config.coins} toast={toast} />

      <AddCoinDialog
        key={dialog.open ? (dialog.edit?.id ?? "new") : "closed"}
        open={dialog.open}
        initial={dialog.edit}
        onClose={() => setDialog({ open: false, edit: null })}
        onSave={saveCoin}
      />
    </div>
  );
}
