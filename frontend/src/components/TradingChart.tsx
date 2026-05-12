"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/types/stock";

type Props = {
  candles: Candle[];
};

export function TradingChart({ candles }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const cleanCandles = useMemo(() => uniqueSortedCandles(candles), [candles]);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 430,
      layout: {
        background: { type: ColorType.Solid, color: "#fbfcfe" },
        textColor: "#334155",
        fontFamily: "Arial, Helvetica, sans-serif",
      },
      grid: {
        vertLines: { color: "#e8edf5" },
        horzLines: { color: "#e8edf5" },
      },
      rightPriceScale: {
        borderColor: "#d7dde7",
        scaleMargins: { top: 0.08, bottom: 0.18 },
      },
      timeScale: {
        borderColor: "#d7dde7",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
        minBarSpacing: 3,
      },
      crosshair: { mode: 1 },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0f9f6e",
      downColor: "#d64545",
      borderUpColor: "#0f9f6e",
      borderDownColor: "#d64545",
      wickUpColor: "#0f9f6e",
      wickDownColor: "#d64545",
      priceLineColor: "#111827",
      priceLineWidth: 1,
    });

    const ma20Series = chart.addSeries(LineSeries, {
      color: "#2459d6",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ma50Series = chart.addSeries(LineSeries, {
      color: "#7c3aed",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(100, 116, 139, 0.32)",
      priceFormat: { type: "volume" },
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    ma20SeriesRef.current = ma20Series;
    ma50SeriesRef.current = ma50Series;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      ma20SeriesRef.current = null;
      ma50SeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !ma20SeriesRef.current || !ma50SeriesRef.current || !volumeSeriesRef.current) return;
    if (!cleanCandles.length) return;

    const candleData = cleanCandles
      .map((item) => ({
        time: toChartTime(item.time),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))
      .filter((item) => Number.isFinite(item.open) && Number.isFinite(item.high) && Number.isFinite(item.low) && Number.isFinite(item.close));
    if (!candleData.length) return;

    const ma20Data = cleanCandles
      .filter((item) => typeof item.ma20 === "number")
      .map((item) => ({ time: toChartTime(item.time), value: item.ma20 as number }));

    const ma50Data = cleanCandles
      .filter((item) => typeof item.ma50 === "number")
      .map((item) => ({ time: toChartTime(item.time), value: item.ma50 as number }));

    const volumeData = cleanCandles.map((item) => ({
      time: toChartTime(item.time),
      value: item.volume,
      color: item.close >= item.open ? "rgba(15, 159, 110, 0.32)" : "rgba(214, 69, 69, 0.28)",
    }));

    candleSeriesRef.current.setData(candleData);
    ma20SeriesRef.current.setData(ma20Data);
    ma50SeriesRef.current.setData(ma50Data);
    volumeSeriesRef.current.setData(volumeData);

    requestAnimationFrame(() => {
      if (!chartRef.current) return;
      const lastIndex = candleData.length - 1;
      const visibleBars = Math.min(candleData.length, 180);
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, lastIndex - visibleBars),
        to: lastIndex + 8,
      });
    });
  }, [cleanCandles]);

  return (
    <div className="tv-chart-wrap">
      <div className="tv-chart" ref={containerRef} />
      {!cleanCandles.length ? <div className="chart-loading">Yahoo Finance 차트 데이터를 불러오는 중입니다</div> : null}
      <div className="legend">
        <span><i className="legend-candle" /> Candles</span>
        <span><i className="legend-volume" /> Volume</span>
        <span><i className="legend-ma20" /> MA20</span>
        <span><i className="legend-ma50" /> MA50</span>
      </div>
    </div>
  );
}

function uniqueSortedCandles(candles: Candle[]): Candle[] {
  const byTime = new Map<string, Candle>();
  for (const candle of candles) {
    byTime.set(candle.time, candle);
  }
  return Array.from(byTime.values()).sort((a, b) => toChartTime(a.time) - toChartTime(b.time));
}

function toChartTime(value: string): UTCTimestamp {
  const normalized = value.includes(" ") ? value.replace(" ", "T") : `${value}T00:00`;
  return Math.floor(new Date(`${normalized}:00Z`).getTime() / 1000) as UTCTimestamp;
}
