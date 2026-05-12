import pandas as pd
import numpy as np


def add_indicators(data: pd.DataFrame) -> pd.DataFrame:
    frame = data.copy()
    frame["ma5"] = frame["close"].rolling(5).mean()
    frame["ma10"] = frame["close"].rolling(10).mean()
    frame["ma20"] = frame["close"].rolling(20).mean()
    frame["ma50"] = frame["close"].rolling(50).mean()
    frame["rsi2"] = _rsi(frame["close"], 2)
    frame["rsi14"] = _rsi(frame["close"], 14)
    frame["atr14"] = _atr(frame, 14)
    frame["avg_volume20"] = frame["volume"].rolling(20).mean()
    frame["high20"] = frame["high"].rolling(20).max()
    frame["low20"] = frame["low"].rolling(20).min()
    return frame


def _rsi(series: pd.Series, period: int) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _atr(frame: pd.DataFrame, period: int) -> pd.Series:
    high_low = frame["high"] - frame["low"]
    high_close = (frame["high"] - frame["close"].shift()).abs()
    low_close = (frame["low"] - frame["close"].shift()).abs()
    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    return true_range.rolling(period).mean()
