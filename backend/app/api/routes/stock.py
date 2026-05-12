from fastapi import APIRouter

from app.schemas.stock import ChartResponse, StockSummary
from app.services.indicators import add_indicators
from app.services.market_data import get_price_history

router = APIRouter()


@router.get("/{ticker}/summary", response_model=StockSummary)
def get_stock_summary(ticker: str) -> StockSummary:
    data = add_indicators(get_price_history(ticker.upper()))
    latest = data.iloc[-1]
    previous = data.iloc[-2]
    change = float(latest["close"] - previous["close"])
    change_percent = float((change / previous["close"]) * 100)

    return StockSummary(
        ticker=ticker.upper(),
        name=f"{ticker.upper()} Corporation",
        price=round(float(latest["close"]), 2),
        change=round(change, 2),
        change_percent=round(change_percent, 2),
        sector="Technology",
        market_cap="N/A",
        description="Demo summary. Connect FMP or another fundamentals API for production data.",
    )


@router.get("/{ticker}/chart", response_model=ChartResponse)
def get_stock_chart(ticker: str, period: str = "6mo") -> ChartResponse:
    data = add_indicators(get_price_history(ticker.upper(), period=period))
    candles = [
        {
            "time": row.date.strftime("%Y-%m-%d"),
            "open": round(float(row.open), 2),
            "high": round(float(row.high), 2),
            "low": round(float(row.low), 2),
            "close": round(float(row.close), 2),
            "volume": int(row.volume),
            "ma20": None if row.ma20 != row.ma20 else round(float(row.ma20), 2),
            "ma50": None if row.ma50 != row.ma50 else round(float(row.ma50), 2),
            "rsi14": None if row.rsi14 != row.rsi14 else round(float(row.rsi14), 2),
            "atr14": None if row.atr14 != row.atr14 else round(float(row.atr14), 2),
        }
        for row in data.itertuples()
    ]

    return ChartResponse(ticker=ticker.upper(), candles=candles)
