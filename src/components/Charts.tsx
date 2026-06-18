import { useEffect, useRef } from "react";
import {
  createChart, LineSeries, LineStyle, ColorType,
  type IChartApi, type ISeriesApi, type IPriceLine, type UTCTimestamp,
} from "lightweight-charts";
import type { Point } from "@/lib/types";

const TEXT = "#BDA189";
const LINE = "rgba(255,255,255,0.06)";

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
  return {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: "rgba(0,0,0,0)" },
      textColor: TEXT,
      fontFamily: "SF Mono, JetBrains Mono, ui-monospace, monospace",
      fontSize: 11,
      attributionLogo: false,
    },
    grid: { vertLines: { color: LINE }, horzLines: { color: LINE } },
    rightPriceScale: { borderColor: LINE },
    timeScale: { borderColor: LINE, timeVisible: true, secondsVisible: true },
    crosshair: { vertLine: { color: TEXT, width: 1 as const }, horzLine: { color: TEXT } },
  };
}

export function PriceChart({
  history, version, colorA, colorB,
}: {
  history: Point[];
  version: number;
  colorA: string;
  colorB: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const sa = useRef<ISeriesApi<"Line"> | null>(null);
  const sb = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const c = createChart(ref.current, baseOptions());
    chart.current = c;
    sa.current = c.addSeries(LineSeries, { color: colorA, lineWidth: 2, priceLineVisible: false, lastValueVisible: true, priceFormat: PRICE_FORMAT });
    sb.current = c.addSeries(LineSeries, { color: colorB, lineWidth: 2, priceLineVisible: false, lastValueVisible: true, priceFormat: PRICE_FORMAT });
    return () => { c.remove(); chart.current = null; };
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
  history, version, threshold, color,
}: {
  history: Point[];
  version: number;
  threshold: number;
  color: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const s = useRef<ISeriesApi<"Line"> | null>(null);
  const zero = useRef<IPriceLine | null>(null);
  const thr = useRef<IPriceLine | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const c = createChart(ref.current, baseOptions());
    chart.current = c;
    const line = c.addSeries(LineSeries, { color, lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
    s.current = line;
    zero.current = line.createPriceLine({ price: 0, color: "rgba(189,161,137,0.5)", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" });
    return () => { c.remove(); chart.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { s.current?.applyOptions({ color }); }, [color]);

  useEffect(() => {
    if (!s.current) return;
    if (thr.current) s.current.removePriceLine(thr.current);
    thr.current = s.current.createPriceLine({
      price: threshold, color: "#D86A4A", lineWidth: 1,
      lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "порог",
    });
  }, [threshold]);

  useEffect(() => {
    s.current?.setData(history.map((p) => ({ time: p.t as UTCTimestamp, value: p.spread })));
  }, [version, history]);

  return <div ref={ref} className="h-full w-full" />;
}
