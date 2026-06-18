import { useEffect, useRef, useState } from "react";
import { engine, useEngineVersion } from "@/lib/engine";
import { loadConfig, saveConfig, type Config } from "@/lib/store";
import type { Coin } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";
import { CoinDetail } from "@/components/CoinDetail";
import { AddCoinDialog } from "@/components/AddCoinDialog";

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
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
  } catch {
    /* ignore */
  }
}

function StatusBar({ coins, toast }: { coins: Coin[]; toast: string }) {
  useEngineVersion();
  const running = coins.filter((c) => engine.state(c.id)?.running).length;
  return (
    <div className="h-8 shrink-0 px-6 flex items-center justify-between text-[11px] text-muted border-t border-white/5">
      <span className="mono truncate">{toast || `пар: ${coins.length} · активно: ${running}`}</span>
      <span className="mono opacity-70">Spread Monitor 2.0</span>
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState<Config>(loadConfig);
  const [selectedId, setSelectedId] = useState<string | null>(config.coins[0]?.id ?? null);
  const [dialog, setDialog] = useState<{ open: boolean; edit: Coin | null }>({ open: false, edit: null });
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  useEngineVersion();

  useEffect(() => {
    engine.setCoins(config.coins, config.settings.maxHistory);
    saveConfig(config);
  }, [config]);

  useEffect(() => {
    engine.onAlert = (_coin, msg) => {
      beep();
      setToast(msg);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(""), 6000);
    };
    if (config.settings.autoStart) engine.startAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = config.coins.find((c) => c.id === selectedId) ?? null;

  function patchCoin(id: string, patch: Partial<Coin>) {
    setConfig((c) => ({ ...c, coins: c.coins.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }
  function saveCoin(coin: Coin) {
    setConfig((c) => {
      const exists = c.coins.some((x) => x.id === coin.id);
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
      <div data-tauri-drag-region className="h-9 shrink-0 drag flex items-center justify-center">
        <span className="text-[11px] font-semibold tracking-[0.22em] text-muted uppercase pointer-events-none">
          Spread Monitor
        </span>
      </div>

      <div className="flex-1 min-h-0 flex gap-5 px-6 pb-3">
        <Sidebar
          coins={config.coins}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={() => setDialog({ open: true, edit: null })}
        />
        {selected ? (
          <CoinDetail
            coin={selected}
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
        open={dialog.open}
        initial={dialog.edit}
        onClose={() => setDialog({ open: false, edit: null })}
        onSave={saveCoin}
      />
    </div>
  );
}
