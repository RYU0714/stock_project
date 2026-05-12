from fastapi import APIRouter

from app.schemas.backtest import BacktestResponse
from app.services.backtest import run_backtest
from app.services.indicators import add_indicators
from app.services.market_data import get_price_history

router = APIRouter()


@router.get("/{ticker}", response_model=BacktestResponse)
def get_backtest(ticker: str, strategy: str = "pullback", period: str = "1y") -> BacktestResponse:
    data = add_indicators(get_price_history(ticker.upper(), period=period))
    return run_backtest(ticker.upper(), strategy, data)
