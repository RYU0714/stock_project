import pandas as pd

from app.schemas.strategy import StrategySignal
from app.services.strategies.base import Strategy


class PlaceholderStrategy(Strategy):
    def evaluate(self, ticker: str, data: pd.DataFrame) -> StrategySignal:
        return StrategySignal(
            strategy=self.key,
            status="planned",
            score=0,
            holding_days=self.holding_days,
            reasons=["MVP 이후 실적/뉴스/프리마켓 데이터 연결 후 구현 예정"],
        )
