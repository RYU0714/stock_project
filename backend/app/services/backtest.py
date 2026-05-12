import pandas as pd

from app.schemas.backtest import BacktestResponse, BacktestTrade
from app.services.strategies.engine import get_strategy


def run_backtest(ticker: str, strategy_key: str, data: pd.DataFrame) -> BacktestResponse:
    strategy = get_strategy(strategy_key)
    trades: list[BacktestTrade] = []

    for index in range(60, len(data) - 5):
        window = data.iloc[: index + 1]
        signal = strategy.evaluate(ticker, window)
        if signal.status != "entry_watch" or signal.entry_price is None:
            continue

        entry_row = data.iloc[index + 1]
        exit_row = data.iloc[min(index + 4, len(data) - 1)]
        entry_price = float(entry_row["open"])
        exit_price = float(exit_row["close"])

        if signal.stop_loss and data.iloc[index + 1 : index + 5]["low"].min() <= signal.stop_loss:
            exit_price = signal.stop_loss
        elif signal.take_profit and data.iloc[index + 1 : index + 5]["high"].max() >= signal.take_profit:
            exit_price = signal.take_profit

        return_percent = ((exit_price - entry_price) / entry_price) * 100
        trades.append(
            BacktestTrade(
                entry_date=entry_row["date"].strftime("%Y-%m-%d"),
                exit_date=exit_row["date"].strftime("%Y-%m-%d"),
                entry_price=round(entry_price, 2),
                exit_price=round(exit_price, 2),
                return_percent=round(return_percent, 2),
                result="win" if return_percent > 0 else "loss",
            )
        )

    wins = [trade.return_percent for trade in trades if trade.return_percent > 0]
    losses = [trade.return_percent for trade in trades if trade.return_percent <= 0]
    win_rate = (len(wins) / len(trades) * 100) if trades else 0
    average_return = sum(wins) / len(wins) if wins else 0
    average_loss = sum(losses) / len(losses) if losses else 0
    expectancy = ((win_rate / 100) * average_return) + (((100 - win_rate) / 100) * average_loss)

    equity = 100.0
    peak = equity
    max_drawdown = 0.0
    for trade in trades:
        equity *= 1 + trade.return_percent / 100
        peak = max(peak, equity)
        max_drawdown = min(max_drawdown, ((equity - peak) / peak) * 100)

    return BacktestResponse(
        ticker=ticker,
        strategy=strategy.key,
        win_rate=round(win_rate, 2),
        average_return=round(average_return, 2),
        average_loss=round(average_loss, 2),
        expectancy=round(expectancy, 2),
        max_drawdown=round(max_drawdown, 2),
        trade_count=len(trades),
        trades=trades[-20:],
    )
