from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import backtest, market, stock, strategy

app = FastAPI(
    title="US Stock Short-Term Analysis API",
    version="0.1.0",
    description="1-5 day US stock swing trading analysis MVP.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stock.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(strategy.router, prefix="/api/strategies", tags=["strategies"])
app.include_router(backtest.router, prefix="/api/backtest", tags=["backtest"])
app.include_router(market.router, prefix="/api/market", tags=["market"])


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
