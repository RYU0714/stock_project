from pydantic import BaseModel


class StockSummary(BaseModel):
    ticker: str
    name: str
    price: float
    change: float
    change_percent: float
    sector: str
    market_cap: str
    description: str


class Candle(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    ma20: float | None = None
    ma50: float | None = None
    rsi14: float | None = None
    atr14: float | None = None


class ChartResponse(BaseModel):
    ticker: str
    candles: list[Candle]
