from fastapi import APIRouter

from app.schemas.strategy import StrategyInfo, StrategySignalResponse
from app.services.indicators import add_indicators
from app.services.market_data import get_price_history
from app.services.strategies.engine import STRATEGIES, evaluate_all

router = APIRouter()


@router.get("", response_model=list[StrategyInfo])
def list_strategies() -> list[StrategyInfo]:
    return [
        StrategyInfo(
            key=strategy.key,
            name=strategy.name,
            description=strategy.description,
            holding_days=strategy.holding_days,
        )
        for strategy in STRATEGIES
    ]


@router.get("/{ticker}/signals", response_model=StrategySignalResponse)
def get_strategy_signals(ticker: str) -> StrategySignalResponse:
    data = add_indicators(get_price_history(ticker.upper()))
    signals = evaluate_all(ticker.upper(), data)
    return StrategySignalResponse(ticker=ticker.upper(), signals=signals)
