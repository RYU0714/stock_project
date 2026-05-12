import type { Backtest, BacktestTrade, Candle, ChartResponse, StockSummary, StrategySignal, StrategySignalResponse } from "@/types/stock";

type StrategyKey = "high_vol_rsi_divergence" | "pullback" | "mean_reversion" | "connors_rsi2" | "minervini_trend" | "darvas_box" | "holy_grail" | "gap_strength";
type BacktestPeriodKey = "1y" | "2y" | "5y" | "all";

type YahooQuote = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

const BT = {
  initialEquity: 10000,
  riskPerTradePercent: 1,
  maxPositionPercent: 25,
  feePercent: 0.03,
  slippagePercent: 0.05,
  scoreThreshold: 70,
};

const ko = (value: string) => decodeURIComponent(value);

type Timeframe = "5m" | "15m" | "1h" | "4h" | "1d" | "1wk" | "1mo";
type IntradayConfirmation = NonNullable<StrategySignal["intraday_confirm"]>;

export async function getChart(ticker: string, timeframe = "1d"): Promise<ChartResponse> {
  const activeTimeframe = normalizeTimeframe(timeframe);
  const candles = await getMarketCandles(ticker, activeTimeframe);
  return { ticker: cleanTicker(ticker), timeframe: activeTimeframe, candles };
}

export async function getSummary(ticker: string): Promise<StockSummary> {
  const candles = await getMarketCandles(ticker, "1d");
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2] ?? latest;
  const change = latest.close - previous.close;

  return {
    ticker: cleanTicker(ticker),
    name: `${cleanTicker(ticker)} US Equity`,
    price: round(latest.close),
    change: round(change),
    change_percent: round((change / previous.close) * 100),
    sector: "N/A",
    market_cap: "N/A",
    description: ko("%EC%8B%A4%EC%A0%84%ED%98%95%20%EB%B0%B1%ED%85%8C%EC%8A%A4%ED%8A%B8%EB%8A%94%20%EC%88%98%EC%88%98%EB%A3%8C%2C%20%EC%8A%AC%EB%A6%AC%ED%94%BC%EC%A7%80%2C%20%EC%8B%9C%EC%9E%A5%20%ED%95%84%ED%84%B0%2C%20%ED%8F%AC%EC%A7%80%EC%85%98%20%EC%82%AC%EC%9D%B4%EC%A7%95%EC%9D%84%20%EB%B0%98%EC%98%81%ED%95%A9%EB%8B%88%EB%8B%A4."),
    source: resolveSource(candles),
  };
}

