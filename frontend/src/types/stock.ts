export type StockSummary = {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  sector: string;
  market_cap: string;
  description: string;
  source?: "yahoo" | "demo";
};

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma5?: number | null;
  ma10?: number | null;
  ma20?: number | null;
  ma50?: number | null;
  ma150?: number | null;
  ma200?: number | null;
  ema20?: number | null;
  rsi2?: number | null;
  rsi14?: number | null;
  atr14?: number | null;
  adx14?: number | null;
  avgVolume20?: number | null;
  high20?: number | null;
  low20?: number | null;
  high252?: number | null;
  low252?: number | null;
  source?: "yahoo" | "demo";
};

export type ChartResponse = {
  ticker: string;
  timeframe?: string;
  candles: Candle[];
};

export type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
};

export type StrategySignal = {
  strategy: string;
  category: "intraday" | "short" | "swing";
  status: string;
  score: number;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward: number | null;
  holding_days: string;
  max_holding_days: number;
  intraday_confirm?: {
    status: "confirm" | "neutral" | "weak";
    score: number;
    timeframe: "5m";
    last_time: string;
    price: number;
    vwap: number | null;
    vwap_distance_percent: number | null;
    volume_surge_ratio: number | null;
    reasons: string[];
  };
  reasons: string[];
};

export type StrategySignalResponse = {
  ticker: string;
  signals: StrategySignal[];
};

export type BacktestTrade = {
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  return_percent: number;
  net_return_percent: number;
  dollar_pnl: number;
  shares: number;
  exit_reason: string;
  result: string;
};

export type MonthlyReturn = {
  month: string;
  return_percent: number;
  trades: number;
};

export type BacktestPeriod = {
  period: "1y" | "2y" | "5y" | "all";
  label: string;
  start_date: string;
  end_date: string;
  total_return: number;
  win_rate: number;
  expectancy: number;
  profit_factor: number;
  max_drawdown: number;
  trade_count: number;
  score: number;
};

export type HoldingOptimization = {
  days: number;
  win_rate: number;
  profit_factor: number;
  expectancy: number;
  total_return: number;
  max_drawdown: number;
  trade_count: number;
  score: number;
};

export type Backtest = {
  ticker: string;
  strategy: string;
  category: "intraday" | "short" | "swing";
  max_holding_days: number;
  max_holding_label?: string;
  period: "1y" | "2y" | "5y" | "all";
  period_label: string;
  practical_score: number;
  start_date: string;
  end_date: string;
  initial_equity: number;
  final_equity: number;
  total_return: number;
  win_rate: number;
  average_return: number;
  average_loss: number;
  expectancy: number;
  profit_factor: number;
  max_drawdown: number;
  max_consecutive_losses: number;
  exposure_percent: number;
  trade_count: number;
  fee_percent: number;
  slippage_percent: number;
  risk_per_trade_percent: number;
  market_filter: string;
  holding_optimization: HoldingOptimization[];
  period_returns: BacktestPeriod[];
  monthly_returns: MonthlyReturn[];
  trades: BacktestTrade[];
};
