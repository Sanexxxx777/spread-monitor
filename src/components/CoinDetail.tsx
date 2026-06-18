import { ArrowLeftRight, Eraser, Pencil, Play, Square, Trash2 } from "lucide-react";
import { engine, useEngineVersion } from "@/lib/engine";
import { fmtMoney, fmtPct, fmtPrice } from "@/lib/format";
import { VENUE_LIST, VENUES } from "@/lib/venues";
import type { Coin, Quote, VenueId } from "@/lib/types";
import { Select } from "./ui/Select";
import { Kpi } from "./Kpi";
import { PriceChart, SpreadChart } from "./Charts";

const venueOptions = VENUE_LIST.map((v) => ({ value: v.id, label: v.name, color: v.color }));

function quoteSub(q: Quote | undefined, isDex: boolean): string {
  if (!q) return "нет данных";
  const parts: string[] = [];
  if (isDex) {
    if (q.source) parts.push(q.source);
    if (q.liquidity) parts.push(`ликв ${fmtMoney(q.liquidity)}`);
  } else {
    if (q.funding !== undefined) parts.push(`fund ${(q.funding * 100).toFixed(3)}%`);
    if (q.change24 !== undefined) parts.push(`24h ${fmtPct(q.change24 * 100)}`);
  }
  return parts.join("  ·  ") || "—";
}

function CtlBtn({ onClick, disabled, children, active }: {
  onClick: () => void; disabled?: boolean; children: React.ReactNode; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "no-drag inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
        active ? "bg-gold text-[#1a140e] hover:bg-gold2" : "glass text-ink hover:border-gold/40",
        "disabled:opacity-40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function CoinDetail({
  coin, paletteKey, onChange, onEdit, onRemove,
}: {
  coin: Coin;
  paletteKey: string;
  onChange: (patch: Partial<Coin>) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const version = useEngineVersion();
  const st = engine.state(coin.id);
  const va = VENUES[coin.venueA];
  const vb = VENUES[coin.venueB];
  const spread = st?.spread;
  const spreadColor = spread === undefined ? "var(--color-ink)" : spread >= 0 ? "var(--color-up)" : "var(--color-down)";
  const hit = spread !== undefined && (coin.threshold >= 0 ? spread >= coin.threshold : spread <= coin.threshold);

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-5 overflow-hidden">
      {/* Шапка: монета + выбор площадок A ⇄ B */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{coin.label}</h1>
        <div className="flex items-center gap-2.5">
          <Select value={coin.venueA} onChange={(v) => onChange({ venueA: v as VenueId })}
            options={venueOptions} className="min-w-[170px]" ariaLabel="Площадка A" />
          <button
            onClick={() => onChange({ venueA: coin.venueB, venueB: coin.venueA })}
            className="no-drag rounded-xl glass p-2.5 text-muted hover:text-gold hover:border-gold/40"
            title="Поменять местами"
          >
            <ArrowLeftRight size={16} />
          </button>
          <Select value={coin.venueB} onChange={(v) => onChange({ venueB: v as VenueId })}
            options={venueOptions} className="min-w-[170px]" ariaLabel="Площадка B" />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        <Kpi label={va.name} value={fmtPrice(st?.priceA)} sub={quoteSub(st?.qa, va.kind === "dex")} accent="var(--color-ink)" />
        <Kpi label={vb.name} value={fmtPrice(st?.priceB)} sub={quoteSub(st?.qb, vb.kind === "dex")} accent="var(--color-ink)" />
        <Kpi label="Спред B / A" value={fmtPct(spread)} sub={`база: ${coin.basis === "exec" ? "стакан" : "last"}`} accent={spreadColor} highlight={hit} />
        <Kpi label="Порог"
          value={`${coin.threshold > 0 ? "+" : ""}${coin.threshold}%`}
          sub={st?.error ? st.error : st?.running ? "мониторинг идёт" : "остановлено"}
          accent="var(--color-muted)" />
      </div>

      {/* Графики */}
      <div className="glass rounded-2xl p-4 flex flex-col gap-3 flex-1 min-h-0">
        <div className="flex items-center gap-4 text-[11px] text-muted px-1">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: va.color }} />{va.name}</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: vb.color }} />{vb.name}</span>
          <span className="ml-auto">{st?.lastUpdate ? new Date(st.lastUpdate).toLocaleTimeString() : "—"}  ·  {st?.history.length ?? 0} точек</span>
        </div>
        <div className="flex-[3] min-h-[180px]">
          <PriceChart key={`p-${paletteKey}`} history={st?.history ?? []} version={version} colorA={va.color} colorB={vb.color} />
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex-[2] min-h-[120px]">
          <SpreadChart key={`s-${paletteKey}`} history={st?.history ?? []} version={version} threshold={coin.threshold} />
        </div>
      </div>

      {/* Управление */}
      <div className="glass rounded-2xl px-5 py-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted">Порог %</span>
          <input
            type="number" step="0.1" value={coin.threshold}
            onChange={(e) => onChange({ threshold: parseFloat(e.target.value) || 0 })}
            className="no-drag w-20 rounded-lg glass px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-gold/60"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted">Опрос</span>
          <input
            type="number" step="1" min="1" value={coin.interval}
            onChange={(e) => onChange({ interval: Math.max(1, parseFloat(e.target.value) || 5) })}
            className="no-drag w-16 rounded-lg glass px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-gold/60"
          />
        </div>
        <Select value={coin.basis} onChange={(v) => onChange({ basis: v as "last" | "exec" })}
          options={[{ value: "last", label: "last" }, { value: "exec", label: "стакан" }]} />
        <label className="no-drag flex items-center gap-2 text-sm text-ink cursor-pointer">
          <input type="checkbox" checked={coin.sound} onChange={(e) => onChange({ sound: e.target.checked })} className="accent-gold size-4" />
          Звук
        </label>

        <div className="ml-auto flex items-center gap-2">
          {st?.running
            ? <CtlBtn onClick={() => engine.stop(coin.id)}><Square size={15} /> Стоп</CtlBtn>
            : <CtlBtn onClick={() => engine.start(coin.id)} active><Play size={15} /> Старт</CtlBtn>}
          <CtlBtn onClick={() => engine.clear(coin.id)}><Eraser size={15} /> Очистить</CtlBtn>
          <CtlBtn onClick={onEdit}><Pencil size={15} /> Изменить</CtlBtn>
          <CtlBtn onClick={onRemove}><Trash2 size={15} /></CtlBtn>
        </div>
      </div>
    </div>
  );
}
