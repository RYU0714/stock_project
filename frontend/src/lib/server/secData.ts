import type { AnalystRecommendationTrend, CompanyAnalystData, CompanyAnnualFinancial, CompanyFiling, CompanyInfo, CompanyMarketData, CompanyMetrics, CompanyQuarterlyFinancial } from "@/types/stock";

type SecTickerItem = {
  cik_str: number;
  ticker: string;
  title: string;
};

type SecSubmissions = {
  cik: string;
  name: string;
  sic?: string;
  sicDescription?: string;
  fiscalYearEnd?: string;
  tickers?: string[];
  exchanges?: string[];
  addresses?: {
    mailing?: SecAddress;
    business?: SecAddress;
  };
  filings?: {
    recent?: {
      accessionNumber?: string[];
      filingDate?: string[];
      reportDate?: string[];
      form?: string[];
      primaryDocument?: string[];
    };
  };
};

type SecAddress = {
  street1?: string;
  street2?: string;
  city?: string;
  stateOrCountry?: string;
  zipCode?: string;
};

type SecFact = {
  val: number;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
  start?: string;
  end?: string;
  frame?: string;
  qtrs?: number;
};

type SecCompanyFacts = {
  entityName: string;
  facts?: {
    "us-gaap"?: Record<string, { units?: Record<string, SecFact[]> }>;
    dei?: Record<string, { units?: Record<string, SecFact[]> }>;
  };
};

type YahooRawValue = {
  raw?: number | string;
  fmt?: string;
};

type YahooQuoteSummary = {
  quoteSummary?: {
    result?: Array<{
      price?: Record<string, YahooRawValue>;
      assetProfile?: YahooProfile;
      summaryProfile?: YahooProfile;
      summaryDetail?: Record<string, YahooRawValue>;
      defaultKeyStatistics?: Record<string, YahooRawValue>;
      financialData?: Record<string, YahooRawValue>;
    }>;
  };
};

type YahooProfile = Record<string, YahooRawValue | string | number | undefined>;

type YahooQuoteResponse = {
  quoteResponse?: {
    result?: Array<Record<string, number | string>>;
  };
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
};

type FinnhubProfile = {
  country?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  ipo?: string;
  logo?: string;
  marketCapitalization?: number;
  shareOutstanding?: number;
  weburl?: string;
};

type FinnhubMetricResponse = {
  metric?: {
    peTTM?: number;
    pbQuarterly?: number;
    pbAnnual?: number;
  };
};

type FinnhubRecommendationTrend = {
  period?: string;
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
};

const SEC_USER_AGENT = process.env.SEC_USER_AGENT ?? "stock_project/1.0 RYU0714 contact@example.com";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

const FINANCIAL_TAGS = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"],
  grossProfit: ["GrossProfit"],
  operatingIncome: ["OperatingIncomeLoss"],
  netIncome: ["NetIncomeLoss", "ProfitLoss"],
  epsDiluted: ["EarningsPerShareDiluted"],
  assets: ["Assets"],
  liabilities: ["Liabilities"],
  equity: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
  longTermDebt: ["LongTermDebtNoncurrent", "LongTermDebtAndFinanceLeaseObligationsNoncurrent", "LongTermDebt"],
  operatingCashFlow: ["NetCashProvidedByUsedInOperatingActivities"],
  capitalExpenditures: ["PaymentsToAcquirePropertyPlantAndEquipment"],
};

