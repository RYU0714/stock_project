# 미국 주식 단타/스윙 분석 웹사이트

미국 주식의 단타, 고변동 단타, 스윙 전략을 분석하기 위한 웹 대시보드입니다. Yahoo Finance 가격 데이터를 기반으로 차트, 전략 신호, 백테스트, 최근 가상 매매 결과를 확인할 수 있습니다.

## 주요 기능

- Yahoo Finance 기반 OHLCV 가격 데이터 조회
- TradingView 스타일 캔들 차트
- 이동평균선, 거래량, RSI, ATR 등 주요 지표 계산
- 전략 신호 3분류 제공
  - 고변동 단타 전략 신호
  - 단기 전략 신호
  - 스윙 전략 신호
- 5분봉 VWAP 및 거래량 급증 확인
- 고변동 종목용 RSI 다이버전스 단타 전략
- 스윙 전략 보유기간 최적화
- 실전형 백테스트 지표 제공
  - 승률
  - Profit Factor
  - 기대값
  - 최대 낙폭
  - 최근 가상 매매 내역

## 전략 구성

### 고변동 단타 전략 신호

급등주나 변동성이 큰 종목을 대상으로 하는 단타 신호입니다.

- 1시간봉 기준
- ATR/가격 1.2% 이상 변동성 필터
- RSI 다이버전스 확인
- 최대 보유 12시간

### 단기 전략 신호

1~3일 보유를 기준으로 하는 단기 매매 후보 신호입니다.

- 과매도 반등
- Connors RSI(2)
- 갭 상승 종가 강도
- 5분봉 VWAP 및 거래량 급증 확인

### 스윙 전략 신호

며칠 이상 보유하는 스윙 매매 후보 신호입니다.

- 추세 눌림목
- Minervini 추세 템플릿
- Darvas 박스 돌파
- Raschke Holy Grail
- 5일, 8일, 10일, 15일, 20일 보유기간 비교

## 기술 스택

```text
프론트엔드: Next.js, React, TypeScript
차트: lightweight-charts
백엔드 프로토타입: FastAPI, Python
데이터 소스: Yahoo Finance
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
```

## 프론트엔드 실행 방법

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:3000
```

다른 포트로 실행하고 싶다면 예를 들어 다음처럼 실행할 수 있습니다.

```bash
npm run dev -- --port 3015
```

## 백엔드 프로토타입 실행 방법

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

현재 프론트엔드의 주요 기능은 Next.js API 라우트와 Yahoo Finance 데이터를 기반으로 동작합니다.

## 다른 컴퓨터에서 실행하는 방법

```bash
git clone https://github.com/RYU0714/stock_project.git
cd stock_project/frontend
npm install
npm run dev
```

`node_modules`, `.next`, `.env`, 로그 파일은 GitHub에 올리지 않습니다. 이 파일들은 실행 환경에서 자동 생성되거나 보안상 제외해야 하는 파일입니다.

## 주의사항

이 프로젝트는 투자 조언이나 자동 매수/매도 시스템이 아닙니다. 백테스트 결과는 실제 거래 결과와 다를 수 있습니다. 실제 매매 전에는 데이터 지연, 호가 스프레드, 슬리피지, 거래량, 뉴스 리스크, 계좌 규정 등을 반드시 확인해야 합니다.
