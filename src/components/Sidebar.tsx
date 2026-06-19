import { Plus, X } from "lucide-react";
import { engine, useEngineVersion } from "@/lib/engine";
import { fmtPct } from "@/lib/format";
import { VENUES } from "@/lib/venues";
import type { Coin } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Sidebar({
  coins, selectedId, onSelect, onRemove, onAdd,
}: {
  coins: Coin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  useEngineVersion();
  return (
    <div className="w-72 shrink-0 flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-between px-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
          Пары площадок
        </span>
        <button
          onClick={onAdd}
          className="no-drag inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-[12px] font-semibold text-[#1a140e] hover:bg-gold2 transition-colors"
        >
          <Plus size={14} /> Добавить
        </button>
      </div>

      <div className="glass rounded-2xl p-2 flex-1 overflow-y-auto flex flex-col gap-1 min-h-0">
        {coins.length === 0 && (
          <div className="text-muted text-sm text-center px-3 py-8">
            Пусто. Нажмите «Добавить».
          </div>
        )}
        {coins.map((c) => {
          const st = engine.state(c.id);
          const spread = st?.spread;
          const sel = selectedId === c.id;
          const color = spread === undefined ? undefined : spread >= 0 ? "var(--color-up)" : "var(--color-down)";
          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(c.id)}
              className={cn(
                "group no-drag relative flex items-center justify-between rounded-xl px-3 py-2.5 text-left cursor-pointer transition-colors",
                sel ? "bg-gold/15 ring-1 ring-gold/30" : "hover:bg-white/[0.04]",
              )}
            >
              <div className="min-w-0">
                <div className="font-semibold text-ink truncate flex items-center gap-2">
                  {c.label}
                  {st?.running && <span className="size-1.5 rounded-full bg-up" />}
                </div>
                <div className="text-[10px] text-muted truncate flex items-center gap-1.5 mt-0.5">
                  <span className="size-2 rounded-full" style={{ background: VENUES[c.venueA].color }} />
                  {VENUES[c.venueA].name.split(" ")[0]}
                  <span className="opacity-50">⇄</span>
                  <span className="size-2 rounded-full" style={{ background: VENUES[c.venueB].color }} />
                  {VENUES[c.venueB].name.split(" ")[0]}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 ml-2">
                <div className="mono text-sm font-semibold" style={{ color }}>{fmtPct(spread)}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(c.id); }}
                  className="no-drag -mr-1 opacity-0 group-hover:opacity-100 rounded-md p-1 text-muted hover:text-down hover:bg-white/10 transition-opacity"
                  title="Удалить пару"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