export async function getCompanyInfo(ticker: string): Promise<CompanyInfo> {
  const symbol = cleanTicker(ticker);
  const lookup = await findTicker(symbol);
  const cik = String(lookup.cik_str).padStart(10, "0");
  const [submissions, facts, marketData, recommendationTrends] = await Promise.all([fetchSecJson<SecSubmissions>(`https://data.sec.gov/submissions/CIK${cik}.json`), fetchSecJson<SecCompanyFacts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`), fetchCompanyMarketData(symbol), fetchFinnhubRecommendationTrends(symbol)]);
  const annualFinancials = buildAnnualFinancials(facts).slice(0, 5);
  const quarterlyFinancials = buildQuarterlyFinancials(facts, annualFinancials).slice(0, 12);
  const completedMarketData = completeMarketData(marketData, facts, annualFinancials);

  return {
    ticker: symbol,
    cik,
    name: submissions.name || lookup.title,
    sic: submissions.sic ?? null,
    industry: submissions.sicDescription ?? null,
    fiscalYearEnd: submissions.fiscalYearEnd ?? null,
    tickers: submissions.tickers ?? [symbol],
    exchanges: submissions.exchanges ?? [],
    mailingAddress: formatAddress(submissions.addresses?.mailing),
    businessAddress: formatAddress(submissions.addresses?.business),
    recentFilings: buildRecentFilings(cik, submissions).slice(0, 8),
    annualFinancials,
    quarterlyFinancials,
    metrics: buildMetrics(annualFinancials),
    marketData: completedMarketData,
    analystData: buildAnalystData(completedMarketData, recommendationTrends),
    source: "sec",
  };
}

function completeMarketData(marketData: CompanyMarketData | null, facts: SecCompanyFacts, annualFinancials: CompanyAnnualFinancial[]): CompanyMarketData | null {
  const price = marketData?.price ?? null;
  const sharesOutstanding = marketData?.sharesOutstanding ?? latestSharesOutstanding(facts);
  const latest = annualFinancials[0];
  const marketCap = marketData?.marketCap ?? (price !== null && sharesOutstanding !== null ? price * sharesOutstanding : null);
  const trailingPe = marketData?.trailingPe ?? (price !== null && latest?.epsDiluted ? price / latest.epsDiluted : null);
  const priceToBook = marketData?.priceToBook ?? (marketCap !== null && latest?.equity ? marketCap / latest.equity : null);

  if (!marketData && price === null && sharesOutstanding === null) return null;

  return {
    price,
    change: marketData?.change ?? null,
    changePercent: marketData?.changePercent ?? null,
    previousClose: marketData?.previousClose ?? null,
    open: marketData?.open ?? null,
    dayHigh: marketData?.dayHigh ?? null,
    dayLow: marketData?.dayLow ?? null,
    volume: marketData?.volume ?? null,
    marketCap,
    trailingPe,
    forwardPe: marketData?.forwardPe ?? null,
    priceToBook,
    dividendYieldPercent: marketData?.dividendYieldPercent ?? null,
    beta: marketData?.beta ?? null,
    fiftyTwoWeekHigh: marketData?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: marketData?.fiftyTwoWeekLow ?? null,
    averageVolume: marketData?.averageVolume ?? null,
    sharesOutstanding,
    targetMeanPrice: marketData?.targetMeanPrice ?? null,
    targetHighPrice: marketData?.targetHighPrice ?? null,
    targetLowPrice: marketData?.targetLowPrice ?? null,
    targetMedianPrice: marketData?.targetMedianPrice ?? null,
    analystCount: marketData?.analystCount ?? null,
    recommendation: marketData?.recommendation ?? null,
    sector: marketData?.sector ?? null,
    industry: marketData?.industry ?? null,
    country: marketData?.country ?? null,
    currency: marketData?.currency ?? null,
    ipo: marketData?.ipo ?? null,
    logo: marketData?.logo ?? null,
    website: marketData?.website ?? null,
    employees: marketData?.employees ?? null,
    summary: marketData?.summary ?? null,
  };
}

async function fetchCompanyMarketData(symbol: string): Promise<CompanyMarketData | null> {
  const [yahoo, finnhub] = await Promise.all([fetchYahooCompanySnapshot(symbol), fetchFinnhubCompanySnapshot(symbol)]);
  if (!yahoo && !finnhub) return null;
  return mergeMarketData(yahoo, finnhub);
}

function mergeMarketData(yahoo: CompanyMarketData | null, finnhub: CompanyMarketData | null): CompanyMarketData {
  return {
    price: finnhub?.price ?? yahoo?.price ?? null,
    change: finnhub?.change ?? yahoo?.change ?? null,
    changePercent: finnhub?.changePercent ?? yahoo?.changePercent ?? null,
    previousClose: finnhub?.previousClose ?? yahoo?.previousClose ?? null,
    open: finnhub?.open ?? yahoo?.open ?? null,
    dayHigh: finnhub?.dayHigh ?? yahoo?.dayHigh ?? null,
    dayLow: finnhub?.dayLow ?? yahoo?.dayLow ?? null,
    volume: yahoo?.volume ?? finnhub?.volume ?? null,
    marketCap: finnhub?.marketCap ?? yahoo?.marketCap ?? null,
    trailingPe: finnhub?.trailingPe ?? yahoo?.trailingPe ?? null,
    forwardPe: yahoo?.forwardPe ?? null,
    priceToBook: finnhub?.priceToBook ?? yahoo?.priceToBook ?? null,
    dividendYieldPercent: yahoo?.dividendYieldPercent ?? null,
    beta: yahoo?.beta ?? null,
    fiftyTwoWeekHigh: yahoo?.fiftyTwoWeekHigh ?? finnhub?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: yahoo?.fiftyTwoWeekLow ?? finnhub?.fiftyTwoWeekLow ?? null,
    averageVolume: yahoo?.averageVolume ?? null,
    sharesOutstanding: finnhub?.sharesOutstanding ?? yahoo?.sharesOutstanding ?? null,
    targetMeanPrice: yahoo?.targetMeanPrice ?? null,
    targetHighPrice: yahoo?.targetHighPrice ?? null,
    targetLowPrice: yahoo?.targetLowPrice ?? null,
    targetMedianPrice: yahoo?.targetMedianPrice ?? null,
    analystCount: yahoo?.analystCount ?? null,
    recommendation: yahoo?.recommendation ?? null,
    sector: yahoo?.sector ?? null,
    industry: yahoo?.industry ?? finnhub?.industry ?? null,
    country: finnhub?.country ?? yahoo?.country ?? null,
    currency: finnhub?.currency ?? yahoo?.currency ?? null,
    ipo: finnhub?.ipo ?? yahoo?.ipo ?? null,
    logo: finnhub?.logo ?? yahoo?.logo ?? null,
    website: yahoo?.website ?? finnhub?.website ?? null,
    employees: yahoo?.employees ?? null,
    summary: yahoo?.summary ?? null,
  };
}

async function fetchYahooCompanySnapshot(symbol: string): Promise<CompanyMarketData | null> {
  const modules = ["price", "assetProfile", "summaryProfile", "summaryDetail", "defaultKeyStatistics", "financialData"].join(",");
  try {
    const data = await fetchYahooQuoteSummary(symbol, modules);
    if (!data) return fetchYahooChartMarket(symbol);
    const result = data.quoteSummary?.result?.[0];
    if (!result) return null;
    const price = result.price ?? {};
    const profile = result.assetProfile ?? result.summaryProfile ?? {};
    const detail = result.summaryDetail ?? {};
    const stats = result.defaultKeyStatistics ?? {};
    const financial = result.financialData ?? {};

    const fallback = await fetchYahooQuote(symbol);
    return {
      price: readNumber(price.regularMarketPrice),
      change: readNumber(price.regularMarketChange),
      changePercent: readNumber(price.regularMarketChangePercent),
      previousClose: readNumber(price.regularMarketPreviousClose) ?? fallback?.previousClose ?? null,
      open: readNumber(price.regularMarketOpen) ?? fallback?.open ?? null,
      dayHigh: readNumber(price.regularMarketDayHigh) ?? fallback?.dayHigh ?? null,
      dayLow: readNumber(price.regularMarketDayLow) ?? fallback?.dayLow ?? null,
      volume: readNumber(price.regularMarketVolume) ?? fallback?.volume ?? null,
      marketCap: readNumber(price.marketCap) ?? fallback?.marketCap ?? null,
      trailingPe: readNumber(detail.trailingPE) ?? fallback?.trailingPe ?? null,
      forwardPe: readNumber(stats.forwardPE) ?? fallback?.forwardPe ?? null,
      priceToBook: readNumber(stats.priceToBook) ?? fallback?.priceToBook ?? null,
      dividendYieldPercent: percentFromRatio(readNumber(detail.dividendYield)),
      beta: readNumber(detail.beta) ?? fallback?.beta ?? null,
      fiftyTwoWeekHigh: readNumber(detail.fiftyTwoWeekHigh) ?? fallback?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: readNumber(detail.fiftyTwoWeekLow) ?? fallback?.fiftyTwoWeekLow ?? null,
      averageVolume: readNumber(detail.averageVolume) ?? fallback?.averageVolume ?? null,
      sharesOutstanding: fallback?.sharesOutstanding ?? null,
      targetMeanPrice: readNumber(financial.targetMeanPrice),
      targetHighPrice: readNumber(financial.targetHighPrice),
      targetLowPrice: readNumber(financial.targetLowPrice),
      targetMedianPrice: readNumber(financial.targetMedianPrice),
      analystCount: readNumber(financial.numberOfAnalystOpinions),
      recommendation: readText(financial.recommendationKey),
      sector: readYahooText(profile.sector),
      industry: readYahooText(profile.industry),
      country: null,
      currency: null,
      ipo: null,
      logo: null,
      website: readYahooText(profile.website),
      employees: readYahooNumber(profile.fullTimeEmployees),
      summary: readYahooText(profile.longBusinessSummary),
    };
  } catch {
    return fetchYahooQuote(symbol);
  }
}

async function fetchYahooQuoteSummary(symbol: string, modules: string): Promise<YahooQuoteSummary | null> {
  const encodedSymbol = encodeURIComponent(symbol);
  const browserHeaders = {
    "user-agent": "Mozilla/5.0",
  };
  const apiHeaders = {
    ...browserHeaders,
    accept: "application/json",
  };
  const basicUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodedSymbol}?modules=${modules}`;
  const basic = await fetch(basicUrl, { headers: apiHeaders, next: { revalidate: 60 * 15 } });
  if (basic.ok) return basic.json() as Promise<YahooQuoteSummary>;

  const cookieResponse = await fetch("https://fc.yahoo.com", {
    headers: browserHeaders,
    redirect: "manual",
    next: { revalidate: 60 * 15 },
  });
  const cookie = extractSetCookie(cookieResponse.headers.get("set-cookie"));
  if (!cookie) return null;

  const crumbResponse = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { ...browserHeaders, cookie },
    next: { revalidate: 60 * 15 },
  });
  if (!crumbResponse.ok) return null;
  const crumb = (await crumbResponse.text()).trim();
  if (!crumb || crumb.includes("<")) return null;

  const crumbUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodedSymbol}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
  const response = await fetch(crumbUrl, {
    headers: { ...apiHeaders, cookie },
    next: { revalidate: 60 * 15 },
  });
  if (!response.ok) return null;
  return response.json() as Promise<YahooQuoteSummary>;
}

