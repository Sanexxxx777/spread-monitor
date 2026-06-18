import { useEffect, useRef, useState } from "react";

/** Плавно «доезжает» до нового значения (ease-out cubic). undefined → undefined. */
export function useAnimatedNumber(value: number | undefined, duration = 420): number | undefined {
  const [display, setDisplay] = useState<number | undefined>(value);
  const prev = useRef<number | undefined>(value);

  useEffect(() => {
    if (value === undefined || !Number.isFinite(value)) {
      setDisplay(undefined);
      prev.current = undefined;
      return;
    }
    const from = prev.current ?? value;
    if (from === value) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}
