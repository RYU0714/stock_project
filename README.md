# 미국 주식 단기 분석 웹사이트 MVP

1일에서 5일 정도 보유하는 미국 주식 단타/스윙 후보를 찾기 위한 분석 대시보드입니다. 이 MVP는 초보 개발자가 전체 구조를 이해하고 바로 확장할 수 있도록 Next.js 프론트엔드와 FastAPI 백엔드를 분리했습니다.

## 핵심 기능

- 종목 티커 검색
- 캔들 데이터 조회
- 이동평균, RSI, ATR 계산
- 단기 전략 신호 계산
- 전략별 점수, 진입가, 손절가, 목표가, 손익비 제공
- 간단한 백테스트 결과 제공
- 외부 데이터 연결 전에도 동작하는 샘플 데이터 fallback

## 기술 스택

```text
frontend: Next.js, React, TypeScript
backend: FastAPI, Python
analysis: pandas, yfinance optional
database: PostgreSQL 예정
cache: Redis 예정
```

## 폴더 구조

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
  app/services/strategies/
```

## 실행 방법

### 백엔드

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속합니다.

## API

```text
GET /api/stocks/{ticker}/summary
GET /api/stocks/{ticker}/chart
GET /api/strategies
GET /api/strategies/{ticker}/signals
GET /api/backtest/{ticker}?strategy=pullback&period=1y
GET /api/market/regime
```

## 전략

이 MVP에는 아래 전략 구조가 들어 있습니다.

- 추세 눌림목 전략
- 단기 과매도 반등 전략
- 실적 발표 후 드리프트 전략 placeholder
- 갭 상승 후 종가 강도 전략 placeholder
- 돌파 후 되돌림 전략 placeholder

실제 매매 추천 서비스가 아니라, 조건 기반 후보를 보여주는 분석 도구입니다. 모든 결과에는 손절가, 목표가, 손익비, 전략 점수, 백테스트 지표를 함께 표시해야 합니다.

## 주의

이 프로젝트는 투자 조언이 아닙니다. 실거래 전에는 반드시 충분한 백테스트, 모의투자, 수수료/슬리피지 반영, 리스크 검증이 필요합니다.