async function fetchYahooQuote(symbol: string): Promise<CompanyMarketData | null> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0",
      },
      next: { revalidate: 60 * 5 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as YahooQuoteResponse;
    const quote = data.quoteResponse?.result?.[0];
    if (!quote) return null;
    return {
      price: valueFromRecord(quote, "regularMarketPrice"),
      change: valueFromRecord(quote, "regularMarketChange"),
      changePercent: valueFromRecord(quote, "regularMarketChangePercent"),
      previousClose: valueFromRecord(quote, "regularMarketPreviousClose"),
      open: valueFromRecord(quote, "regularMarketOpen"),
      dayHigh: valueFromRecord(quote, "regularMarketDayHigh"),
      dayLow: valueFromRecord(quote, "regularMarketDayLow"),
      volume: valueFromRecord(quote, "regularMarketVolume"),
      marketCap: valueFromRecord(quote, "marketCap"),
      trailingPe: valueFromRecord(quote, "trailingPE"),
      forwardPe: valueFromRecord(quote, "forwardPE"),
      priceToBook: valueFromRecord(quote, "priceToBook"),
      dividendYieldPercent: valueFromRecord(quote, "trailingAnnualDividendYield"),
      beta: valueFromRecord(quote, "beta"),
      fiftyTwoWeekHigh: valueFromRecord(quote, "fiftyTwoWeekHigh"),
      fiftyTwoWeekLow: valueFromRecord(quote, "fiftyTwoWeekLow"),
      averageVolume: valueFromRecord(quote, "averageDailyVolume3Month"),
      sharesOutstanding: valueFromRecord(quote, "sharesOutstanding"),
      targetMeanPrice: null,
      targetHighPrice: null,
      targetLowPrice: null,
      targetMedianPrice: null,
      analystCount: null,
      recommendation: null,
      sector: null,
      industry: null,
      country: null,
      currency: null,
      ipo: null,
      logo: null,
      website: null,
      employees: null,
      summary: null,
    };
  } catch {
    return fetchYahooChartMarket(symbol);
  }
}