export async function getSignals(ticker: string): Promise<StrategySignalResponse> {
  const [candles, hourlyCandles] = await Promise.all([getMarketCandles(ticker, "1d"), getMarketCandles(ticker, "1h")]);
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2] ?? latest;
  const latestHour = hourlyCandles[hourlyCandles.length - 1] ?? latest;
  const intraday = await getIntradayConfirmation(ticker, candles);

  return {
    ticker: cleanTicker(ticker),
    signals: [
      buildSignal("high_vol_rsi_divergence", ko("12%EC%8B%9C%EA%B0%84%20%EC%9D%B4%EB%82%B4"), scoreHighVolRsiDivergence(hourlyCandles, latestHour), latestHour, [
        ko("%EA%B3%A0%EB%B3%80%EB%8F%99%20%EC%A2%85%EB%AA%A9%EC%97%90%EC%84%9C%201%EC%8B%9C%EA%B0%84%EB%B4%89%20RSI14%20%EC%83%81%EC%8A%B9%20%EB%8B%A4%EC%9D%B4%EB%B2%84%EC%A0%84%EC%8A%A4%EB%A5%BC%20%EC%B0%BE%EC%8A%B5%EB%8B%88%EB%8B%A4."),
        ko("ATR%2F%EA%B0%80%EA%B2%A9%201.2%25%20%EC%9D%B4%EC%83%81%EC%9D%98%20%EB%B3%80%EB%8F%99%EC%84%B1%20%EC%A2%85%EB%AA%A9%EC%97%90%EB%A7%8C%20%EC%A0%81%EC%9A%A9%ED%95%98%EB%8A%94%20%EB%8B%A8%ED%83%80%20%EC%A0%84%EC%9A%A9%20%ED%95%84%ED%84%B0%EC%9E%85%EB%8B%88%EB%8B%A4."),
      ]),
      buildSignal("pullback", "1-5일", scorePullback(latest, previous), latest, [
        ko("20%EC%9D%BC%EC%84%A0%2C%2050%EC%9D%BC%EC%84%A0%2C%20RSI14%2C%20%EC%A0%84%EC%9D%BC%20%EA%B3%A0%EA%B0%80%20%EB%8F%8C%ED%8C%8C%EB%A5%BC%20%ED%95%A8%EA%BB%98%20%ED%99%95%EC%9D%B8%ED%95%A9%EB%8B%88%EB%8B%A4."),
        ko("%EC%83%81%EC%8A%B9%20%EC%B6%94%EC%84%B8%20%EC%A2%85%EB%AA%A9%EC%9D%B4%20%EB%8B%A4%EC%8B%9C%20%ED%9E%98%EC%9D%84%20%ED%9A%8C%EB%B3%B5%ED%95%A0%20%EB%95%8C%20%EC%9C%A0%EB%A6%AC%ED%95%A9%EB%8B%88%EB%8B%A4."),
      ]),
      buildSignal("mean_reversion", "1-3일", scoreMeanReversion(latest, previous), latest, [
        ko("%ED%81%B0%20%EC%B6%94%EC%84%B8%EA%B0%80%20%EB%AC%B4%EB%84%88%EC%A7%80%EC%A7%80%20%EC%95%8A%EC%9D%80%20%EC%83%81%ED%83%9C%EC%97%90%EC%84%9C%20%EB%8B%A8%EA%B8%B0%20%EA%B3%BC%EB%A7%A4%EB%8F%84%20%EB%B0%98%EB%93%B1%EC%9D%84%20%EC%B0%BE%EC%8A%B5%EB%8B%88%EB%8B%A4."),
        ko("%EC%9C%A0%EB%8F%99%EC%84%B1%EC%9D%B4%20%ED%81%B0%20%EB%8C%80%ED%98%95%EC%A3%BC%EB%82%98%20ETF%EA%B0%80%20%ED%95%98%EB%A3%A8%20%ED%81%AC%EA%B2%8C%20%EB%B0%80%EB%A0%B8%EC%9D%84%20%EB%95%8C%20%EC%A0%81%ED%95%A9%ED%95%A9%EB%8B%88%EB%8B%A4."),
      ]),
      buildSignal("connors_rsi2", "1-3일", scoreConnorsRsi2(latest), latest, [
        ko("Larry%20Connors%EC%9D%98%20RSI%282%29%20%EC%95%84%EC%9D%B4%EB%94%94%EC%96%B4%EC%B2%98%EB%9F%BC%20200%EC%9D%BC%EC%84%A0%20%EC%9C%84%EC%9D%98%20%EB%8B%A8%EA%B8%B0%20%EA%B3%BC%EB%A7%A4%EB%8F%84%20%EA%B5%AC%EA%B0%84%EC%9D%84%20%EC%B0%BE%EC%8A%B5%EB%8B%88%EB%8B%A4."),
        ko("RSI2%EA%B0%80%2010%20%EC%9D%B4%ED%95%98%EC%9D%B8%20%EC%83%81%EC%8A%B9%20%EC%B6%94%EC%84%B8%20%EC%A2%85%EB%AA%A9%EC%9D%84%20%EC%A7%A7%EA%B2%8C%20%EB%B0%98%EB%93%B1%20%ED%9B%84%EB%B3%B4%EB%A1%9C%20%EB%B4%85%EB%8B%88%EB%8B%A4."),
      ]),
      buildSignal("minervini_trend", "2-5일", scoreMinerviniTrend(candles, latest), latest, [
        ko("Mark%20Minervini%EC%9D%98%20Trend%20Template%EC%B2%98%EB%9F%BC%2050%2F150%2F200%EC%9D%BC%20%EC%9D%B4%EB%8F%99%ED%8F%89%EA%B7%A0%20%EC%A0%95%EB%A0%AC%EC%9D%84%20%ED%99%95%EC%9D%B8%ED%95%A9%EB%8B%88%EB%8B%A4."),
        ko("52%EC%A3%BC%20%EA%B3%A0%EC%A0%90%20%EA%B7%BC%EC%B2%98%EC%9D%98%20%EA%B0%95%ED%95%9C%20%EC%A3%BC%EB%8F%84%EC%A3%BC%EB%A5%BC%20%EC%84%A0%EB%B3%84%ED%95%98%EB%8A%94%20%ED%95%84%ED%84%B0%EC%9E%85%EB%8B%88%EB%8B%A4."),
      ]),
      buildSignal("darvas_box", "2-5일", scoreDarvasBox(candles, latest), latest, [
        ko("Nicolas%20Darvas%EC%9D%98%20%EB%B0%95%EC%8A%A4%20%EB%8F%8C%ED%8C%8C%20%EC%95%84%EC%9D%B4%EB%94%94%EC%96%B4%EC%B2%98%EB%9F%BC%20%EC%B5%9C%EA%B7%BC%2020%EA%B1%B0%EB%9E%98%EC%9D%BC%20%EB%B0%95%EC%8A%A4%20%EC%83%81%EB%8B%A8%20%EB%8F%8C%ED%8C%8C%EB%A5%BC%20%EB%B4%85%EB%8B%88%EB%8B%A4."),
        ko("%EA%B0%80%EC%A7%9C%20%EB%8F%8C%ED%8C%8C%EB%A5%BC%20%EC%A4%84%EC%9D%B4%EA%B8%B0%20%EC%9C%84%ED%95%B4%20%EC%A2%85%EA%B0%80%20%EB%8F%8C%ED%8C%8C%EC%99%80%20%ED%8F%89%EA%B7%A0%20%EA%B1%B0%EB%9E%98%EB%9F%89%20%EC%A6%9D%EA%B0%80%EB%A5%BC%20%ED%95%A8%EA%BB%98%20%ED%99%95%EC%9D%B8%ED%95%A9%EB%8B%88%EB%8B%A4."),
      ]),
      buildSignal("holy_grail", "2-5일", scoreHolyGrail(candles, latest), latest, [
        ko("Linda%20Raschke%EC%9D%98%20Holy%20Grail%20%EC%A0%84%EB%9E%B5%EC%B2%98%EB%9F%BC%20ADX%EA%B0%80%20%EA%B0%95%ED%95%9C%20%EC%B6%94%EC%84%B8%EC%97%90%EC%84%9C%2020EMA%20%EB%88%8C%EB%A6%BC%EC%9D%84%20%EC%B0%BE%EC%8A%B5%EB%8B%88%EB%8B%A4."),
        ko("%EC%8A%B9%EB%A5%A0%EC%9D%84%20%EB%86%92%EC%9D%B4%EA%B8%B0%20%EC%9C%84%ED%95%B4%2050%2F200%EC%9D%BC%EC%84%A0%20%EC%83%81%EC%8A%B9%20%ED%95%84%ED%84%B0%EC%99%80%20%EA%B1%B0%EB%9E%98%EB%9F%89%20%ED%95%84%ED%84%B0%EB%A5%BC%20%EA%B0%99%EC%9D%B4%20%EB%B4%85%EB%8B%88%EB%8B%A4."),
      ]),
      buildSignal("gap_strength", "1-3일", scoreGapStrength(latest, previous), latest, [
        ko("%EA%B0%AD%20%EC%83%81%EC%8A%B9%20%ED%9B%84%20%EA%B3%A0%EA%B0%80%EA%B6%8C%EC%97%90%EC%84%9C%20%EB%A7%88%EA%B0%90%ED%95%98%EB%8A%94%EC%A7%80%20%ED%99%95%EC%9D%B8%ED%95%98%EB%8A%94%20%EC%9D%B4%EB%B2%A4%ED%8A%B8%20%EB%AA%A8%EB%A9%98%ED%85%80%20%EC%A0%84%EB%9E%B5%EC%9E%85%EB%8B%88%EB%8B%A4."),
        ko("%EB%89%B4%EC%8A%A4%EB%82%98%20%EC%8B%A4%EC%A0%81%20%EC%9D%B4%ED%9B%84%20%EB%A7%A4%EB%AC%BC%EC%9D%B4%20%EC%86%8C%ED%99%94%EB%90%98%EA%B3%A0%20%EA%B0%95%ED%95%98%EA%B2%8C%20%EB%8B%AB%ED%9E%8C%20%EC%A2%85%EB%AA%A9%EC%9D%84%20%EC%B0%BE%EC%8A%B5%EB%8B%88%EB%8B%A4."),
      ]),
    ].map((signal) => applyIntradayConfirmation(signal, intraday)),
  };
}

