from fastapi import APIRouter

from app.schemas.market import MarketRegime

router = APIRouter()


@router.get("/regime", response_model=MarketRegime)
def get_market_regime() -> MarketRegime:
    return MarketRegime(
        regime="neutral",
        spy_trend="unknown",
        qqq_trend="unknown",
        vix_level="unknown",
        recommendation="Use smaller position sizes until live market data is connected.",
    )
