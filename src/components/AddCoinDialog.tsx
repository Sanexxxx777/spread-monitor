import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { Select } from "./ui/Select";
import { clampMarket, VENUE_LIST, VENUES } from "@/lib/venues";
import { uid } from "@/lib/store";
import type { Coin, Market, VenueId } from "@/lib/types";
import { cn } from "@/lib/utils";

const venueOptions = VENUE_LIST.map((v) => ({ value: v.id, label: v.name, color: v.color }));
const chainOptions = [
  "ethereum",
  "bsc",
  "solana",
  "base",
  "arbitrum",
  "polygon",
  "avalanche",
  "optimism",
  "sui",
  "tron",
].map((c) => ({ value: c, label: c }));

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "no-drag w-full rounded-xl glass px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:border-gold/60";

function Seg({
  id,
  value,
  onChange,
}: {
  id: VenueId;
  value: Market;
  onChange: (m: Market) => void;
}) {
  const markets = VENUES[id].markets;
  if (markets.length < 2) {
    return (
      <span className="text-[10px] uppercase tracking-wide text-muted">
        {markets[0] === "perp" ? "фьючерс" : "спот"}
      </span>
    );
  }
  return (
    <div className="no-drag inline-flex rounded-lg glass p-0.5 text-[11px] font-semibold">
      {markets.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "px-3 py-1 rounded-md transition-colors",
            value === m ? "bg-gold text-[#1a140e]" : "text-muted hover:text-ink",
          )}
        >
          {m === "perp" ? "Фьюч" : "Спот"}
        </button>
      ))}
    </div>
  );
}

export function AddCoinDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: Coin | null;
  onClose: () => void;
  onSave: (c: Coin) => void;
}) {
  const [base, setBase] = useState(initial?.base ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [venueA, setVenueA] = useState<VenueId>(initial?.venueA ?? "binance");
  const [venueB, setVenueB] = useState<VenueId>(initial?.venueB ?? "gate");
  const [marketA, setMarketA] = useState<Market>(initial?.marketA ?? "perp");
  const [marketB, setMarketB] = useState<Market>(initial?.marketB ?? "perp");
  const [contract, setContract] = useState(initial?.contract ?? "");
  const [chain, setChain] = useState(initial?.chain ?? "ethereum");
  const [threshold, setThreshold] = useState(String(initial?.threshold ?? 1));
  const [interval, setIntervalS] = useState(String(initial?.interval ?? 5));
  const [basis, setBasis] = useState<"last" | "exec">(initial?.basis ?? "last");
  const [sound, setSound] = useState(initial?.sound ?? true);

  const dex = VENUES[venueA].kind === "dex" || VENUES[venueB].kind === "dex";
  const valid = base.trim() !== "" && (!dex || contract.trim() !== "");

  function submit() {
    if (!valid) return;
    const b = base.trim().toUpperCase();
    onSave({
      id: initial?.id ?? uid(),
      base: b,
      label: label.trim() || b,
      contract: dex ? contract.trim() : undefined,
      chain: dex ? chain : undefined,
      venueA,
      venueB,
      marketA: clampMarket(venueA, marketA),
      marketB: clampMarket(venueB, marketB),
      threshold: parseFloat(threshold) || 0,
      interval: Math.max(1, parseFloat(interval) || 5),
      basis,
      sound,
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-anim fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="dialog-anim fixed left-1/2 top-1/2 z-50 w-[480px] max-w-[92vw] glass-strong rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="font-display text-xl font-bold text-ink">
              {initial ? "Редактировать пару" : "Новая пара площадок"}
            </Dialog.Title>
            <Dialog.Close className="no-drag rounded-lg p-1.5 text-muted hover:bg-white/10">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Базовый тикер">
                <input
                  className={inputCls}
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  placeholder="BTC, PEPE…"
                />
              </Field>
              {dex ? (
                <Field label="Контракт токена (DEX)">
                  <input
                    className={inputCls}
                    value={contract}
                    onChange={(e) => setContract(e.target.value)}
                    placeholder="0x… / адрес"
                  />
                </Field>
              ) : (
                <Field label="Имя (опц.)">
                  <input
                    className={inputCls}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="как в списке"
                  />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
              <div className="flex flex-col gap-1.5">
                <Field label="Площадка A">
                  <Select
                    value={venueA}
                    onChange={(v) => {
                      setVenueA(v as VenueId);
                      setMarketA((m) => clampMarket(v as VenueId, m));
                    }}
                    options={venueOptions}
                  />
                </Field>
                <Seg id={venueA} value={marketA} onChange={setMarketA} />
              </div>
              <button
                onClick={() => {
                  const va = venueA,
                    ma = marketA;
                  setVenueA(venueB);
                  setMarketA(marketB);
                  setVenueB(va);
                  setMarketB(ma);
                }}
                className="no-drag mt-7 rounded-xl glass p-2.5 text-muted hover:text-gold hover:border-gold/40"
                title="Поменять местами"
              >
                <ArrowLeftRight size={16} />
              </button>
              <div className="flex flex-col gap-1.5">
                <Field label="Площадка B">
                  <Select
                    value={venueB}
                    onChange={(v) => {
                      setVenueB(v as VenueId);
                      setMarketB((m) => clampMarket(v as VenueId, m));
                    }}
                    options={venueOptions}
                  />
                </Field>
                <Seg id={venueB} value={marketB} onChange={setMarketB} />
              </div>
            </div>

            {dex && (
              <div className="grid grid-cols-[200px_1fr] gap-3">
                <Field label="Сеть DEX">
                  <Select value={chain} onChange={setChain} options={chainOptions} />
                </Field>
                <Field label="Имя (опц.)">
                  <input
                    className={inputCls}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="как в списке"
                  />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Field label="Порог %">
                <input
                  className={inputCls}
                  type="number"
                  step="0.1"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </Field>
              <Field label="Опрос, сек">
                <input
                  className={inputCls}
                  type="number"
                  step="1"
                  min="1"
                  value={interval}
                  onChange={(e) => setIntervalS(e.target.value)}
                />
              </Field>
              <Field label="База спреда">
                <Select
                  value={basis}
                  onChange={(v) => setBasis(v as "last" | "exec")}
                  options={[
                    { value: "last", label: "last" },
                    { value: "exec", label: "стакан" },
                  ]}
                />
              </Field>
            </div>

            <label className="no-drag flex items-center gap-2.5 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => setSound(e.target.checked)}
                className="accent-gold size-4"
              />
              Звуковой сигнал при пробое порога
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <Dialog.Close className="no-drag rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-white/8">
              Отмена
            </Dialog.Close>
            <button
              onClick={submit}
              disabled={!valid}
              className="no-drag rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-[#1a140e] hover:bg-gold2 disabled:opacity-40 transition-colors"
            >
              {initial ? "Сохранить" : "Добавить"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
