import pandas as pd

from app.schemas.strategy import StrategySignal
from app.services.risk import build_trade_plan
from app.services.strategies.base import Strategy


class PullbackStrategy(Strategy):
    def __init__(self) -> None:
        super().__init__(
            key="pullback",
            name="추세 눌림목",
            description="상승 추세 종목이 짧게 눌린 뒤 다시 반등하는 구간을 찾습니다.",
            holding_days="1-5 days",
        )

    def evaluate(self, ticker: str, data: pd.DataFrame) -> StrategySignal:
        latest = data.iloc[-1]
        previous = data.iloc[-2]
        score = 0
        reasons: list[str] = []

        if latest["close"] > latest["ma20"] > latest["ma50"]:
            score += 30
            reasons.append("20일선과 50일선 위에서 상승 추세 유지")
        if 40 <= latest["rsi14"] <= 60:
            score += 20
            reasons.append("RSI가 과열을 식힌 중립 구간")
        if latest["close"] > previous["high"]:
            score += 20
            reasons.append("전일 고가 돌파로 단기 반등 확인")
        if latest["volume"] > latest["avg_volume20"]:
            score += 15
            reasons.append("거래량이 20일 평균 이상")
        if latest["close"] >= latest["high20"] * 0.96:
            score += 15
            reasons.append("20일 고점권 근처에서 상대 강도 양호")

        status = "entry_watch" if score >= 70 else "watch" if score >= 50 else "avoid"
        entry = round(float(latest["close"]), 2) if score >= 50 else None
        stop_loss = take_profit = risk_reward = None
        if entry:
            stop_loss, take_profit, risk_reward = build_trade_plan(entry, float(latest["atr14"]))

        return StrategySignal(
            strategy=self.key,
            status=status,
            score=min(score, 100),
            entry_price=entry,
            stop_loss=stop_loss,
            take_profit=take_profit,
            risk_reward=risk_reward,
            holding_days=self.holding_days,
            reasons=reasons or ["조건 부족"],
        )