async function fetchYahooChartMarket(symbol: string): Promise<CompanyMarketData | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&includePrePost=false`;
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0",
      },
      next: { revalidate: 60 * 5 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as YahooChartResponse;
    const result = data.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const closes = (quote?.close ?? []).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const highs = (quote?.high ?? []).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const lows = (quote?.low ?? []).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const volumes = (quote?.volume ?? []).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const price = result?.meta?.regularMarketPrice ?? closes.at(-1) ?? null;
    const previousClose = result?.meta?.previousClose ?? closes.at(-2) ?? null;
    const open = quote?.open?.findLast((value): value is number => typeof value === "number" && Number.isFinite(value)) ?? null;
    const dayHigh = highs.at(-1) ?? null;
    const dayLow = lows.at(-1) ?? null;
    const volume = volumes.at(-1) ?? null;
    const change = price !== null && previousClose !== null ? price - previousClose : null;
    const changePercent = change !== null && previousClose ? (change / previousClose) * 100 : null;
    return {
      price,
      change,
      changePercent,
      previousClose,
      open,
      dayHigh,
      dayLow,
      volume,
      marketCap: null,
      trailingPe: null,
      forwardPe: null,
      priceToBook: null,
      dividendYieldPercent: null,
      beta: null,
      fiftyTwoWeekHigh: highs.length ? Math.max(...highs) : null,
      fiftyTwoWeekLow: lows.length ? Math.min(...lows) : null,
      averageVolume: volumes.length ? volumes.reduce((sum, value) => sum + value, 0) / volumes.length : null,
      sharesOutstanding: null,
      targetMeanPrice: null,
      targetHighPrice: null,
      targetLowPrice: null,
      targetMedianPrice: null,
      analystCount: null,
      recommendation: null,
      sector: null,
      industry: null,
      country: null,
      currency: null,
      ipo: null,
      logo: null,
      website: null,
      employees: null,
      summary: null,
    };
  } catch {
    return null;
  }
}

async function fetchFinnhubCompanySnapshot(symbol: string): Promise<CompanyMarketData | null> {
  if (!FINNHUB_API_KEY) return null;
  const token = encodeURIComponent(FINNHUB_API_KEY);
  const encodedSymbol = encodeURIComponent(symbol);
  const [quote, profile, metric] = await Promise.all([
    fetchFinnhubJson<FinnhubQuote>(`https://finnhub.io/api/v1/quote?symbol=${encodedSymbol}&token=${token}`),
    fetchFinnhubJson<FinnhubProfile>(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodedSymbol}&token=${token}`),
    fetchFinnhubJson<FinnhubMetricResponse>(`https://finnhub.io/api/v1/stock/metric?symbol=${encodedSymbol}&metric=all&token=${token}`),
  ]);
  const hasQuote = quote && (isFiniteNumber(quote.c) || isFiniteNumber(quote.pc));
  const hasProfile = profile && Object.keys(profile).length > 0;
  const hasMetric = metric?.metric && Object.keys(metric.metric).length > 0;
  if (!hasQuote && !hasProfile && !hasMetric) return null;

  return {
    price: finiteOrNull(quote?.c),
    change: finiteOrNull(quote?.d),
    changePercent: finiteOrNull(quote?.dp),
    previousClose: finiteOrNull(quote?.pc),
    open: finiteOrNull(quote?.o),
    dayHigh: finiteOrNull(quote?.h),
    dayLow: finiteOrNull(quote?.l),
    volume: null,
    marketCap: isFiniteNumber(profile?.marketCapitalization) ? profile.marketCapitalization * 1_000_000 : null,
    trailingPe: finiteOrNull(metric?.metric?.peTTM),
    forwardPe: null,
    priceToBook: finiteOrNull(metric?.metric?.pbQuarterly) ?? finiteOrNull(metric?.metric?.pbAnnual),
    dividendYieldPercent: null,
    beta: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    averageVolume: null,
    sharesOutstanding: isFiniteNumber(profile?.shareOutstanding) ? profile.shareOutstanding * 1_000_000 : null,
    targetMeanPrice: null,
    targetHighPrice: null,
    targetLowPrice: null,
    targetMedianPrice: null,
    analystCount: null,
    recommendation: null,
    sector: null,
    industry: profile?.finnhubIndustry ?? null,
    country: profile?.country ?? null,
    currency: profile?.currency ?? null,
    ipo: profile?.ipo ?? null,
    logo: profile?.logo ?? null,
    website: profile?.weburl ?? null,
    employees: null,
    summary: null,
  };
}

