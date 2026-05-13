"use client";

import { useMemo } from "react";

type FinancialChartPoint = {
  label: string;
  revenue: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  freeCashFlow: number | null;
};

type FinancialChartKey = keyof Omit<FinancialChartPoint, "label">;

type FinancialChartSeries = {
  key: FinancialChartKey;
  label: string;
  className: string;
};

const seriesList: FinancialChartSeries[] = [
  { key: "revenue", label: "매출", className: "revenue" },
  { key: "operatingIncome", label: "영업이익", className: "operating" },
  { key: "netIncome", label: "순이익", className: "net" },
  { key: "freeCashFlow", label: "FCF", className: "fcf" },
];

export function FinancialBarCharts({ data }: { data: FinancialChartPoint[] }) {
  const latest = data[data.length - 1];

  const summary = useMemo(() => {
    if (!latest) return [];

    return seriesList.map((series) => {
      const current = latest[series.key];
      const previousPoint = [...data].reverse().find((item) => item.label !== latest.label && item[series.key] !== null && item[series.key] !== undefined);
      const previous = previousPoint?.[series.key] ?? null;
      const change = current !== null && current !== undefined && previous !== null && previous !== undefined && previous !== 0
        ? ((current - previous) / Math.abs(previous)) * 100
        : null;

      return {
        ...series,
        current,
        change,
      };
    });
  }, [data, latest]);

  if (!data.length) {
    return null;
  }

  return (
    <div className="financial-chart-panel">
      <div className="financial-chart-head">
        <div>
          <span>시각화</span>
          <strong>분기별 실적 추이</strong>
        </div>
        <p>막대에 마우스를 올리면 해당 분기의 실제 금액을 확인할 수 있습니다.</p>
      </div>

      <div className="financial-chart-summary">
        {summary.map((item) => (
          <div className="financial-chart-kpi" key={item.key}>
            <span>
              <i className={`chart-dot ${item.className}`} />
              {item.label}
            </span>
            <strong>{formatMoney(item.current)}</strong>
            <em className={item.change === null ? "" : item.change >= 0 ? "positive" : "negative"}>
              {item.change === null ? "직전 분기 비교 불가" : `직전 분기 ${formatSignedPercent(item.change)}`}
            </em>
          </div>
        ))}
      </div>

      <div className="financial-chart-grid">
        {seriesList.map((series) => (
          <ChartCard key={series.key} data={data} series={series} />
        ))}
      </div>
    </div>
  );
}

function ChartCard({ data, series }: { data: FinancialChartPoint[]; series: FinancialChartSeries }) {
  const values = data.map((item) => item[series.key]).filter((value): value is number => value !== null && value !== undefined);
  const max = Math.max(...values.map((value) => Math.abs(value)), 1);

  return (
    <div className="financial-chart-card">
      <div className="financial-chart-title">
        <span className={`chart-dot ${series.className}`} />
        <strong>{series.label}</strong>
      </div>
      <div className="bar-chart" aria-label={`${series.label} chart`}>
        {data.map((item) => {
          const value = item[series.key];
          const height = value === null || value === undefined ? 0 : Math.max(5, (Math.abs(value) / max) * 100);
          const isNegative = (value ?? 0) < 0;

          return (
            <button
              className="bar-slot"
              key={`${series.key}-${item.label}`}
              type="button"
            >
              <span className={`bar ${series.className}${isNegative ? " negative" : ""}`} style={{ height: `${height}%` }} />
              <span className="bar-popover">
                <span>{series.label} · {item.label}</span>
                <strong>{formatMoney(value)}</strong>
              </span>
            </button>
          );
        })}
      </div>
      <div className="chart-labels">
        {data.map((item) => (
          <span key={`${series.key}-label-${item.label}`}>{shortQuarterLabel(item.label)}</span>
        ))}
      </div>
    </div>
  );
}

function shortQuarterLabel(label: string): string {
  const match = label.match(/(\d{4})\s*(Q\d)/);
  if (!match) return label.replace(" ", "");
  return `${match[1].slice(2)}${match[2]}`;
}

function formatMoney(value?: number | null): string {
  if (value === null || value === undefined) return "미확인";
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000_000) return `${sign}$${(absolute / 1_000_000_000_000).toFixed(2)}T`;
  if (absolute >= 1_000_000_000) return `${sign}$${(absolute / 1_000_000_000).toFixed(2)}B`;
  if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(2)}M`;
  return `${sign}$${absolute.toLocaleString("en-US")}`;
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
