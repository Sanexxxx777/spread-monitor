export function Kpi({
  label, value, sub, accent, highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="glass rounded-2xl px-5 py-4 flex flex-col gap-1.5 transition-colors"
      style={highlight ? { borderColor: "rgba(212,145,92,0.5)" } : undefined}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{label}</div>
      <div className="mono text-[26px] leading-none font-bold" style={{ color: accent }}>
        {value}
      </div>
      <div className="mono text-[11px] text-muted truncate min-h-[14px]">{sub}</div>
    </div>
  );
}
