export function fmtPrice(v?: number): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (a >= 1) return v.toFixed(4);
  if (a >= 0.01) return v.toFixed(6);
  return v.toPrecision(4);
}

export function fmtPct(v?: number, digits = 2): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

/** Обратный отсчёт до момента (ms): «2ч 14м» / «14м» / «43с» / «сейчас». */
export function fmtCountdown(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return "";
  const ms = ts - Date.now();
  if (ms <= 0) return "сейчас";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (totalMin > 0) return `${m}м`;
  return `${Math.floor(ms / 1000)}с`;
}

export function fmtMoney(v?: number): string {
  if (!v || !Number.isFinite(v)) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
