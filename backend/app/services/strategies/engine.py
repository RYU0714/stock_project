import pandas as pd

from app.schemas.strategy import StrategySignal
from app.services.strategies.base import Strategy
from app.services.strategies.mean_reversion import MeanReversionStrategy
from app.services.strategies.placeholders import PlaceholderStrategy
from app.services.strategies.pullback import PullbackStrategy

STRATEGIES: list[Strategy] = [
    PullbackStrategy(),
    MeanReversionStrategy(),
    PlaceholderStrategy(
        key="earnings_drift",
        name="실적 발표 후 드리프트",
        description="실적 서프라이즈 이후 2-5일 추가 움직임을 추적합니다.",
        holding_days="2-5 days",
    ),
    PlaceholderStrategy(
        key="gap_strength",
        name="갭 상승 후 종가 강도",
        description="갭 상승 후 고가권 마감한 종목을 추적합니다.",
        holding_days="1-3 days",
    ),
    PlaceholderStrategy(
        key="breakout_retest",
        name="돌파 후 되돌림",
        description="20일 박스권 돌파 후 돌파 가격 지지를 확인합니다.",
        holding_days="2-5 days",
    ),
]


def evaluate_all(ticker: str, data: pd.DataFrame) -> list[StrategySignal]:
    return [strategy.evaluate(ticker, data) for strategy in STRATEGIES]


def get_strategy(key: str) -> Strategy:
    for strategy in STRATEGIES:
        if strategy.key == key:
            return strategy
    return STRATEGIES[0]
