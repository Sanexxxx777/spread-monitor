import * as RS from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
  color?: string;
}

export function Select({
  value, onChange, options, className, ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  className?: string;
  ariaLabel?: string;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <RS.Root value={value} onValueChange={onChange}>
      <RS.Trigger
        aria-label={ariaLabel}
        className={cn(
          "no-drag inline-flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5",
          "text-sm font-medium text-ink/95 glass transition-colors",
          "hover:border-gold/40 focus:outline-none focus:border-gold/60 data-[state=open]:border-gold/60",
          className,
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {current?.color && (
            <span className="size-2.5 rounded-full shrink-0" style={{ background: current.color }} />
          )}
          <RS.Value />
        </span>
        <RS.Icon className="text-muted">
          <ChevronDown size={15} />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={8}
          className="pop-anim z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl glass-strong p-1.5 shadow-2xl"
        >
          <RS.Viewport className="max-h-72">
            {options.map((o) => (
              <RS.Item
                key={o.value}
                value={o.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm",
                  "text-ink/90 outline-none data-[highlighted]:bg-white/8 data-[state=checked]:text-gold",
                )}
              >
                {o.color && (
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: o.color }} />
                )}
                <RS.ItemText>{o.label}</RS.ItemText>
                <RS.ItemIndicator className="ml-auto">
                  <Check size={14} className="text-gold" />
                </RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}