export async function getBacktest(ticker: string, strategy: string, period = "5y"): Promise<Backtest> {
  const activeStrategy = normalizeStrategy(strategy);
  const activePeriod = normalizeBacktestPeriod(period);
  const backtestTimeframe: Timeframe = strategyCategory(activeStrategy) === "intraday" ? "1h" : "1d";
  const [candles, spyCandles] = await Promise.all([getMarketCandles(ticker, backtestTimeframe), getMarketCandles("SPY", backtestTimeframe)]);
  const holdingOptimization = optimizeHoldingDays(cleanTicker(ticker), activeStrategy, candles, spyCandles, activePeriod);
  const selectedMaxHold = holdingOptimization[0]?.days ?? maxHoldDays(activeStrategy);
  const periodResults = BACKTEST_PERIODS.map((item) => runBacktest(cleanTicker(ticker), activeStrategy, candles, spyCandles, item.key, selectedMaxHold));
  const selected = periodResults.find((item) => item.period === activePeriod) ?? periodResults.find((item) => item.period === "5y") ?? periodResults[0];
  return {
    ...selected,
    practical_score: practicalScore(periodResults),
    holding_optimization: holdingOptimization,
    period_returns: periodResults.map(periodSummary),
  };
}

const BACKTEST_PERIODS: Array<{ key: BacktestPeriodKey; label: string; years: number | null }> = [
  { key: "1y", label: ko("%EC%B5%9C%EA%B7%BC%201%EB%85%84"), years: 1 },
  { key: "2y", label: ko("%EC%B5%9C%EA%B7%BC%202%EB%85%84"), years: 2 },
  { key: "5y", label: ko("%EC%B5%9C%EA%B7%BC%205%EB%85%84"), years: 5 },
  { key: "all", label: ko("%EC%A0%84%EC%B2%B4"), years: null },
];

function runBacktest(ticker: string, activeStrategy: StrategyKey, candles: Candle[], spyCandles: Candle[], period: BacktestPeriodKey, maxHold = maxHoldDays(activeStrategy)): Backtest {
  const cutoff = cutoffForPeriod(candles, period);
  const spyByDate = new Map(spyCandles.map((item) => [item.time, item]));
  const trades: BacktestTrade[] = [];
  const equityPoints: Array<{ date: string; equity: number }> = [];
  let equity = BT.initialEquity;
  let daysInMarket = 0;
  let nextAvailableIndex = 0;

  for (let index = 210; index < candles.length - maxHold - 1; index += 1) {
    if (index + 1 < nextAvailableIndex) continue;
    const current = candles[index];
    const previous = candles[index - 1];
    if (cutoff && current.time < cutoff) continue;
    const spy = spyByDate.get(current.time);
    if (!isMarketAllowed(spy)) continue;

    const history = candles.slice(0, index + 1);
    const score = scoreStrategy(activeStrategy, history, current, previous);
    if (score < BT.scoreThreshold) continue;

    const plan = tradePlan(current, activeStrategy);
    const entryDay = candles[index + 1];
    const entryPrice = applyBuyCost(entryDay.open);
    if (plan.stop_loss >= entryPrice || plan.take_profit <= entryPrice) continue;
    const riskPerShare = Math.max(entryPrice - plan.stop_loss, entryPrice * 0.005);
    const riskBudget = equity * (BT.riskPerTradePercent / 100);
    const maxPositionValue = equity * (BT.maxPositionPercent / 100);
    const shares = Math.floor(Math.min(riskBudget / riskPerShare, maxPositionValue / entryPrice));
    if (shares < 1) continue;

    const exit = simulateExit(activeStrategy, candles, index + 1, plan, maxHold);
    nextAvailableIndex = exit.index + 1;
    const exitPrice = applySellCost(exit.price);
    const grossReturn = ((exit.price - entryPrice) / entryPrice) * 100;
    const netReturn = ((exitPrice - entryPrice) / entryPrice) * 100 - BT.feePercent * 2;
    const dollarPnl = (exitPrice - entryPrice) * shares - entryPrice * shares * (BT.feePercent / 100) - exitPrice * shares * (BT.feePercent / 100);
    equity = Math.max(0, equity + dollarPnl);
    daysInMarket += exit.holdingDays;
    equityPoints.push({ date: exit.date, equity });

    trades.push({
      entry_date: entryDay.time,
      exit_date: exit.date,
      entry_price: round(entryPrice),
      exit_price: round(exitPrice),
      return_percent: round(grossReturn),
      net_return_percent: round(netReturn),
      dollar_pnl: round(dollarPnl),
      shares,
      exit_reason: exit.reason,
      result: netReturn > 0 ? "win" : "loss",
    });
  }

  return summarizeBacktest(ticker, activeStrategy, period, candles, trades, equityPoints, equity, daysInMarket, cutoff, maxHold);
}

async function getMarketCandles(ticker: string, timeframe: Timeframe): Promise<Candle[]> {
  return getYahooCandles(ticker, timeframe);
}