async function fetchFinnhubRecommendationTrends(symbol: string): Promise<AnalystRecommendationTrend[]> {
  if (!FINNHUB_API_KEY) return [];
  const token = encodeURIComponent(FINNHUB_API_KEY);
  const encodedSymbol = encodeURIComponent(symbol);
  const data = await fetchFinnhubJson<FinnhubRecommendationTrend[]>(`https://finnhub.io/api/v1/stock/recommendation?symbol=${encodedSymbol}&token=${token}`);
  if (!Array.isArray(data)) return [];
  return data.slice(0, 4).flatMap((item) => {
    if (!item.period) return [];
    return [{
      period: item.period,
      strongBuy: finiteCount(item.strongBuy),
      buy: finiteCount(item.buy),
      hold: finiteCount(item.hold),
      sell: finiteCount(item.sell),
      strongSell: finiteCount(item.strongSell),
    }];
  });
}

function buildAnalystData(marketData: CompanyMarketData | null, recommendationTrends: AnalystRecommendationTrend[]): CompanyAnalystData {
  const latest = recommendationTrends[0];
  const total = latest ? latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell : 0;
  const bullish = latest ? latest.strongBuy + latest.buy : 0;
  const bearish = latest ? latest.sell + latest.strongSell : 0;
  const hold = latest?.hold ?? 0;
  const upsidePercent = marketData?.targetMeanPrice && marketData?.price ? ((marketData.targetMeanPrice - marketData.price) / marketData.price) * 100 : null;
  let consensus = marketData?.recommendation ? translateRecommendation(marketData.recommendation) : "미확인";

  if (total > 0) {
    if (bullish / total >= 0.6) consensus = "매수 우위";
    else if (bearish / total >= 0.4) consensus = "매도 우위";
    else if (hold / total >= 0.5) consensus = "중립";
    else consensus = "혼조";
  }

  return {
    targetMeanPrice: marketData?.targetMeanPrice ?? null,
    targetHighPrice: marketData?.targetHighPrice ?? null,
    targetLowPrice: marketData?.targetLowPrice ?? null,
    targetMedianPrice: marketData?.targetMedianPrice ?? null,
    upsidePercent,
    analystCount: marketData?.analystCount ?? null,
    recommendation: marketData?.recommendation ?? null,
    consensus,
    recommendationTrends,
  };
}

async function fetchFinnhubJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 * 5 },
    });
    if (!response.ok) return null;
    return response.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function findTicker(symbol: string): Promise<SecTickerItem> {
  const data = await fetchSecJson<Record<string, SecTickerItem>>("https://www.sec.gov/files/company_tickers.json");
  const match = Object.values(data).find((item) => item.ticker.toUpperCase() === symbol);
  if (!match) throw new Error(`SEC ticker not found: ${symbol}`);
  return match;
}

