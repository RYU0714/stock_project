from pydantic import BaseModel


class StrategyInfo(BaseModel):
    key: str
    name: str
    description: str
    holding_days: str


class StrategySignal(BaseModel):
    strategy: str
    status: str
    score: int
    entry_price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    risk_reward: float | None = None
    holding_days: str
    reasons: list[str]


class StrategySignalResponse(BaseModel):
    ticker: str
    signals: list[StrategySignal]
