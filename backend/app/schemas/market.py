from pydantic import BaseModel


class MarketRegime(BaseModel):
    regime: str
    spy_trend: str
    qqq_trend: str
    vix_level: str
    recommendation: str