async function fetchSecJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": SEC_USER_AGENT,
    },
    next: { revalidate: 60 * 60 * 6 },
  });
  if (!response.ok) throw new Error(`SEC request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function buildAnnualFinancials(facts: SecCompanyFacts): CompanyAnnualFinancial[] {
  const usGaap = facts.facts?.["us-gaap"] ?? {};
  const years = new Set<number>();
  const values: Record<keyof typeof FINANCIAL_TAGS, Map<number, SecFact>> = {
    revenue: collectFacts(usGaap, FINANCIAL_TAGS.revenue, "USD"),
    grossProfit: collectFacts(usGaap, FINANCIAL_TAGS.grossProfit, "USD"),
    operatingIncome: collectFacts(usGaap, FINANCIAL_TAGS.operatingIncome, "USD"),
    netIncome: collectFacts(usGaap, FINANCIAL_TAGS.netIncome, "USD"),
    epsDiluted: collectFacts(usGaap, FINANCIAL_TAGS.epsDiluted, "USD/shares"),
    assets: collectFacts(usGaap, FINANCIAL_TAGS.assets, "USD"),
    liabilities: collectFacts(usGaap, FINANCIAL_TAGS.liabilities, "USD"),
    equity: collectFacts(usGaap, FINANCIAL_TAGS.equity, "USD"),
    cash: collectFacts(usGaap, FINANCIAL_TAGS.cash, "USD"),
    longTermDebt: collectFacts(usGaap, FINANCIAL_TAGS.longTermDebt, "USD"),
    operatingCashFlow: collectFacts(usGaap, FINANCIAL_TAGS.operatingCashFlow, "USD"),
    capitalExpenditures: collectFacts(usGaap, FINANCIAL_TAGS.capitalExpenditures, "USD"),
  };

  Object.values(values).forEach((items) => items.forEach((_, year) => years.add(year)));

  return Array.from(years)
    .sort((a, b) => b - a)
    .map((year) => {
      const operatingCashFlow = valueOf(values.operatingCashFlow.get(year));
      const capitalExpenditures = valueOf(values.capitalExpenditures.get(year));
      return {
        fiscalYear: year,
        filed: latestFiled(values, year),
        form: "10-K",
        revenue: valueOf(values.revenue.get(year)),
        grossProfit: valueOf(values.grossProfit.get(year)),
        operatingIncome: valueOf(values.operatingIncome.get(year)),
        netIncome: valueOf(values.netIncome.get(year)),
        epsDiluted: valueOf(values.epsDiluted.get(year)),
        assets: valueOf(values.assets.get(year)),
        liabilities: valueOf(values.liabilities.get(year)),
        equity: valueOf(values.equity.get(year)),
        cash: valueOf(values.cash.get(year)),
        longTermDebt: valueOf(values.longTermDebt.get(year)),
        operatingCashFlow,
        capitalExpenditures,
        freeCashFlow: operatingCashFlow !== null && capitalExpenditures !== null ? operatingCashFlow - Math.abs(capitalExpenditures) : null,
      };
    })
    .filter((item) => item.revenue !== null || item.assets !== null || item.netIncome !== null);
}

function buildQuarterlyFinancials(facts: SecCompanyFacts, annualFinancials: CompanyAnnualFinancial[]): CompanyQuarterlyFinancial[] {
  const usGaap = facts.facts?.["us-gaap"] ?? {};
  const values: Record<keyof typeof FINANCIAL_TAGS, Map<string, SecFact>> = {
    revenue: collectQuarterFacts(usGaap, FINANCIAL_TAGS.revenue, "USD", "flow"),
    grossProfit: collectQuarterFacts(usGaap, FINANCIAL_TAGS.grossProfit, "USD", "flow"),
    operatingIncome: collectQuarterFacts(usGaap, FINANCIAL_TAGS.operatingIncome, "USD", "flow"),
    netIncome: collectQuarterFacts(usGaap, FINANCIAL_TAGS.netIncome, "USD", "flow"),
    epsDiluted: collectQuarterFacts(usGaap, FINANCIAL_TAGS.epsDiluted, "USD/shares", "flow"),
    assets: collectQuarterFacts(usGaap, FINANCIAL_TAGS.assets, "USD", "instant"),
    liabilities: collectQuarterFacts(usGaap, FINANCIAL_TAGS.liabilities, "USD", "instant"),
    equity: collectQuarterFacts(usGaap, FINANCIAL_TAGS.equity, "USD", "instant"),
    cash: collectQuarterFacts(usGaap, FINANCIAL_TAGS.cash, "USD", "instant"),
    longTermDebt: collectQuarterFacts(usGaap, FINANCIAL_TAGS.longTermDebt, "USD", "instant"),
    operatingCashFlow: collectQuarterFacts(usGaap, FINANCIAL_TAGS.operatingCashFlow, "USD", "flow"),
    capitalExpenditures: collectQuarterFacts(usGaap, FINANCIAL_TAGS.capitalExpenditures, "USD", "flow"),
  };
  const keys = new Set<string>();
  Object.values(values).forEach((items) => items.forEach((_, key) => keys.add(key)));

  const rows = Array.from(keys).map((key) => buildQuarterRow(key, values, false));
  const withFourthQuarters = [...rows, ...buildDerivedFourthQuarters(rows, annualFinancials)];

  return withFourthQuarters
    .filter((item) => item.revenue !== null || item.assets !== null || item.netIncome !== null)
    .sort((a, b) => b.fiscalYear - a.fiscalYear || quarterRank(b.fiscalPeriod) - quarterRank(a.fiscalPeriod));
}

function buildQuarterRow(key: string, values: Record<keyof typeof FINANCIAL_TAGS, Map<string, SecFact>>, derived: boolean): CompanyQuarterlyFinancial {
  const [yearText, fiscalPeriod] = key.split("-") as [string, CompanyQuarterlyFinancial["fiscalPeriod"]];
  const fiscalYear = Number(yearText);
  const operatingCashFlow = valueOf(values.operatingCashFlow.get(key));
  const capitalExpenditures = valueOf(values.capitalExpenditures.get(key));
  return {
    fiscalYear,
    fiscalPeriod,
    quarterLabel: `${fiscalYear} ${fiscalPeriod}`,
    filed: latestFiledForQuarter(values, key),
    form: derived ? "10-K derived" : "10-Q",
    revenue: valueOf(values.revenue.get(key)),
    grossProfit: valueOf(values.grossProfit.get(key)),
    operatingIncome: valueOf(values.operatingIncome.get(key)),
    netIncome: valueOf(values.netIncome.get(key)),
    epsDiluted: valueOf(values.epsDiluted.get(key)),
    assets: valueOf(values.assets.get(key)),
    liabilities: valueOf(values.liabilities.get(key)),
    equity: valueOf(values.equity.get(key)),
    cash: valueOf(values.cash.get(key)),
    longTermDebt: valueOf(values.longTermDebt.get(key)),
    operatingCashFlow,
    capitalExpenditures,
    freeCashFlow: operatingCashFlow !== null && capitalExpenditures !== null ? operatingCashFlow - Math.abs(capitalExpenditures) : null,
    derived,
  };
}

function collectQuarterFacts(usGaap: Record<string, { units?: Record<string, SecFact[]> }>, tags: string[], unit: string, kind: "flow" | "instant"): Map<string, SecFact> {
  const selected = new Map<string, SecFact>();
  for (const tag of tags) {
    const facts = usGaap[tag]?.units?.[unit] ?? [];
    if (kind === "flow") {
      const flowValues = deriveFlowQuarterFacts(facts);
      if (flowValues.size) return flowValues;
      continue;
    }
    for (const fact of facts) {
      if (!fact.fy || !isQuarter(fact.fp) || fact.form !== "10-Q" || !Number.isFinite(fact.val)) continue;
      const key = `${fact.fy}-${fact.fp}`;
      const current = selected.get(key);
      if (!current || (fact.filed ?? "") > (current.filed ?? "")) {
        selected.set(key, fact);
      }
    }
    if (selected.size) break;
  }
  return selected;
}

function deriveFlowQuarterFacts(facts: SecFact[]): Map<string, SecFact> {
  const byYear = new Map<number, Map<"Q1" | "Q2" | "Q3", SecFact>>();
  const selected = new Map<string, SecFact>();
  for (const fact of facts) {
    if (!fact.fy || !isQuarter(fact.fp) || fact.form !== "10-Q" || !Number.isFinite(fact.val)) continue;
    const key = `${fact.fy}-${fact.fp}`;
    if (isFramedQuarterFact(fact)) {
      const current = selected.get(key);
      if (!current || isBetterQuarterFact(fact, current)) {
        selected.set(key, fact);
      }
      continue;
    }
    const yearFacts = byYear.get(fact.fy) ?? new Map<"Q1" | "Q2" | "Q3", SecFact>();
    const current = yearFacts.get(fact.fp);
    if (!current || isBetterQuarterFact(fact, current)) {
      yearFacts.set(fact.fp, fact);
      byYear.set(fact.fy, yearFacts);
    }
  }

  for (const [year, yearFacts] of byYear) {
    const q1 = yearFacts.get("Q1");
    const q2 = yearFacts.get("Q2");
    const q3 = yearFacts.get("Q3");
    if (q1 && !selected.has(`${year}-Q1`)) selected.set(`${year}-Q1`, q1);
    if (q2 && !selected.has(`${year}-Q2`)) {
      if (q2.qtrs === 1) selected.set(`${year}-Q2`, q2);
      else if (q1) selected.set(`${year}-Q2`, { ...q2, val: q2.val - q1.val });
    }
    if (q3 && !selected.has(`${year}-Q3`)) {
      if (q3.qtrs === 1) selected.set(`${year}-Q3`, q3);
      else if (q2) selected.set(`${year}-Q3`, { ...q3, val: q3.val - q2.val });
    }
  }
  return selected;
}

function isFramedQuarterFact(fact: SecFact): boolean {
  if (!fact.frame || !/^CY\d{4}Q[1-4]$/.test(fact.frame)) return false;
  if (!fact.start || !fact.end) return true;
  const days = (Date.parse(`${fact.end}T00:00:00.000Z`) - Date.parse(`${fact.start}T00:00:00.000Z`)) / 86_400_000;
  return days >= 70 && days <= 115;
}

function isBetterQuarterFact(candidate: SecFact, current: SecFact): boolean {
  if (isFramedQuarterFact(candidate) && !isFramedQuarterFact(current)) return true;
  if (!isFramedQuarterFact(candidate) && isFramedQuarterFact(current)) return false;
  if ((candidate.end ?? "") !== (current.end ?? "")) return (candidate.end ?? "") > (current.end ?? "");
  return (candidate.filed ?? "") > (current.filed ?? "");
}

function buildDerivedFourthQuarters(rows: CompanyQuarterlyFinancial[], annualFinancials: CompanyAnnualFinancial[]): CompanyQuarterlyFinancial[] {
  return annualFinancials.flatMap((annual) => {
    const firstThree = rows.filter((item) => item.fiscalYear === annual.fiscalYear && item.fiscalPeriod !== "Q4");
    if (firstThree.length !== 3) return [];
    return [{
      fiscalYear: annual.fiscalYear,
      fiscalPeriod: "Q4" as const,
      quarterLabel: `${annual.fiscalYear} Q4`,
      filed: annual.filed,
      form: "10-K derived",
      revenue: subtractQuarterSum(annual.revenue, firstThree.map((item) => item.revenue)),
      grossProfit: subtractQuarterSum(annual.grossProfit, firstThree.map((item) => item.grossProfit)),
      operatingIncome: subtractQuarterSum(annual.operatingIncome, firstThree.map((item) => item.operatingIncome)),
      netIncome: subtractQuarterSum(annual.netIncome, firstThree.map((item) => item.netIncome)),
      epsDiluted: null,
      assets: annual.assets,
      liabilities: annual.liabilities,
      equity: annual.equity,
      cash: annual.cash,
      longTermDebt: annual.longTermDebt,
      operatingCashFlow: subtractQuarterSum(annual.operatingCashFlow, firstThree.map((item) => item.operatingCashFlow)),
      capitalExpenditures: subtractQuarterSum(annual.capitalExpenditures, firstThree.map((item) => item.capitalExpenditures)),
      freeCashFlow: subtractQuarterSum(annual.freeCashFlow, firstThree.map((item) => item.freeCashFlow)),
      derived: true,
    }];
  });
}

function collectFacts(usGaap: Record<string, { units?: Record<string, SecFact[]> }>, tags: string[], unit: string): Map<number, SecFact> {
  const selected = new Map<number, SecFact>();
  for (const tag of tags) {
    const facts = usGaap[tag]?.units?.[unit] ?? [];
    for (const fact of facts) {
      if (!fact.fy || fact.fp !== "FY" || fact.form !== "10-K" || !Number.isFinite(fact.val)) continue;
      const current = selected.get(fact.fy);
      if (!current || (fact.filed ?? "") > (current.filed ?? "")) {
        selected.set(fact.fy, fact);
      }
    }
    if (selected.size) break;
  }
  return selected;
}

function latestFiled(values: Record<keyof typeof FINANCIAL_TAGS, Map<number, SecFact>>, year: number): string {
  return Object.values(values)
    .map((items) => items.get(year)?.filed)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? "";
}

function latestFiledForQuarter(values: Record<keyof typeof FINANCIAL_TAGS, Map<string, SecFact>>, key: string): string {
  return Object.values(values)
    .map((items) => items.get(key)?.filed)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? "";
}

function isQuarter(value?: string): value is "Q1" | "Q2" | "Q3" {
  return value === "Q1" || value === "Q2" || value === "Q3";
}

function quarterRank(value: CompanyQuarterlyFinancial["fiscalPeriod"]): number {
  if (value === "Q4") return 4;
  if (value === "Q3") return 3;
  if (value === "Q2") return 2;
  return 1;
}

function subtractQuarterSum(annual: number | null, quarters: Array<number | null>): number | null {
  if (annual === null || quarters.some((value) => value === null)) return null;
  const values = quarters.filter((value): value is number => value !== null);
  return annual - values.reduce((sum, value) => sum + value, 0);
}

function buildMetrics(financials: CompanyAnnualFinancial[]): CompanyMetrics {
  const latest = financials[0];
  const previous = financials[1];
  return {
    revenueGrowthPercent: latest?.revenue && previous?.revenue ? ratio(latest.revenue - previous.revenue, previous.revenue) : null,
    netMarginPercent: latest?.netIncome && latest?.revenue ? ratio(latest.netIncome, latest.revenue) : null,
    operatingMarginPercent: latest?.operatingIncome && latest?.revenue ? ratio(latest.operatingIncome, latest.revenue) : null,
    debtToEquityPercent: latest?.liabilities && latest?.equity ? ratio(latest.liabilities, latest.equity) : null,
    freeCashFlowMarginPercent: latest?.freeCashFlow && latest?.revenue ? ratio(latest.freeCashFlow, latest.revenue) : null,
  };
}

function latestSharesOutstanding(facts: SecCompanyFacts): number | null {
  const factsList = facts.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares ?? [];
  const latest = factsList
    .filter((fact) => Number.isFinite(fact.val))
    .sort((a, b) => (b.end ?? "").localeCompare(a.end ?? "") || (b.filed ?? "").localeCompare(a.filed ?? ""))[0];
  return latest ? latest.val : null;
}

function buildRecentFilings(cik: string, submissions: SecSubmissions): CompanyFiling[] {
  const recent = submissions.filings?.recent;
  if (!recent?.form?.length) return [];
  return recent.form.flatMap((form, index) => {
    if (!["10-K", "10-Q", "8-K"].includes(form)) return [];
    const accessionNumber = recent.accessionNumber?.[index] ?? "";
    const primaryDocument = recent.primaryDocument?.[index] ?? "";
    const accessionPath = accessionNumber.replace(/-/g, "");
    return {
      form,
      filed: recent.filingDate?.[index] ?? "",
      reportDate: recent.reportDate?.[index] ?? "",
      accessionNumber,
      primaryDocument,
      url: accessionNumber && primaryDocument ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionPath}/${primaryDocument}` : "",
    };
  });
}

