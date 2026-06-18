// Палитры приложения. Токены --color-gold/--color-gold2 = акцент/акцент2
// (имя историческое, значение зависит от палитры). Применяются на лету через
// applyPalette() — Tailwind v4 читает токены как CSS-переменные.

export interface Palette {
  label: string;
  vars: Record<string, string>;
}

export const PALETTES: Record<string, Palette> = {
  slate: {
    label: "Slate",
    vars: {
      "--app-bg": "radial-gradient(1200px 820px at 14% -5%, #1A2542, #0A0E1A 58%)",
      "--color-base": "#0A0E1A",
      "--color-ink": "#E9EEF8",
      "--color-muted": "#8893A8",
      "--color-gold": "#5B8CFF",
      "--color-gold2": "#7C6CFF",
      "--color-up": "#34D399",
      "--color-down": "#FB6F70",
      "--glass-bg": "rgba(24, 33, 56, 0.55)",
      "--glass-bg-strong": "rgba(16, 22, 40, 0.86)",
      "--glass-border": "rgba(255, 255, 255, 0.10)",
      "--glass-border-hi": "rgba(91, 140, 255, 0.45)",
      "--glass-shadow": "0 14px 38px rgba(0, 0, 0, 0.45)",
      "--chart-text": "#8893A8",
      "--chart-grid": "rgba(255, 255, 255, 0.06)",
    },
  },
  carbon: {
    label: "Carbon Lime",
    vars: {
      "--app-bg": "radial-gradient(1100px 720px at 20% -5%, #16191F, #08090B 62%)",
      "--color-base": "#08090B",
      "--color-ink": "#F2F4F6",
      "--color-muted": "#888F99",
      "--color-gold": "#B6F23C",
      "--color-gold2": "#38E8B0",
      "--color-up": "#38E8B0",
      "--color-down": "#FF5C7A",
      "--glass-bg": "rgba(21, 23, 28, 0.60)",
      "--glass-bg-strong": "rgba(13, 14, 17, 0.88)",
      "--glass-border": "rgba(255, 255, 255, 0.08)",
      "--glass-border-hi": "rgba(182, 242, 60, 0.45)",
      "--glass-shadow": "0 14px 38px rgba(0, 0, 0, 0.55)",
      "--chart-text": "#888F99",
      "--chart-grid": "rgba(255, 255, 255, 0.05)",
    },
  },
  aurora: {
    label: "Aurora",
    vars: {
      "--app-bg": "radial-gradient(1100px 820px at 82% -8%, #281C57, #0C0A1A 58%)",
      "--color-base": "#0C0A1A",
      "--color-ink": "#ECEAFF",
      "--color-muted": "#9A93C7",
      "--color-gold": "#A78BFA",
      "--color-gold2": "#22D3EE",
      "--color-up": "#4ADE80",
      "--color-down": "#FB7185",
      "--glass-bg": "rgba(30, 24, 64, 0.52)",
      "--glass-bg-strong": "rgba(18, 14, 42, 0.84)",
      "--glass-border": "rgba(167, 139, 250, 0.22)",
      "--glass-border-hi": "rgba(167, 139, 250, 0.55)",
      "--glass-shadow": "0 14px 40px rgba(10, 4, 30, 0.55)",
      "--chart-text": "#9A93C7",
      "--chart-grid": "rgba(255, 255, 255, 0.06)",
    },
  },
  graphite: {
    label: "Graphite Gold",
    vars: {
      "--app-bg": "radial-gradient(1100px 720px at 15% -5%, #1F2127, #0D0E10 62%)",
      "--color-base": "#0D0E10",
      "--color-ink": "#F0EDE6",
      "--color-muted": "#9A968C",
      "--color-gold": "#E6B45C",
      "--color-gold2": "#C97D45",
      "--color-up": "#6FCF6F",
      "--color-down": "#E8705A",
      "--glass-bg": "rgba(27, 28, 33, 0.58)",
      "--glass-bg-strong": "rgba(17, 18, 21, 0.86)",
      "--glass-border": "rgba(255, 255, 255, 0.09)",
      "--glass-border-hi": "rgba(230, 180, 92, 0.45)",
      "--glass-shadow": "0 14px 38px rgba(0, 0, 0, 0.5)",
      "--chart-text": "#9A968C",
      "--chart-grid": "rgba(255, 255, 255, 0.06)",
    },
  },
};

export const PALETTE_ORDER = ["slate", "carbon", "aurora", "graphite"] as const;
export type PaletteName = (typeof PALETTE_ORDER)[number];

export function applyPalette(name: string): void {
  const p = PALETTES[name] ?? PALETTES.slate;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(p.vars)) root.style.setProperty(k, v);
}
