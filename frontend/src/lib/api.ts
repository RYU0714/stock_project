import type { Backtest, ChartResponse, SearchResponse, StockSummary, StrategySignalResponse } from "@/types/stock";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}

export function fetchSummary(ticker: string): Promise<StockSummary> {
  return request<StockSummary>(`/api/stocks/${ticker}/summary`).catch(() => demoSummary(ticker));
}

export function fetchChart(ticker: string, timeframe = "1d"): Promise<ChartResponse> {
  return request<ChartResponse>(`/api/stocks/${ticker}/chart?timeframe=${timeframe}`).catch(() => demoChart(ticker));
}

export function fetchSignals(ticker: string): Promise<StrategySignalResponse> {
  return request<StrategySignalResponse>(`/api/strategies/${ticker}/signals`).catch(() => demoSignals(ticker));
}

export function fetchBacktest(ticker: string, strategy: string, period = "5y"): Promise<Backtest> {
  return request<Backtest>(`/api/backtest/${ticker}?strategy=${strategy}&period=${period}`).catch(() => demoBacktest(ticker, strategy));
}

export function fetchSearch(query: string): Promise<SearchResponse> {
  return request<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`).catch(() => ({ query, results: [] }));
}

function demoSummary(ticker: string): StockSummary {
  return {
    ticker,
    name: `${ticker} Demo Corporation`,
    price: 184.22,
    change: 2.14,
    change_percent: 1.18,
    sector: "Technology",
    market_cap: "N/A",
    description: "실제 가격 API 연결 전 표시되는 데모 데이터입니다.",
  };
}

function demoChart(ticker: string): ChartResponse {
  const candles = Array.from({ length: 90 }, (_, index) => {
    const base = 150 + index * 0.35 + Math.sin(index / 4) * 4;
    return {
      time: `2026-${String(Math.floor(index / 22) + 1).padStart(2, "0")}-${String((index % 22) + 1).padStart(2, "0")}`,
      open: Number((base - 0.8).toFixed(2)),
      high: Number((base + 2.4).toFixed(2)),
      low: Number((base - 2.1).toFixed(2)),
      close: Number((base + Math.sin(index / 2)).toFixed(2)),
      volume: 24_000_000 + index * 120_000,
      ma20: Number((base - 1.5).toFixed(2)),
      ma50: Number((base - 3.1).toFixed(2)),
      rsi14: Number((48 + Math.sin(index / 5) * 14).toFixed(2)),
      atr14: 3.2,
    };
  });
  return { ticker, candles };
}

function demoSignals(ticker: string): StrategySignalResponse {
  return {
    ticker,
    signals: [
      {
        strategy: "pullback",
        category: "swing",
        status: "entry_watch",
        score: 78,
        entry_price: 184.22,
        stop_loss: 179.85,
        take_profit: 191.65,
        risk_reward: 1.7,
        holding_days: "1-5일",
        max_holding_days: 5,
        reasons: ["상승 추세 유지", "전일 고가 돌파", "거래량 증가"],
      },
      {
        strategy: "mean_reversion",
        category: "short",
        status: "watch",
        score: 52,
        entry_price: 184.22,
        stop_loss: 180.54,
        take_profit: 189.37,
        risk_reward: 1.4,
        holding_days: "1-3일",
        max_holding_days: 3,
        reasons: ["50일선 위 추세 유지", "과매도 조건은 약함"],
      },
    ],
  };
}

function demoBacktest(ticker: string, strategy: string): Backtest {
  return {
    ticker,
    strategy,
    category: "swing",
    max_holding_days: 5,
    period: "5y",
    period_label: "최근 5년",
    practical_score: 58,
    start_date: "2025-01-01",
    end_date: "2026-01-01",
    initial_equity: 10000,
    final_equity: 10880,
    total_return: 8.8,
    win_rate: 56.4,
    average_return: 3.2,
    average_loss: -2.1,
    expectancy: 0.88,
    profit_factor: 1.74,
    max_drawdown: -7.6,
    max_consecutive_losses: 3,
    exposure_percent: 12.5,
    trade_count: 39,
    fee_percent: 0.03,
    slippage_percent: 0.05,
    risk_per_trade_percent: 1,
    market_filter: "SPY close > SPY MA200",
    holding_optimization: [],
    period_returns: [],
    monthly_returns: [],
    trades: [],
  };
}
