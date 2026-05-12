from dataclasses import dataclass

import pandas as pd

from app.schemas.strategy import StrategySignal


@dataclass(frozen=True)
class Strategy:
    key: str
    name: str
    description: str
    holding_days: str

    def evaluate(self, ticker: str, data: pd.DataFrame) -> StrategySignal:
        raise NotImplementedError
