"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, LineChart, RefreshCw, Search, ShieldAlert, TrendingUp } from "lucide-react";
import { TradingChart } from "@/components/TradingChart";
import { fetchBacktest, fetchChart, fetchSignals, fetchSummary } from "@/lib/api";
import type { Backtest, Candle, StockSummary, StrategySignal } from "@/types/stock";

const ko = (value: string) => decodeURIComponent(value);

const STRATEGY_LABELS: Record<string, string> = {
  high_vol_rsi_divergence: ko("%EA%B3%A0%EB%B3%80%EB%8F%99%20RSI%20%EB%8B%A4%EC%9D%B4%EB%B2%84%EC%A0%84%EC%8A%A4"),
  pullback: ko("%EC%B6%94%EC%84%B8%20%EB%88%8C%EB%A6%BC%EB%AA%A9"),
  mean_reversion: ko("%EA%B3%BC%EB%A7%A4%EB%8F%84%20%EB%B0%98%EB%93%B1"),
  connors_rsi2: "Connors RSI(2)",
  minervini_trend: ko("Minervini%20%EC%B6%94%EC%84%B8%20%ED%85%9C%ED%94%8C%EB%A6%BF"),
  darvas_box: ko("Darvas%20%EB%B0%95%EC%8A%A4%20%EB%8F%8C%ED%8C%8C"),
  holy_grail: "Raschke Holy Grail",
  gap_strength: ko("%EA%B0%AD%20%EC%83%81%EC%8A%B9%20%EC%A2%85%EA%B0%80%20%EA%B0%95%EB%8F%84"),
  earnings_drift: ko("%EC%8B%A4%EC%A0%81%20%EB%93%9C%EB%A6%AC%ED%94%84%ED%8A%B8"),
};

const STATUS_LABELS: Record<string, string> = {
  entry_watch: ko("%EC%A7%84%EC%9E%85%20%EA%B4%80%EC%8B%AC"),
  watch: ko("%EA%B4%80%EC%8B%AC%20%EC%A2%85%EB%AA%A9"),
  avoid: ko("%EC%A0%9C%EC%99%B8"),
  planned: ko("%EC%A4%80%EB%B9%84%20%EC%A4%91"),
};

const EXIT_LABELS: Record<string, string> = {
  same_day_stop_first: ko("%EB%B3%B4%EC%88%98%EC%A0%81%20%EC%86%90%EC%A0%88"),
  stop_loss: ko("%EC%86%90%EC%A0%88"),
  take_profit: ko("%EB%AA%A9%ED%91%9C%EA%B0%80"),
  rsi_recovery: ko("RSI%20%ED%9A%8C%EB%B3%B5"),
  ema20_loss: "20EMA 이탈",
  box_failure: ko("%EB%B0%95%EC%8A%A4%20%EC%9D%B4%ED%83%88"),
  time_exit: ko("%EB%B3%B4%EC%9C%A0%EA%B8%B0%EA%B0%84%20%EC%A2%85%EB%A3%8C"),
};

const TIMEFRAMES = [
  { key: "1h", label: "1시간" },
  { key: "4h", label: "4시간" },
  { key: "1d", label: "일봉" },
  { key: "1wk", label: "주봉" },
  { key: "1mo", label: "월봉" },
];

const SOURCE_LABELS: Record<string, string> = {
  yahoo: "Yahoo Finance",
  demo: ko("%EB%8D%B0%EB%AA%A8"),
};

const BACKTEST_PERIODS = [
  { key: "5y", label: ko("%EC%B5%9C%EA%B7%BC%205%EB%85%84") },
  { key: "2y", label: ko("%EC%B5%9C%EA%B7%BC%202%EB%85%84") },
  { key: "1y", label: ko("%EC%B5%9C%EA%B7%BC%201%EB%85%84") },
  { key: "all", label: ko("%EC%A0%84%EC%B2%B4") },
];