async function getYahooCandles(ticker: string, timeframe: Timeframe): Promise<Candle[]> {
  const symbol = encodeURIComponent(cleanTicker(ticker));
  const { range, interval, usePeriod } = yahooFrame(timeframe);
  const period2 = Math.floor(Date.now() / 1000);
  const query = usePeriod
    ? `period1=0&period2=${period2}&interval=${interval}`
    : `range=${range}&interval=${interval}`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?${query}&includePrePost=false`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 },
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) throw new Error(`Yahoo request failed: ${response.status}`);
    const payload = (await response.json()) as YahooQuote;
    const result = payload.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    if (!result?.timestamp?.length || !quote?.close?.length) throw new Error("Empty Yahoo chart response");

    const raw = result.timestamp.flatMap((timestamp, index): Candle[] => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index];
      if (
        typeof open !== "number" ||
        typeof high !== "number" ||
        typeof low !== "number" ||
        typeof close !== "number" ||
        typeof volume !== "number" ||
        ![open, high, low, close, volume].every(Number.isFinite)
      ) {
        return [];
      }
      const isoTime = new Date(timestamp * 1000).toISOString();
      const time = timeframe === "5m" || timeframe === "15m" || timeframe === "1h" || timeframe === "4h" ? isoTime.slice(0, 16).replace("T", " ") : isoTime.slice(0, 10);
      return [{ time, open, high, low, close, volume, source: "yahoo" }];
    });

    if (raw.length < minimumBars(timeframe)) throw new Error("Not enough chart history");
    const framed = timeframe === "4h" ? toFourHourCandles(raw) : raw;
    return addIndicators(framed);
  } catch {
    return addIndicators(demoCandles(ticker));
  }
}

function toFourHourCandles(candles: Candle[]): Candle[] {
  const groups = new Map<string, Candle[]>();
  for (const candle of candles) {
    const date = new Date(`${candle.time.replace(" ", "T")}:00.000Z`);
    const bucketHour = Math.floor(date.getUTCHours() / 4) * 4;
    const key = `${date.toISOString().slice(0, 10)} ${String(bucketHour).padStart(2, "0")}:00`;
    const group = groups.get(key) ?? [];
    group.push(candle);
    groups.set(key, group);
  }
  return Array.from(groups.entries()).map(([time, group]) => ({
    time,
    open: group[0].open,
    high: Math.max(...group.map((item) => item.high)),
    low: Math.min(...group.map((item) => item.low)),
    close: group[group.length - 1].close,
    volume: group.reduce((sum, item) => sum + item.volume, 0),
    source: group[0].source,
  }));
}

function normalizeTimeframe(value: string): Timeframe {
  if (value === "1h" || value === "4h" || value === "1d" || value === "1wk" || value === "1mo") return value;
  return "1d";
}

function yahooFrame(timeframe: Timeframe) {
  if (timeframe === "5m") return { range: "5d", interval: "5m", usePeriod: false };
  if (timeframe === "15m") return { range: "10d", interval: "15m", usePeriod: false };
  if (timeframe === "1h") return { range: "730d", interval: "60m", usePeriod: false };
  if (timeframe === "4h") return { range: "730d", interval: "60m", usePeriod: false };
  if (timeframe === "1wk") return { range: "max", interval: "1wk", usePeriod: true };
  if (timeframe === "1mo") return { range: "max", interval: "1mo", usePeriod: true };
  return { range: "max", interval: "1d", usePeriod: true };
}

function resolveSource(candles: Candle[]) {
  if (candles.some((item) => item.source === "yahoo")) return "yahoo";
  return "demo";
}

function minimumBars(timeframe: Timeframe) {
  if (timeframe === "5m") return 25;
  if (timeframe === "15m") return 25;
  if (timeframe === "1h") return 50;
  if (timeframe === "4h") return 30;
  if (timeframe === "1mo") return 24;
  return 80;
}

async function getIntradayConfirmation(ticker: string, dailyCandles: Candle[]): Promise<IntradayConfirmation> {
  try {
    const intraday = await getMarketCandles(ticker, "5m");
    const latest = [...intraday].reverse().find((candle) => candle.volume > 0) ?? intraday[intraday.length - 1];
    if (!latest || latest.source !== "yahoo") return emptyIntradayConfirmation();

    const sessionDate = latest.time.slice(0, 10);
    const latestIndex = intraday.lastIndexOf(latest);
    const session = intraday.slice(0, latestIndex + 1).filter((candle) => candle.time.slice(0, 10) === sessionDate);
    const previousIntraday = session.slice(Math.max(0, session.length - 21), -1);
    const vwap = calculateVwap(session);
    const averageVolume = averageOrNull(previousIntraday.map((candle) => candle.volume));
    const volumeSurgeRatio = averageVolume ? latest.volume / averageVolume : null;
    const previousDaily = dailyCandles[dailyCandles.length - 2];
    const sessionHighBeforeLatest = high(session.slice(0, -1));
    const range = Math.max(latest.high - latest.low, 0.01);
    const closeLocation = (latest.close - latest.low) / range;
    const vwapDistance = vwap ? ((latest.close - vwap) / vwap) * 100 : null;
    const reasons: string[] = [];
    let score = 0;

    if (vwap && latest.close > vwap) {
      score += 30;
      reasons.push(ko("5%EB%B6%84%EB%B4%89%20%EC%A2%85%EA%B0%80%EA%B0%80%20VWAP%20%EC%9C%84%EC%97%90%20%EC%9E%88%EC%96%B4%20%EC%9D%BC%EC%A4%91%20%EB%A7%A4%EC%88%98%20%EC%9A%B0%EC%9C%84%EB%A5%BC%20%ED%99%95%EC%9D%B8%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4."));
    } else {
      reasons.push(ko("5%EB%B6%84%EB%B4%89%20%EA%B0%80%EA%B2%A9%EC%9D%B4%20VWAP%20%EC%95%84%EB%9E%98%EB%9D%BC%20%EC%B6%94%EA%B2%A9%20%EC%A7%84%EC%9E%85%EC%9D%80%20%EB%B3%B4%EC%88%98%EC%A0%81%EC%9C%BC%EB%A1%9C%20%EB%B4%85%EB%8B%88%EB%8B%A4."));
    }

    if (vwapDistance !== null && vwapDistance >= 0 && vwapDistance <= 3) {
      score += 15;
      reasons.push(ko("VWAP%20%EB%8C%80%EB%B9%84%20%EA%B4%B4%EB%A6%AC%EA%B0%80%203%25%20%EC%9D%B4%EB%82%B4%EB%9D%BC%20%EB%8B%A8%EA%B8%B0%20%EC%A7%84%EC%9E%85%20%EB%B6%80%EB%8B%B4%EC%9D%B4%20%EA%B3%BC%ED%95%98%EC%A7%80%20%EC%95%8A%EC%8A%B5%EB%8B%88%EB%8B%A4."));
    }

    if (volumeSurgeRatio !== null && volumeSurgeRatio >= 1.5) {
      score += volumeSurgeRatio >= 2 ? 35 : 25;
      reasons.push(`${ko("%EC%B5%9C%EA%B7%BC%205%EB%B6%84%EB%B4%89%20%EA%B1%B0%EB%9E%98%EB%9F%89%EC%9D%B4%20%EC%A7%81%EC%A0%84%2020%EA%B0%9C%20%EB%B4%89%20%ED%8F%89%EA%B7%A0%20%EB%8C%80%EB%B9%84")} ${round(volumeSurgeRatio)}x${ko("%EB%A1%9C%20%EC%A6%9D%EA%B0%80%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4.")}`);
    }

    if (previousDaily && latest.close > previousDaily.high) {
      score += 20;
      reasons.push(ko("%EC%A0%84%EC%9D%BC%20%EA%B3%A0%EA%B0%80%EB%A5%BC%205%EB%B6%84%EB%B4%89%20%EC%A2%85%EA%B0%80%EA%B0%80%20%EB%8F%8C%ED%8C%8C%ED%95%B4%20%EB%8B%A8%EA%B8%B0%20%EC%88%98%EA%B8%89%EC%9D%84%20%ED%99%95%EC%9D%B8%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4."));
    } else if (sessionHighBeforeLatest && latest.close > sessionHighBeforeLatest) {
      score += 12;
      reasons.push(ko("%EC%9D%BC%EC%A4%91%20%EA%B3%A0%EA%B0%80%EB%A5%BC%20%EB%8B%A4%EC%8B%9C%20%EB%84%98%EA%B8%B0%EB%8A%94%20%EB%B6%84%EB%B4%89%20%EB%AA%A8%EB%A9%98%ED%85%80%EC%9D%B4%20%EC%9E%88%EC%8A%B5%EB%8B%88%EB%8B%A4."));
    }

    if (closeLocation >= 0.65) {
      score += 10;
      reasons.push(ko("5%EB%B6%84%EB%B4%89%EC%9D%B4%20%EA%B3%A0%EA%B0%80%EA%B6%8C%EC%97%90%EC%84%9C%20%EB%A7%88%EA%B0%90%ED%95%B4%20%EC%B2%B4%EA%B2%B0%20%EA%B0%95%EB%8F%84%EB%A5%BC%20%EA%B0%84%EC%A0%91%20%ED%99%95%EC%9D%B8%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4."));
    }

    const finalScore = Math.min(score, 100);
    return {
      status: finalScore >= 70 ? "confirm" : finalScore >= 45 ? "neutral" : "weak",
      score: finalScore,
      timeframe: "5m",
      last_time: latest.time,
      price: round(latest.close),
      vwap: roundOptional(vwap),
      vwap_distance_percent: roundOptional(vwapDistance),
      volume_surge_ratio: roundOptional(volumeSurgeRatio),
      reasons: reasons.slice(0, 4),
    };
  } catch {
    return emptyIntradayConfirmation();
  }
}

function applyIntradayConfirmation(signal: StrategySignal, intraday: IntradayConfirmation): StrategySignal {
  if (signal.category !== "short") return signal;
  const bonus = intraday.status === "confirm" ? 12 : intraday.status === "neutral" ? 4 : -8;
  const score = Math.round(clamp(signal.score + bonus, 0, 100));
  return {
    ...signal,
    score,
    status: score >= 70 ? "entry_watch" : score >= 50 ? "watch" : "avoid",
    intraday_confirm: intraday,
    reasons: [
      ...signal.reasons,
      `${ko("분봉%20확인")}: ${intraday.score}/100 · VWAP ${intraday.vwap ? `$${intraday.vwap}` : "-"}`,
      ...intraday.reasons.slice(0, 2),
    ],
  };
}

function emptyIntradayConfirmation(): IntradayConfirmation {
  return {
    status: "weak",
    score: 0,
    timeframe: "5m",
    last_time: "",
    price: 0,
    vwap: null,
    vwap_distance_percent: null,
    volume_surge_ratio: null,
    reasons: [ko("Yahoo%205%EB%B6%84%EB%B4%89%20%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%A5%BC%20%ED%99%95%EC%9D%B8%ED%95%A0%20%EC%88%98%20%EC%97%86%EC%96%B4%20%EB%8B%A8%EA%B8%B0%20%EB%B6%84%EB%B4%89%20%ED%99%95%EC%9D%B8%EC%9D%84%20%EC%95%BD%ED%95%98%EA%B2%8C%20%EC%B2%98%EB%A6%AC%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4.")],
  };
}

function calculateVwap(candles: Candle[]): number | null {
  const totals = candles.reduce(
    (acc, candle) => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      acc.priceVolume += typicalPrice * candle.volume;
      acc.volume += candle.volume;
      return acc;
    },
    { priceVolume: 0, volume: 0 },
  );
  return totals.volume ? totals.priceVolume / totals.volume : null;
}

function addIndicators(candles: Candle[]): Candle[] {
  return candles.map((candle, index) => ({
    ...candle,
    ma5: roundOptional(sma(candles, index, 5)),
    ma10: roundOptional(sma(candles, index, 10)),
    ma20: roundOptional(sma(candles, index, 20)),
    ma50: roundOptional(sma(candles, index, 50)),
    ma150: roundOptional(sma(candles, index, 150)),
    ma200: roundOptional(sma(candles, index, 200)),
    ema20: roundOptional(ema(candles, index, 20)),
    rsi2: roundOptional(rsi(candles, index, 2)),
    rsi14: roundOptional(rsi(candles, index, 14)),
    atr14: roundOptional(atr(candles, index, 14)),
    adx14: roundOptional(adx(candles, index, 14)),
    avgVolume20: roundOptional(averageOrNull(candles.slice(Math.max(0, index - 19), index + 1).map((item) => item.volume))),
    high20: roundOptional(high(candles.slice(Math.max(0, index - 19), index + 1))),
    low20: roundOptional(low(candles.slice(Math.max(0, index - 19), index + 1))),
    high252: roundOptional(high(candles.slice(Math.max(0, index - 251), index + 1))),
    low252: roundOptional(low(candles.slice(Math.max(0, index - 251), index + 1))),
  }));
}

function scorePullback(latest: Candle, previous: Candle): number {
  let score = 0;
  if (latest.ma20 && latest.ma50 && latest.close > latest.ma20 && latest.ma20 > latest.ma50) score += 35;
  if (latest.rsi14 && latest.rsi14 >= 40 && latest.rsi14 <= 64) score += 20;
  if (latest.close > previous.high) score += 25;
  if (latest.close > latest.open) score += 20;
  return Math.min(score, 100);
}

function scoreMeanReversion(latest: Candle, previous: Candle): number {
  let score = 0;
  const dayChange = ((latest.close - previous.close) / previous.close) * 100;
  if (latest.ma50 && latest.close > latest.ma50) score += 25;
  if (latest.ma20 && latest.close < latest.ma20) score += 25;
  if (latest.rsi2 !== null && latest.rsi2 !== undefined && latest.rsi2 <= 15) score += 30;
  if (dayChange <= -2) score += 20;
  return Math.min(score, 100);
}

function scoreConnorsRsi2(latest: Candle): number {
  let score = 0;
  if (latest.ma200 && latest.close > latest.ma200) score += 35;
  if (latest.rsi2 !== null && latest.rsi2 !== undefined && latest.rsi2 <= 10) score += 35;
  if (latest.rsi2 !== null && latest.rsi2 !== undefined && latest.rsi2 <= 5) score += 15;
  if (latest.ma5 && latest.close < latest.ma5) score += 15;
  return Math.min(score, 100);
}

function scoreHighVolRsiDivergence(candles: Candle[], latest: Candle): number {
  let score = 0;
  if (isHighVolatility(latest)) score += 25;
  if (latest.ma200 && latest.close > latest.ma200) score += 20;
  if (hasBullishRsiDivergence(candles)) score += 35;
  if (latest.close > latest.open) score += 10;
  if (latest.avgVolume20 && latest.volume >= latest.avgVolume20 * 1.1) score += 10;
  return Math.min(score, 100);
}

function isHighVolatility(candle: Candle): boolean {
  return Boolean(candle.atr14 && candle.close && (candle.atr14 / candle.close) * 100 >= 1.2);
}

function hasBullishRsiDivergence(candles: Candle[]): boolean {
  if (candles.length < 60) return false;
  const firstWindow = candles.slice(-45, -20);
  const secondWindow = candles.slice(-20);
  const firstLow = firstWindow.reduce((lowest, candle) => (candle.low < lowest.low ? candle : lowest), firstWindow[0]);
  const secondLow = secondWindow.reduce((lowest, candle) => (candle.low < lowest.low ? candle : lowest), secondWindow[0]);
  return Boolean(
    firstLow &&
      secondLow &&
      secondLow.low < firstLow.low &&
      (secondLow.rsi14 ?? 0) > (firstLow.rsi14 ?? 100) + 4 &&
      candles[candles.length - 1].close > candles[candles.length - 1].open,
  );
}

function scoreMinerviniTrend(candles: Candle[], latest: Candle): number {
  let score = 0;
  const monthAgo = candles[candles.length - 22];
  if (latest.ma50 && latest.close > latest.ma50) score += 12;
  if (latest.ma150 && latest.close > latest.ma150) score += 12;
  if (latest.ma200 && latest.close > latest.ma200) score += 12;
  if (latest.ma50 && latest.ma150 && latest.ma50 > latest.ma150) score += 12;
  if (latest.ma50 && latest.ma200 && latest.ma50 > latest.ma200) score += 12;
  if (latest.ma150 && latest.ma200 && latest.ma150 > latest.ma200) score += 12;
  if (latest.ma200 && monthAgo?.ma200 && latest.ma200 > monthAgo.ma200) score += 12;
  if (latest.low252 && latest.close >= latest.low252 * 1.3) score += 8;
  if (latest.high252 && latest.close >= latest.high252 * 0.75) score += 8;
  return Math.min(score, 100);
}

function scoreDarvasBox(candles: Candle[], latest: Candle): number {
  if (candles.length < 25) return 0;
  const previousBox = candles.slice(-21, -1);
  const boxHigh = high(previousBox);
  const boxLow = low(previousBox);
  let score = 0;
  if (boxHigh && latest.close > boxHigh) score += 40;
  if (boxLow && latest.low > boxLow) score += 15;
  if (latest.avgVolume20 && latest.volume >= latest.avgVolume20 * 1.3) score += 25;
  if (latest.ma50 && latest.close > latest.ma50) score += 20;
  return Math.min(score, 100);
}

function scoreGapStrength(latest: Candle, previous: Candle): number {
  const candleRange = Math.max(latest.high - latest.low, 0.01);
  const closeLocation = (latest.close - latest.low) / candleRange;
  let score = 0;
  if (latest.open >= previous.close * 1.02) score += 35;
  if (closeLocation >= 0.7) score += 25;
  if (latest.close > latest.open) score += 15;
  if (latest.avgVolume20 && latest.volume >= latest.avgVolume20 * 1.5) score += 25;
  return Math.min(score, 100);
}

function scoreHolyGrail(candles: Candle[], latest: Candle): number {
  const previous = candles[candles.length - 2];
  let score = 0;
  if (latest.ma50 && latest.ma200 && latest.close > latest.ma50 && latest.ma50 > latest.ma200) score += 25;
  if (latest.adx14 && latest.adx14 >= 25) score += 20;
  if (latest.adx14 && previous?.adx14 && latest.adx14 >= previous.adx14) score += 15;
  if (latest.ema20 && latest.low <= latest.ema20 * 1.015 && latest.close > latest.ema20) score += 25;
  if (latest.close > latest.open) score += 10;
  if (latest.avgVolume20 && latest.volume >= latest.avgVolume20 * 0.8) score += 5;
  return Math.min(score, 100);
}

function buildSignal(strategy: StrategyKey, holdingDays: string, score: number, latest: Candle, reasons: string[]): StrategySignal {
  const plan = tradePlan(latest, strategy);
  return {
    strategy,
    category: strategyCategory(strategy),
    status: score >= 70 ? "entry_watch" : score >= 50 ? "watch" : "avoid",
    score,
    entry_price: score >= 50 ? round(latest.close) : null,
    stop_loss: score >= 50 ? plan.stop_loss : null,
    take_profit: score >= 50 ? plan.take_profit : null,
    risk_reward: score >= 50 ? plan.risk_reward : null,
    holding_days: holdingDays,
    max_holding_days: maxHoldDays(strategy),
    reasons,
  };
}

function tradePlan(candle: Candle, strategy: StrategyKey) {
  const entry = candle.close;
  const atrRisk = Math.max(candle.atr14 ?? entry * 0.02, entry * 0.015);
  let stopLoss = entry - atrRisk;
  let rewardMultiple = 1.7;

  if (strategy === "pullback") {
    stopLoss = Math.min(candle.ma20 ? candle.ma20 * 0.99 : entry - atrRisk * 1.1, candle.low - atrRisk * 0.15);
    rewardMultiple = 1.8;
  } else if (strategy === "high_vol_rsi_divergence") {
    stopLoss = entry - atrRisk * 1.2;
    rewardMultiple = 1.8;
  } else if (strategy === "mean_reversion") {
    stopLoss = entry - atrRisk * 1.35;
    rewardMultiple = 1.15;
  } else if (strategy === "connors_rsi2") {
    stopLoss = candle.ma200 ? Math.max(entry - atrRisk * 2.1, candle.ma200 * 0.985) : entry - atrRisk * 2.1;
    rewardMultiple = 1.05;
  } else if (strategy === "minervini_trend") {
    stopLoss = Math.min(candle.ma50 ? candle.ma50 * 0.985 : entry - atrRisk * 1.6, entry - atrRisk * 1.15);
    rewardMultiple = 2.0;
  } else if (strategy === "darvas_box") {
    stopLoss = candle.low20 ? Math.min(candle.low20 * 0.995, entry - atrRisk * 0.9) : entry - atrRisk * 1.2;
    rewardMultiple = 2.0;
  } else if (strategy === "holy_grail") {
    stopLoss = Math.min(candle.ema20 ? candle.ema20 * 0.985 : entry - atrRisk, candle.low - atrRisk * 0.2);
    rewardMultiple = 1.6;
  } else if (strategy === "gap_strength") {
    stopLoss = Math.max(entry - atrRisk * 1.4, candle.low * 0.995);
    rewardMultiple = 1.4;
  }

  if (stopLoss >= entry) stopLoss = entry - atrRisk;
  return {
    stop_loss: round(stopLoss),
    take_profit: round(entry + Math.abs(entry - stopLoss) * rewardMultiple),
    risk_reward: round(rewardMultiple),
  };
}

function simulateExit(strategy: StrategyKey, candles: Candle[], entryIndex: number, plan: ReturnType<typeof tradePlan>, maxHold = maxHoldDays(strategy)) {
  for (let offset = 0; offset < maxHold; offset += 1) {
    const day = candles[entryIndex + offset];
    if (!day) break;

    const stopHit = day.low <= plan.stop_loss;
    const targetHit = day.high >= plan.take_profit;
    if (stopHit && targetHit) return { date: day.time, price: plan.stop_loss, reason: "same_day_stop_first", holdingDays: offset + 1, index: entryIndex + offset };
    if (stopHit) return { date: day.time, price: plan.stop_loss, reason: "stop_loss", holdingDays: offset + 1, index: entryIndex + offset };
    if (targetHit) return { date: day.time, price: plan.take_profit, reason: "take_profit", holdingDays: offset + 1, index: entryIndex + offset };
    if ((strategy === "connors_rsi2" || strategy === "mean_reversion") && day.rsi2 !== null && day.rsi2 !== undefined && day.rsi2 >= 70) {
      return { date: day.time, price: day.close, reason: "rsi_recovery", holdingDays: offset + 1, index: entryIndex + offset };
    }
    if (strategy === "holy_grail" && day.ema20 && day.close < day.ema20) {
      return { date: day.time, price: day.close, reason: "ema20_loss", holdingDays: offset + 1, index: entryIndex + offset };
    }
    if (strategy === "darvas_box" && day.close < plan.stop_loss) {
      return { date: day.time, price: day.close, reason: "box_failure", holdingDays: offset + 1, index: entryIndex + offset };
    }
  }
  const fallbackIndex = Math.min(entryIndex + maxHold - 1, candles.length - 1);
  const fallback = candles[fallbackIndex];
  return { date: fallback.time, price: fallback.close, reason: "time_exit", holdingDays: maxHold, index: fallbackIndex };
}

function summarizeBacktest(
  ticker: string,
  strategy: StrategyKey,
  period: BacktestPeriodKey,
  candles: Candle[],
  trades: BacktestTrade[],
  equityPoints: Array<{ date: string; equity: number }>,
  finalEquity: number,
  daysInMarket: number,
  cutoff: string | null,
  maxHold: number,
): Backtest {
  const wins = trades.filter((trade) => trade.net_return_percent > 0);
  const losses = trades.filter((trade) => trade.net_return_percent <= 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.dollar_pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.dollar_pnl, 0));
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const averageReturn = average(wins.map((trade) => trade.net_return_percent));
  const averageLoss = average(losses.map((trade) => trade.net_return_percent));

  return {
    ticker,
    strategy,
    category: strategyCategory(strategy),
    max_holding_days: maxHold,
    max_holding_label: maxHoldLabel(strategy, maxHold),
    period,
    period_label: periodLabel(period),
    practical_score: 0,
    start_date: cutoff ?? candles[0]?.time ?? "",
    end_date: candles[candles.length - 1]?.time ?? "",
    initial_equity: BT.initialEquity,
    final_equity: round(finalEquity),
    total_return: round(((finalEquity - BT.initialEquity) / BT.initialEquity) * 100),
    win_rate: round(winRate),
    average_return: round(averageReturn),
    average_loss: round(averageLoss),
    expectancy: round((winRate / 100) * averageReturn + ((100 - winRate) / 100) * averageLoss),
    profit_factor: grossLoss ? round(grossProfit / grossLoss) : round(grossProfit ? 99 : 0),
    max_drawdown: round(maxDrawdownFromEquity(equityPoints)),
    max_consecutive_losses: maxConsecutiveLosses(trades),
    exposure_percent: round((daysInMarket / Math.max(candles.length, 1)) * 100),
    trade_count: trades.length,
    fee_percent: BT.feePercent,
    slippage_percent: BT.slippagePercent,
    risk_per_trade_percent: BT.riskPerTradePercent,
    market_filter: "SPY close > SPY MA200",
    holding_optimization: [],
    period_returns: [],
    monthly_returns: monthlyReturns(trades),
    trades: trades.slice(-200),
  };
}

function normalizeBacktestPeriod(value: string): BacktestPeriodKey {
  if (value === "1y" || value === "2y" || value === "5y" || value === "all") return value;
  return "5y";
}

function periodLabel(period: BacktestPeriodKey): string {
  return BACKTEST_PERIODS.find((item) => item.key === period)?.label ?? period;
}

function cutoffForPeriod(candles: Candle[], period: BacktestPeriodKey): string | null {
  const years = BACKTEST_PERIODS.find((item) => item.key === period)?.years;
  if (!years) return null;
  const last = candles[candles.length - 1]?.time;
  if (!last) return null;
  const cutoffDate = new Date(`${last.slice(0, 10)}T00:00:00.000Z`);
  cutoffDate.setUTCFullYear(cutoffDate.getUTCFullYear() - years);
  return cutoffDate.toISOString().slice(0, 10);
}

function periodSummary(backtest: Backtest) {
  return {
    period: backtest.period,
    label: backtest.period_label,
    start_date: backtest.start_date,
    end_date: backtest.end_date,
    total_return: backtest.total_return,
    win_rate: backtest.win_rate,
    expectancy: backtest.expectancy,
    profit_factor: backtest.profit_factor,
    max_drawdown: backtest.max_drawdown,
    trade_count: backtest.trade_count,
    score: scoreBacktest(backtest),
  };
}

function optimizeHoldingDays(ticker: string, strategy: StrategyKey, candles: Candle[], spyCandles: Candle[], period: BacktestPeriodKey) {
  const candidates = strategyCategory(strategy) === "swing" ? [5, 8, 10, 15, 20] : [maxHoldDays(strategy)];
  return candidates
    .map((days) => {
      const result = runBacktest(ticker, strategy, candles, spyCandles, period, days);
      return {
        days,
        win_rate: result.win_rate,
        profit_factor: result.profit_factor,
        expectancy: result.expectancy,
        total_return: result.total_return,
        max_drawdown: result.max_drawdown,
        trade_count: result.trade_count,
        score: holdingScore(result),
      };
    })
    .sort((a, b) => b.score - a.score || b.win_rate - a.win_rate || b.profit_factor - a.profit_factor);
}

function practicalScore(results: Backtest[]): number {
  const byPeriod = new Map(results.map((item) => [item.period, scoreBacktest(item)]));
  return round((byPeriod.get("1y") ?? 0) * 0.35 + (byPeriod.get("2y") ?? 0) * 0.3 + (byPeriod.get("5y") ?? 0) * 0.25 + (byPeriod.get("all") ?? 0) * 0.1);
}

function holdingScore(backtest: Backtest): number {
  let score = 0;
  score += clamp(backtest.win_rate - 35, 0, 35);
  score += clamp((backtest.profit_factor - 1) * 22, 0, 25);
  score += clamp(backtest.expectancy * 12, 0, 20);
  score += clamp(12 - Math.abs(Math.min(backtest.max_drawdown, 0)) * 0.4, 0, 12);
  score += clamp(backtest.trade_count, 0, 20) * 0.4;
  if (backtest.trade_count < 8) score *= 0.55;
  return round(clamp(score, 0, 100));
}

function scoreBacktest(backtest: Backtest): number {
  let score = 0;
  score += clamp(backtest.win_rate - 40, 0, 25);
  score += clamp((backtest.profit_factor - 1) * 25, 0, 25);
  score += clamp(backtest.expectancy * 10, 0, 20);
  score += clamp(backtest.total_return / 2, 0, 15);
  score += clamp(15 - Math.abs(Math.min(backtest.max_drawdown, 0)) * 0.5, 0, 15);
  if (backtest.trade_count < 10) score *= 0.55;
  if (backtest.trade_count >= 20) score += 5;
  return round(clamp(score, 0, 100));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function strategyCategory(strategy: StrategyKey): "intraday" | "short" | "swing" {
  if (strategy === "high_vol_rsi_divergence") return "intraday";
  if (strategy === "mean_reversion" || strategy === "connors_rsi2" || strategy === "gap_strength") return "short";
  return "swing";
}

function maxHoldDays(strategy: StrategyKey): number {
  if (strategy === "high_vol_rsi_divergence") return 12;
  if (strategy === "mean_reversion" || strategy === "connors_rsi2" || strategy === "gap_strength") return 3;
  if (strategy === "minervini_trend") return 8;
  return 5;
}

function maxHoldLabel(strategy: StrategyKey, maxHold: number): string {
  if (strategyCategory(strategy) === "intraday") return `${maxHold}${ko("%EC%8B%9C%EA%B0%84")}`;
  return `${maxHold}${ko("%EC%9D%BC")}`;
}

function isMarketAllowed(spy?: Candle): boolean {
  return !spy || !spy.ma200 || spy.close > spy.ma200;
}

function applyBuyCost(price: number): number {
  return price * (1 + BT.slippagePercent / 100);
}

function applySellCost(price: number): number {
  return price * (1 - BT.slippagePercent / 100);
}

function normalizeStrategy(strategy: string): StrategyKey {
  if (strategy === "high_vol_rsi_divergence" || strategy === "mean_reversion" || strategy === "connors_rsi2" || strategy === "minervini_trend" || strategy === "darvas_box" || strategy === "holy_grail" || strategy === "gap_strength") {
    return strategy;
  }
  return "pullback";
}

function scoreStrategy(strategy: StrategyKey, candles: Candle[], current: Candle, previous: Candle): number {
  if (strategy === "high_vol_rsi_divergence") return scoreHighVolRsiDivergence(candles, current);
  if (strategy === "mean_reversion") return scoreMeanReversion(current, previous);
  if (strategy === "connors_rsi2") return scoreConnorsRsi2(current);
  if (strategy === "minervini_trend") return scoreMinerviniTrend(candles, current);
  if (strategy === "darvas_box") return scoreDarvasBox(candles, current);
  if (strategy === "holy_grail") return scoreHolyGrail(candles, current);
  if (strategy === "gap_strength") return scoreGapStrength(current, previous);
  return scorePullback(current, previous);
}

function sma(candles: Candle[], index: number, period: number): number | null {
  if (index + 1 < period) return null;
  return average(candles.slice(index - period + 1, index + 1).map((item) => item.close));
}

function ema(candles: Candle[], index: number, period: number): number | null {
  if (index + 1 < period) return null;
  const multiplier = 2 / (period + 1);
  let value = average(candles.slice(0, period).map((item) => item.close));
  for (let cursor = period; cursor <= index; cursor += 1) {
    value = candles[cursor].close * multiplier + value * (1 - multiplier);
  }
  return value;
}

function rsi(candles: Candle[], index: number, period: number): number | null {
  if (index < period) return null;
  let gain = 0;
  let loss = 0;
  for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
    const diff = candles[cursor].close - candles[cursor - 1].close;
    if (diff >= 0) gain += diff;
    else loss += Math.abs(diff);
  }
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

function adx(candles: Candle[], index: number, period: number): number | null {
  if (index < period * 2) return null;
  const dxValues: number[] = [];
  for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
    let plusDm = 0;
    let minusDm = 0;
    let trueRange = 0;
    for (let inner = cursor - period + 1; inner <= cursor; inner += 1) {
      const current = candles[inner];
      const previous = candles[inner - 1];
      const upMove = current.high - previous.high;
      const downMove = previous.low - current.low;
      plusDm += upMove > downMove && upMove > 0 ? upMove : 0;
      minusDm += downMove > upMove && downMove > 0 ? downMove : 0;
      trueRange += Math.max(current.high - current.low, Math.abs(current.high - previous.close), Math.abs(current.low - previous.close));
    }
    if (!trueRange) continue;
    const plusDi = (plusDm / trueRange) * 100;
    const minusDi = (minusDm / trueRange) * 100;
    const denominator = plusDi + minusDi;
    if (denominator) dxValues.push((Math.abs(plusDi - minusDi) / denominator) * 100);
  }
  return dxValues.length ? average(dxValues) : null;
}

function atr(candles: Candle[], index: number, period: number): number | null {
  if (index < period) return null;
  const values = [];
  for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
    const current = candles[cursor];
    const previous = candles[cursor - 1];
    values.push(Math.max(current.high - current.low, Math.abs(current.high - previous.close), Math.abs(current.low - previous.close)));
  }
  return average(values);
}

function demoCandles(ticker: string): Candle[] {
  const seed = cleanTicker(ticker).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({ length: 520 }, (_, index) => {
    const base = 130 + (seed % 70) + index * 0.09 + Math.sin(index / 8) * 5;
    return {
      time: `2024-${String(Math.floor(index / 22) + 1).padStart(2, "0")}-${String((index % 22) + 1).padStart(2, "0")}`,
      open: round(base - 0.8),
      high: round(base + 2.4),
      low: round(base - 2.1),
      close: round(base + Math.sin(index / 2)),
      volume: 20_000_000 + index * 90_000,
      source: "demo",
    };
  });
}

function averageOrNull(values: number[]): number | null {
  return values.length ? average(values) : null;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function high(candles: Candle[]): number | null {
  return candles.length ? Math.max(...candles.map((item) => item.high)) : null;
}

function low(candles: Candle[]): number | null {
  return candles.length ? Math.min(...candles.map((item) => item.low)) : null;
}

function maxDrawdownFromEquity(points: Array<{ equity: number }>): number {
  let peak = BT.initialEquity;
  let drawdown = 0;
  for (const point of points) {
    peak = Math.max(peak, point.equity);
    drawdown = Math.min(drawdown, ((point.equity - peak) / peak) * 100);
  }
  return drawdown;
}

function maxConsecutiveLosses(trades: BacktestTrade[]): number {
  let current = 0;
  let max = 0;
  for (const trade of trades) {
    current = trade.net_return_percent <= 0 ? current + 1 : 0;
    max = Math.max(max, current);
  }
  return max;
}

function monthlyReturns(trades: BacktestTrade[]) {
  const months = new Map<string, { pnl: number; trades: number }>();
  for (const trade of trades) {
    const month = trade.exit_date.slice(0, 7);
    const current = months.get(month) ?? { pnl: 0, trades: 0 };
    current.pnl += trade.dollar_pnl;
    current.trades += 1;
    months.set(month, current);
  }
  return Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      month,
      return_percent: round((value.pnl / BT.initialEquity) * 100),
      trades: value.trades,
    }));
}

function cleanTicker(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12) || "AAPL";
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function roundOptional(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : round(value);
}
