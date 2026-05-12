import math


def build_trade_plan(entry: float, atr: float, reward_multiple: float = 1.7) -> tuple[float, float, float]:
    safe_atr = atr if math.isfinite(atr) and atr > 0 else entry * 0.02
    risk = max(safe_atr, entry * 0.02)
    stop_loss = entry - risk
    take_profit = entry + (risk * reward_multiple)
    risk_reward = (take_profit - entry) / (entry - stop_loss)
    return round(stop_loss, 2), round(take_profit, 2), round(risk_reward, 2)