export default function Home() {
  const [tickerInput, setTickerInput] = useState("AAPL");
  const [ticker, setTicker] = useState("AAPL");
  const [strategy, setStrategy] = useState("pullback");
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState("1d");
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [backtest, setBacktest] = useState<Backtest | null>(null);
  const [backtestPeriod, setBacktestPeriod] = useState("5y");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchSummary(ticker), fetchChart(ticker, timeframe), fetchSignals(ticker), fetchBacktest(ticker, strategy, backtestPeriod)])
      .then(([summaryResult, chartResult, signalResult, backtestResult]) => {
        if (!isMounted) return;
        setSummary(summaryResult);
        setCandles(chartResult.candles);
        setSignals(signalResult.signals);
        setBacktest(backtestResult);
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(requestError instanceof Error ? requestError.message : "Failed to load data");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [ticker, strategy, timeframe, backtestPeriod, refreshTick]);

  const latest = candles[candles.length - 1];
  const visibleCandles = useMemo(() => candles, [candles]);
  const bestSignal = useMemo(
    () => signals.filter((signal) => signal.status !== "planned").sort((a, b) => b.score - a.score)[0],
    [signals],
  );
  const intradaySignals = useMemo(() => signals.filter((signal) => signal.category === "intraday"), [signals]);
  const shortSignals = useMemo(() => signals.filter((signal) => signal.category === "short"), [signals]);
  const swingSignals = useMemo(() => signals.filter((signal) => signal.category === "swing"), [signals]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const cleaned = tickerInput.trim().toUpperCase();
    if (cleaned) setTicker(cleaned);
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <LineChart size={22} />
          <div>
            <strong>{ko("%EB%AF%B8%EA%B5%AD%20%EB%8B%A8%ED%83%80%20%EC%8A%A4%EC%9C%99%20%EB%B6%84%EC%84%9D")}</strong>
            <span>{ko("1-5%EC%9D%BC%20%EB%B3%B4%EC%9C%A0%20%EC%A0%84%EB%9E%B5%20%EA%B2%80%EC%A6%9D%20%EB%8F%84%EA%B5%AC")}</span>
          </div>
        </div>

        <form className="search" onSubmit={submitSearch}>
          <input aria-label="Ticker" value={tickerInput} onChange={(event) => setTickerInput(event.target.value)} placeholder="AAPL, NVDA, MSFT, TSLA" />
          <button className="icon-button" type="submit" aria-label={ko("%EC%A2%85%EB%AA%A9%20%EA%B2%80%EC%83%89")}>
            <Search size={18} />
          </button>
        </form>
      </header>

      <main className="main">
        {error ? (
          <div className="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="hero">
          <div className="quote-block">
            <div className="eyebrow">
              <span>{SOURCE_LABELS[summary?.source ?? "demo"]} OHLCV</span>
              <span>{ko("%EA%B3%84%EC%82%B0%20%EB%8D%B0%EC%9D%B4%ED%84%B0")}: {SOURCE_LABELS[summary?.source ?? "demo"]}</span>
              <span>{loading ? ko("%EA%B0%B1%EC%8B%A0%20%EC%A4%91") : ko("%EC%A4%80%EB%B9%84%20%EC%99%84%EB%A3%8C")}</span>
            </div>

            <div className="quote-row">
              <div>
                <h1>{summary?.ticker ?? ticker}</h1>
                <p>{summary?.description ?? "Loading"}</p>
              </div>
              <button className="refresh-button" type="button" onClick={() => setRefreshTick((value) => value + 1)}>
                <RefreshCw size={16} />
                {ko("%EC%83%88%EB%A1%9C%EA%B3%A0%EC%B9%A8")}
              </button>
            </div>

            <div className="price-row">
              <span className="price">${summary?.price.toFixed(2) ?? "--"}</span>
              <span className={(summary?.change_percent ?? 0) >= 0 ? "change positive" : "change negative"}>
                {summary ? `${summary.change >= 0 ? "+" : ""}${summary.change.toFixed(2)} (${summary.change_percent.toFixed(2)}%)` : "--"}
              </span>
            </div>

            <div className="quick-stats">
              <Metric label={ko("%EC%B5%9C%EA%B7%BC%20%EC%A2%85%EA%B0%80")} value={latest ? `$${latest.close.toFixed(2)}` : "--"} />
              <Metric label="RSI 14" value={latest?.rsi14 ? latest.rsi14.toFixed(1) : "--"} />
              <Metric label="ATR 14" value={latest?.atr14 ? `$${latest.atr14.toFixed(2)}` : "--"} />
              <Metric label={ko("%EC%B5%9C%EA%B3%A0%20%EC%A0%84%EB%9E%B5")} value={bestSignal ? `${STRATEGY_LABELS[bestSignal.strategy] ?? bestSignal.strategy} ${bestSignal.score}${ko("%EC%A0%90")}` : "--"} />
            </div>
          </div>

          <div className="decision-panel">
            <span className="panel-label">{ko("%ED%98%84%EC%9E%AC%20%ED%8C%90%EB%8B%A8")}</span>
            <strong>{bestSignal ? STATUS_LABELS[bestSignal.status] : ko("%EC%8B%A0%ED%98%B8%20%EC%97%86%EC%9D%8C")}</strong>
            <p>
              {bestSignal
                ? `${STRATEGY_LABELS[bestSignal.strategy] ?? bestSignal.strategy} ${ko("%EC%A0%84%EB%9E%B5%20%EC%A0%90%EC%88%98")} ${bestSignal.score}/100`
                : ko("%EC%A2%85%EB%AA%A9%EC%9D%84%20%EA%B2%80%EC%83%89%ED%95%98%EB%A9%B4%20%EB%8B%A8%EA%B8%B0%20%EC%A0%84%EB%9E%B5%EC%9D%84%20%ED%8F%89%EA%B0%80%ED%95%A9%EB%8B%88%EB%8B%A4.")}
            </p>
            <div className="decision-grid">
              <Metric label={ko("%EC%A7%84%EC%9E%85%EA%B0%80")} value={bestSignal?.entry_price ? `$${bestSignal.entry_price}` : "-"} />
              <Metric label={ko("%EC%86%90%EC%A0%88%EA%B0%80")} value={bestSignal?.stop_loss ? `$${bestSignal.stop_loss}` : "-"} />
              <Metric label={ko("%EB%AA%A9%ED%91%9C%EA%B0%80")} value={bestSignal?.take_profit ? `$${bestSignal.take_profit}` : "-"} />
            </div>
          </div>
        </section>

        <section className="layout">
          <div className="panel chart-panel">
            <div className="section-head">
              <div>
                <h2>{ko("%EA%B0%80%EA%B2%A9%20%EC%B0%A8%ED%8A%B8")}</h2>
                <p>{ko("%EC%B5%9C%EA%B7%BC")} {visibleCandles.length}{ko("%EA%B0%9C%20%EC%BA%94%EB%93%A4")}</p>
              </div>
              <BarChart3 size={20} />
            </div>
            <div className="timeframe-tabs">
              {TIMEFRAMES.map((item) => (
                <button className={timeframe === item.key ? "active" : ""} key={item.key} type="button" onClick={() => setTimeframe(item.key)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="assumptions">
              {ko("%EC%B0%A8%ED%8A%B8%EC%99%80%20%EC%A0%84%EB%9E%B5%2F%EB%B0%B1%ED%85%8C%EC%8A%A4%ED%8A%B8%EB%8A%94%20%EA%B0%99%EC%9D%80%20Yahoo%20Finance%20OHLCV%20%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%A5%BC%20%EA%B8%B0%EB%B0%98%EC%9C%BC%EB%A1%9C%20%EA%B3%84%EC%82%B0%ED%95%A9%EB%8B%88%EB%8B%A4.")}
            </div>
            <TradingChart candles={visibleCandles} />
          </div>

          <aside className="panel strategy-panel">
            <div className="section-head">
              <div>
                <h2>{ko("%EC%A0%84%EB%9E%B5%20%EC%8B%A0%ED%98%B8")}</h2>
                <p>{ko("%EB%8B%A8%EA%B8%B0%EC%99%80%20%EC%8A%A4%EC%9C%99%EC%9D%84%20%EB%B3%B4%EC%9C%A0%20%EA%B8%B0%EA%B0%84%EA%B3%BC%20%EC%A7%80%ED%91%9C%20%EA%B8%B0%EC%A4%80%EC%9C%BC%EB%A1%9C%20%EB%82%98%EB%88%A0%20%ED%8F%89%EA%B0%80%ED%95%A9%EB%8B%88%EB%8B%A4.")}</p>
              </div>
              <TrendingUp size={20} />
            </div>
            <div className="strategy-list">
              <StrategyGroup title={ko("%EA%B3%A0%EB%B3%80%EB%8F%99%20%EB%8B%A8%ED%83%80%20%EC%A0%84%EB%9E%B5%20%EC%8B%A0%ED%98%B8")} subtitle={ko("1%EC%8B%9C%EA%B0%84%EB%B4%89%20%C2%B7%2012%EC%8B%9C%EA%B0%84%20%EC%9D%B4%EB%82%B4")} signals={intradaySignals} selectedStrategy={strategy} onSelect={setStrategy} />
              <StrategyGroup title={ko("%EB%8B%A8%EA%B8%B0%20%EC%A0%84%EB%9E%B5%20%EC%8B%A0%ED%98%B8")} subtitle={ko("1-3%EC%9D%BC%20%EB%B3%B4%EC%9C%A0%20%EC%A4%91%EC%8B%AC")} signals={shortSignals} selectedStrategy={strategy} onSelect={setStrategy} />
              <StrategyGroup title={ko("%EC%8A%A4%EC%9C%99%20%EC%A0%84%EB%9E%B5%20%EC%8B%A0%ED%98%B8")} subtitle={ko("2-8%EC%9D%BC%20%EB%B3%B4%EC%9C%A0%20%EC%A4%91%EC%8B%AC")} signals={swingSignals} selectedStrategy={strategy} onSelect={setStrategy} />
            </div>
          </aside>
        </section>

        <section className="lower-grid">
          <div className="panel">
            <div className="section-head">
              <div>
                <h2>{ko("%EC%8B%A4%EC%A0%84%ED%98%95%20%EB%B0%B1%ED%85%8C%EC%8A%A4")}</h2>
                <p>{STRATEGY_LABELS[strategy] ?? strategy} · {backtest?.market_filter ?? "SPY filter"} · {backtest?.start_date}~{backtest?.end_date}</p>
              </div>
              <Activity size={20} />
            </div>
            <div className="timeframe-tabs backtest-tabs">
              {BACKTEST_PERIODS.map((item) => (
                <button className={backtestPeriod === item.key ? "active" : ""} key={item.key} type="button" onClick={() => setBacktestPeriod(item.key)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="backtest-grid">
              <Metric label={ko("%EC%8B%A4%EC%A0%84%20%EC%A0%90%EC%88%98")} value={`${backtest?.practical_score ?? 0}/100`} />
              <Metric label={backtest?.category === "swing" ? ko("%EC%B6%94%EC%B2%9C%20%EB%B3%B4%EC%9C%A0") : ko("%EC%B5%9C%EB%8C%80%20%EB%B3%B4%EC%9C%A0")} value={backtest?.max_holding_label ?? `${backtest?.max_holding_days ?? 0}${ko("%EC%9D%BC")}`} />
              <Metric label={ko("%EC%B4%9D%20%EC%88%98%EC%9D%B5%EB%A5%A0")} value={`${backtest?.total_return ?? 0}%`} />
              <Metric label={ko("%EC%8A%B9%EB%A5%A0")} value={`${backtest?.win_rate ?? 0}%`} />
              <Metric label="Profit Factor" value={`${backtest?.profit_factor ?? 0}`} />
              <Metric label={ko("%EA%B8%B0%EB%8C%80%EA%B0%92")} value={`${backtest?.expectancy ?? 0}%`} />
              <Metric label={ko("%EC%B5%9C%EB%8C%80%20%EB%82%99%ED%8F%AD")} value={`${backtest?.max_drawdown ?? 0}%`} />
              <Metric label={ko("%EC%97%B0%EC%86%8D%20%EC%86%90%EC%8B%A4")} value={`${backtest?.max_consecutive_losses ?? 0}`} />
              <Metric label={ko("%EB%85%B8%EC%B6%9C%EB%8F%84")} value={`${backtest?.exposure_percent ?? 0}%`} />
              <Metric label={ko("%EA%B1%B0%EB%9E%98%20%EC%88%98")} value={`${backtest?.trade_count ?? 0}`} />
              <Metric label={ko("%EC%B5%9C%EC%A2%85%20%EC%9E%90%EC%82%B0")} value={`$${backtest?.final_equity ?? 0}`} />
            </div>
            <div className="assumptions">
              {ko("%EA%B0%80%EC%A0%95")}: {ko("%EC%88%98%EC%88%98%EB%A3%8C")} {backtest?.fee_percent ?? 0}% · {ko("%EC%8A%AC%EB%A6%AC%ED%94%BC%EC%A7%80")} {backtest?.slippage_percent ?? 0}% · {ko("%EA%B1%B0%EB%9E%98%EB%8B%B9%20%EC%9C%84%ED%97%98")} {backtest?.risk_per_trade_percent ?? 0}%
            </div>
            {backtest?.category === "swing" && backtest.holding_optimization.length ? (
              <div className="holding-compare">
                <h3>{ko("%EB%B3%B4%EC%9C%A0%EA%B8%B0%EA%B0%84%20%EC%B5%9C%EC%A0%81%ED%99%94")}</h3>
                <div className="holding-grid">
                  {backtest.holding_optimization.map((item) => (
                    <div className={item.days === backtest.max_holding_days ? "holding-item active" : "holding-item"} key={item.days}>
                      <strong>{item.days}{ko("%EC%9D%BC")}</strong>
                      <span>{ko("%EC%8A%B9%EB%A5%A0")} {item.win_rate}%</span>
                      <span>PF {item.profit_factor}</span>
                      <span>{ko("%EC%A0%90%EC%88%98")} {item.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="period-compare">
              <h3>{ko("%EA%B8%B0%EA%B0%84%EB%B3%84%20%EA%B2%80%EC%A6%9D")}</h3>
              <div className="period-table">
                {(backtest?.period_returns ?? []).map((item) => (
                  <button className={backtestPeriod === item.period ? "period-row active" : "period-row"} key={item.period} type="button" onClick={() => setBacktestPeriod(item.period)}>
                    <span>{item.label}</span>
                    <strong>{item.score}/100</strong>
                    <span>{item.win_rate}%</span>
                    <span>{item.profit_factor}</span>
                    <span className={item.total_return >= 0 ? "positive" : "negative"}>{item.total_return}%</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="section-head">
              <div>
                <h2>{ko("%EC%B5%9C%EA%B7%BC%20%EA%B0%80%EC%83%81%20%EB%A7%A4%EB%A7%A4")}</h2>
                <p>{ko("%EC%A0%84%EC%B2%B4%20%EB%B0%B1%ED%85%8C%EC%8A%A4%ED%8A%B8%20%EA%B1%B0%EB%9E%98%20%EC%A4%91%20%EC%B5%9C%EA%B7%BC")} {backtest?.trades.length ?? 0}{ko("%EA%B1%B4%EC%9D%84%20%EC%8A%A4%ED%81%AC%EB%A1%A4%EB%A1%9C%20%ED%99%95%EC%9D%B8%ED%95%A9%EB%8B%88%EB%8B%A4.")}</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{ko("%EC%A7%84%EC%9E%85%EC%9D%BC")}</th>
                    <th>{ko("%EC%B2%AD%EC%82%B0%EC%9D%BC")}</th>
                    <th>{ko("%EB%A7%A4%EC%88%98%EA%B0%80")}</th>
                    <th>{ko("%EB%A7%A4%EB%8F%84%EA%B0%80")}</th>
                    <th>{ko("%EC%88%9C%EC%88%98%EC%9D%B5")}</th>
                    <th>{ko("%EC%B2%AD%EC%82%B0")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(backtest?.trades ?? []).length ? (
                    backtest?.trades.map((trade) => (
                      <tr key={`${trade.entry_date}-${trade.exit_date}-${trade.entry_price}`}>
                        <td>{trade.entry_date}</td>
                        <td>{trade.exit_date}</td>
                        <td>${trade.entry_price}</td>
                        <td>${trade.exit_price}</td>
                        <td className={trade.net_return_percent >= 0 ? "positive" : "negative"}>{trade.net_return_percent}%</td>
                        <td>{EXIT_LABELS[trade.exit_reason] ?? trade.exit_reason}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>{ko("%ED%95%B4%EB%8B%B9%20%EC%A0%84%EB%9E%B5%EC%9D%98%20%EC%B6%A9%EC%A1%B1%20%EA%B1%B0%EB%9E%98%EA%B0%80%20%EC%97%86%EC%8A%B5%EB%8B%88%EB%8B%A4.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="panel monthly-panel">
          <div className="section-head">
            <div>
              <h2>{ko("%EC%9B%94%EB%B3%84%20%EC%88%98%EC%9D%B5%EB%A5%A0")}</h2>
              <p>{ko("%EA%B3%84%EC%A2%8C%20%EA%B8%B0%EC%A4%80%20%EC%9B%94%EB%B3%84%20%EC%86%90%EC%9D%B5%20%ED%9D%90%EB%A6%84")}</p>
            </div>
          </div>
          <div className="month-bars">
            {(backtest?.monthly_returns ?? []).slice(-12).map((item) => (
              <div className="month" key={item.month}>
                <span>{item.month.slice(5)}</span>
                <div className="month-track">
                  <div className={item.return_percent >= 0 ? "month-bar positive-bg" : "month-bar negative-bg"} style={{ width: `${Math.min(Math.abs(item.return_percent) * 12, 100)}%` }} />
                </div>
                <strong className={item.return_percent >= 0 ? "positive" : "negative"}>{item.return_percent}%</strong>
              </div>
            ))}
          </div>
        </section>

        <div className="disclaimer">
          <ShieldAlert size={18} />
          <span>{ko("%EC%9D%B4%20%EB%8F%84%EA%B5%AC%EB%8A%94%20%ED%88%AC%EC%9E%90%20%EC%A1%B0%EC%96%B8%EC%9D%B4%20%EC%95%84%EB%8B%99%EB%8B%88%EB%8B%A4.%20%EC%8B%A4%EC%A0%9C%20%EB%A7%A4%EB%A7%A4%20%EC%A0%84%EC%97%90%20%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%B6%9C%EC%B2%98%2C%20%EC%B2%B4%EA%B2%B0%20%EA%B0%80%EB%8A%A5%EC%84%B1%2C%20%EA%B3%84%EC%A2%8C%20%EA%B7%9C%EC%A0%95%EC%9D%84%20%EB%B0%98%EB%93%9C%EC%8B%9C%20%ED%99%95%EC%9D%B8%ED%95%98%EC%84%B8%EC%9A%94.")}</span>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StrategyGroup({
  title,
  subtitle,
  signals,
  selectedStrategy,
  onSelect,
}: {
  title: string;
  subtitle: string;
  signals: StrategySignal[];
  selectedStrategy: string;
  onSelect: (strategy: string) => void;
}) {
  return (
    <section className="strategy-group">
      <div className="strategy-group-head">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {signals.map((signal) => (
        <button className={`strategy-card ${selectedStrategy === signal.strategy ? "selected" : ""}`} key={signal.strategy} type="button" onClick={() => onSelect(signal.strategy)}>
          <div className="strategy-top">
            <span>{STRATEGY_LABELS[signal.strategy] ?? signal.strategy}</span>
            <strong>{signal.score}</strong>
          </div>
          <div className={`status ${signal.status}`}>{STATUS_LABELS[signal.status] ?? signal.status}</div>
          <p>{signal.reasons[0]}</p>
          {signal.intraday_confirm ? (
            <div className={`intraday-confirm ${signal.intraday_confirm.status}`}>
              <div>
                <strong>5m VWAP</strong>
                <span>{signal.intraday_confirm.score}/100</span>
              </div>
              <div className="intraday-metrics">
                <span>VWAP {signal.intraday_confirm.vwap ? `$${signal.intraday_confirm.vwap}` : "-"}</span>
                <span>{ko("%EA%B1%B0%EB%9E%98%EB%9F%89")} {signal.intraday_confirm.volume_surge_ratio ? `${signal.intraday_confirm.volume_surge_ratio}x` : "-"}</span>
                <span>{signal.intraday_confirm.last_time || "-"}</span>
              </div>
            </div>
          ) : null}
          <div className="trade-plan">
            <span>{ko("%EB%B3%B4%EC%9C%A0")} {signal.holding_days}</span>
            <span>{ko("%EC%86%90%EC%A0%88")} {signal.stop_loss ? `$${signal.stop_loss}` : "-"}</span>
            <span>{ko("%EB%AA%A9%ED%91%9C")} {signal.take_profit ? `$${signal.take_profit}` : "-"}</span>
          </div>
        </button>
      ))}
    </section>
  );
}
