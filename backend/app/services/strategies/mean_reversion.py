import pandas as pd

from app.schemas.strategy import StrategySignal
from app.services.risk import build_trade_plan
from app.services.strategies.base import Strategy


class MeanReversionStrategy(Strategy):
    def __init__(self) -> None:
        super().__init__(
            key="mean_reversion",
            name="단기 과매도 반등",
            description="상위 추세가 살아 있는 종목의 단기 과매도 반등을 찾습니다.",
            holding_days="1-3 days",
        )

    def evaluate(self, ticker: str, data: pd.DataFrame) -> StrategySignal:
        latest = data.iloc[-1]
        previous = data.iloc[-2]
        score = 0
        reasons: list[str] = []
        daily_change = ((latest["close"] - previous["close"]) / previous["close"]) * 100

        if latest["close"] > latest["ma50"]:
            score += 25
            reasons.append("50일선 위에서 중기 추세 유지")
        if latest["close"] < latest["ma20"]:
            score += 20
            reasons.append("20일선 아래로 단기 눌림 발생")
        if latest["rsi2"] <= 15:
            score += 25
            reasons.append("RSI2 기준 단기 과매도")
        if daily_change <= -2:
            score += 15
            reasons.append("하루 하락폭이 커서 반등 후보")
        if latest["volume"] >= latest["avg_volume20"]:
            score += 15
            reasons.append("거래량이 동반되어 관심도 증가")

        status = "entry_watch" if score >= 70 else "watch" if score >= 50 else "avoid"
        entry = round(float(latest["close"]), 2) if score >= 50 else None
        stop_loss = take_profit = risk_reward = None
        if entry:
            stop_loss, take_profit, risk_reward = build_trade_plan(entry, float(latest["atr14"]), 1.4)

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
