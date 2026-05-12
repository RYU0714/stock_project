from datetime import datetime, timedelta

import numpy as np
import pandas as pd


def get_price_history(ticker: str, period: str = "6mo") -> pd.DataFrame:
    try:
        import yfinance as yf

        history = yf.download(ticker, period=period, interval="1d", progress=False, auto_adjust=False)
        if not history.empty:
            if isinstance(history.columns, pd.MultiIndex):
                history.columns = history.columns.get_level_values(0)
            history = history.reset_index()
            history.columns = [str(col).lower().replace(" ", "_") for col in history.columns]
            return history.rename(columns={"date": "date"})[["date", "open", "high", "low", "close", "volume"]]
    except Exception:
        pass

    return _sample_history(ticker)


def _sample_history(ticker: str, days: int = 140) -> pd.DataFrame:
    seed = sum(ord(char) for char in ticker)
    rng = np.random.default_rng(seed)
    end = datetime.now().date()
    dates = [end - timedelta(days=index) for index in range(days * 2)]
    weekdays = sorted([date for date in dates if date.weekday() < 5])[-days:]

    base = 120 + (seed % 80)
    returns = rng.normal(0.001, 0.018, len(weekdays))
    close = base * np.cumprod(1 + returns)
    open_ = close * (1 + rng.normal(0, 0.006, len(weekdays)))
    high = np.maximum(open_, close) * (1 + rng.uniform(0.003, 0.025, len(weekdays)))
    low = np.minimum(open_, close) * (1 - rng.uniform(0.003, 0.025, len(weekdays)))
    volume = rng.integers(8_000_000, 80_000_000, len(weekdays))

    return pd.DataFrame(
        {
            "date": pd.to_datetime(weekdays),
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
        }
    )
