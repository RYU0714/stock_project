# Stock Project

US stock analysis dashboard for short-term, high-volatility intraday, and swing strategy research.

## Features

- Yahoo Finance OHLCV chart data
- TradingView-style candlestick chart with moving averages and volume
- Strategy signal groups:
  - High-volatility intraday RSI divergence
  - Short-term signals with VWAP and volume confirmation
  - Swing signals with holding-period optimization
- Practical backtest metrics:
  - win rate
  - profit factor
  - expectancy
  - max drawdown
  - recent simulated trades
- Korean UI for local users

## Tech Stack

```text
frontend: Next.js, React, TypeScript
charts: lightweight-charts
backend prototype: FastAPI, Python
data source: Yahoo Finance
```

## Project Structure

```text
frontend/
  src/app/
  src/components/
  src/lib/
  src/types/

backend/
  app/api/routes/
  app/schemas/
  app/services/
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Run Backend Prototype

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Important

This project is a research and analysis tool, not financial advice. Backtest results can differ from real trading because of data delays, spreads, slippage, liquidity, and execution risk.