function formatAddress(address?: SecAddress): string | null {
  if (!address) return null;
  const parts = [address.street1, address.street2, address.city, address.stateOrCountry, address.zipCode].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function valueOf(fact?: SecFact): number | null {
  return fact && Number.isFinite(fact.val) ? fact.val : null;
}

function ratio(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function readNumber(value?: YahooRawValue): number | null {
  if (typeof value?.raw === "number" && Number.isFinite(value.raw)) return value.raw;
  return null;
}

function readText(value?: YahooRawValue): string | null {
  if (typeof value?.raw === "string") return value.raw;
  if (typeof value?.fmt === "string") return value.fmt;
  return null;
}

function readYahooNumber(value?: YahooRawValue | string | number): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && typeof value.raw === "number" && Number.isFinite(value.raw)) return value.raw;
  return null;
}

function readYahooText(value?: YahooRawValue | string | number): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "object" && value !== null) {
    if (typeof value.raw === "string") return value.raw;
    if (typeof value.fmt === "string") return value.fmt;
  }
  return null;
}

function valueFromRecord(record: Record<string, number | string>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractSetCookie(value: string | null): string | null {
  if (!value) return null;
  return value
    .split(/,(?=\s*[^;,=\s]+=[^;,]+)/)
    .map((item) => item.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ") || null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteOrNull(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function finiteCount(value: unknown): number {
  return isFiniteNumber(value) ? value : 0;
}

function translateRecommendation(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("strong") && normalized.includes("buy")) return "강한 매수";
  if (normalized.includes("buy")) return "매수";
  if (normalized.includes("hold")) return "중립";
  if (normalized.includes("sell")) return "매도";
  return value;
}

function percentFromRatio(value: number | null): number | null {
  return value === null ? null : Number((value * 100).toFixed(2));
}

function cleanTicker(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12) || "AAPL";
}
