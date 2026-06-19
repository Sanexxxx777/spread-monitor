import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  LineStyle,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Point } from "@/lib/types";

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function smallFmt(v: number): string {
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1000) return v.toFixed(2);
  if (a >= 1) return v.toFixed(4);
  if (a >= 0.01) return v.toFixed(6);
  return v.toPrecision(4);
}

const PRICE_FORMAT = { type: "custom" as const, minMove: 1e-8, formatter: smallFmt };

function baseOptions() {
  const text = cssVar("--chart-text", "#8893A8");
  const grid = cssVar("--chart-grid", "rgba(255,255,255,0.06)");
  return {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: "rgba(0,0,0,0)" },
      textColor: text,
      fontFamily: "SF Mono, JetBrains Mono, ui-monospace, monospace",
      fontSize: 11,
      attributionLogo: false,
    },
    grid: { vertLines: { color: grid }, horzLines: { color: grid } },
    rightPriceScale: { borderColor: grid },
    timeScale: { borderColor: grid, timeVisible: true, secondsVisible: true },
    crosshair: { vertLine: { color: text, width: 1 as const }, horzLine: { color: text } },
  };
}

export function PriceChart({
  history,
  version,
  colorA,
  colorB,
}: {
  history: Point[];
  version: number;
  colorA: string;
  colorB: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sa = useRef<ISeriesApi<"Line"> | null>(null);
  const sb = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const c: IChartApi = createChart(ref.current, baseOptions());
    sa.current = c.addSeries(LineSeries, {
      color: colorA,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: PRICE_FORMAT,
    });
    sb.current = c.addSeries(LineSeries, {
      color: colorB,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: PRICE_FORMAT,
    });
    return () => c.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sa.current?.applyOptions({ color: colorA });
    sb.current?.applyOptions({ color: colorB });
  }, [colorA, colorB]);

  useEffect(() => {
    sa.current?.setData(history.map((p) => ({ time: p.t as UTCTimestamp, value: p.a })));
    sb.current?.setData(history.map((p) => ({ time: p.t as UTCTimestamp, value: p.b })));
  }, [version, history]);

  return <div ref={ref} className="h-full w-full" />;
}

export function SpreadChart({
  history,
  version,
  threshold,
}: {
  history: Point[];
  version: number;
  threshold: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const s = useRef<ISeriesApi<"Line"> | null>(null);
  const thr = useRef<IPriceLine | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const c: IChartApi = createChart(ref.current, baseOptions());
    const line = c.addSeries(LineSeries, {
      color: cssVar("--color-gold", "#5B8CFF"),
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    s.current = line;
    line.createPriceLine({
      price: 0,
      color: cssVar("--chart-text", "#8893A8"),
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "",
    });
    return () => c.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!s.current) return;
    if (thr.current) s.current.removePriceLine(thr.current);
    thr.current = s.current.createPriceLine({
      price: threshold,
      color: cssVar("--color-down", "#FB6F70"),
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "порог",
    });
  }, [threshold]);

  useEffect(() => {
    s.current?.setData(history.map((p) => ({ time: p.t as UTCTimestamp, value: p.spread })));
  }, [version, history]);

  return <div ref={ref} className="h-full w-full" />;
}
