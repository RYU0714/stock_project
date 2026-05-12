from pydantic import BaseModel


class BacktestTrade(BaseModel):
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    return_percent: float
    result: str


class BacktestResponse(BaseModel):
    ticker: str
    strategy: str
    win_rate: float
    average_return: float
    average_loss: float
    expectancy: float
    max_drawdown: float
    trade_count: int
    trades: list[BacktestTrade]
