import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Landmark, TrendingUp } from "lucide-react";
import { FinancialBarCharts } from "./FinancialBarCharts";
import { CompanySearch } from "./CompanySearch";
import { getCompanyInfo } from "@/lib/server/secData";
import type { CompanyInfo, CompanyMarketData, CompanyMetrics, CompanyQuarterlyFinancial } from "@/types/stock";

const ko = (value: string) => decodeURIComponent(value);

export default async function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  try {
    const company = await getCompanyInfo(symbol);
    const latest = company.annualFinancials[0];
    const latestQuarter = company.quarterlyFinancials[0];
    const market = company.marketData;
    const exchanges = Array.from(new Set(company.exchanges));
    const changeClass = (market?.changePercent ?? 0) >= 0 ? "positive" : "negative";
    const marketFields = [market?.price, market?.previousClose, market?.open, market?.dayHigh, market?.dayLow, market?.volume, market?.marketCap, market?.trailingPe, market?.priceToBook, market?.fiftyTwoWeekHigh, market?.averageVolume, market?.sharesOutstanding];
    const availableMarketFields = marketFields.filter((value) => value !== null && value !== undefined).length;
    const marketQuality = availableMarketFields >= 4 ? ko("%EC%A0%95%EC%83%81") : availableMarketFields > 0 ? ko("%EB%B6%80%EB%B6%84") : ko("%EB%B6%88%EA%B0%80");
    const quarterlyQuality = company.quarterlyFinancials.length >= 8 ? ko("%EC%A0%95%EC%83%81") : ko("%ED%99%95%EC%9D%B8%20%ED%95%84%EC%9A%94");
    const recentQuarters = company.quarterlyFinancials.slice(0, 12);
    const trendItems = buildTrendItems(company.quarterlyFinancials);
    const healthItems = buildHealthItems(company.metrics);
    const healthScore = healthItems.filter((item) => item.tone === "good").length;
    const healthLabel = healthScore >= 3 ? ko("%EC%96%91%ED%98%B8") : healthScore >= 2 ? ko("%EC%A4%91%EB%A6%BD") : ko("%EC%A3%BC%EC%9D%98");
    const overview = buildCompanyOverview(company, market);
    const analyst = company.analystData;
    const latestRecommendation = analyst.recommendationTrends[0];
    const financialChartData = buildFinancialChartData(recentQuarters);

    return (
      <main className="company-shell">
        <div className="company-topbar">
          <Link className="back-link" href="/">
            <ArrowLeft size={16} />
            {ko("%ED%99%88%20%EA%B0%80%EA%B8%B0")}
          </Link>
          <CompanySearch initialTicker={symbol} />
        </div>

        <section className="company-hero panel">
          <div>
            {market?.logo ? (
              <img className="company-logo" src={market.logo} alt={`${company.ticker} logo`} />
            ) : null}
            <div className="company-title-line">
              <h1>{company.ticker}</h1>
              <div className="company-price-line">
                <strong>{formatPrice(market?.price)}</strong>
                <span className={changeClass}>{formatSigned(market?.change)} ({formatSignedPercent(market?.changePercent)})</span>
              </div>
            </div>
            <p>{company.name}</p>
            <div className="eyebrow company-eyebrow">
              <span>{company.source.toUpperCase()}</span>
              <span>CIK {company.cik}</span>
              {exchanges.map((exchange) => (
                <span key={exchange}>{exchange}</span>
              ))}
            </div>
          </div>
          <div className="company-summary-grid">
            <Metric label={ko("%EC%8B%9C%EA%B0%80%EC%B4%9D%EC%95%A1")} value={formatMoney(market?.marketCap)} />
            <Metric label="PER" value={formatNumber(market?.trailingPe)} />
            <Metric label="PBR" value={formatNumber(market?.priceToBook)} />
            <Metric label={ko("%EB%B0%9C%ED%96%89%EC%A3%BC%EC%8B%9D%EC%88%98")} value={formatVolume(market?.sharesOutstanding)} />
          </div>
        </section>

        <section className="panel data-quality">
          <div>
            <strong>{ko("%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EA%B2%80%EC%A6%9D")}</strong>
            <span>{ko("SEC%20%EC%9E%AC%EB%AC%B4%20%EB%8D%B0%EC%9D%B4%ED%84%B0")}: {quarterlyQuality}</span>
          </div>
          <div>
            <strong>{ko("%EC%8B%9C%EC%9E%A5%20%EB%8D%B0%EC%9D%B4%ED%84%B0")}</strong>
            <span>Finnhub/Yahoo: {marketQuality}</span>
          </div>
          <p>{ko("SEC%20%EB%B6%84%EA%B8%B0%20%EC%86%90%EC%9D%B5%2F%ED%98%84%EA%B8%88%ED%9D%90%EB%A6%84%EC%9D%80%20%ED%91%9C%EC%A4%80%20%EB%B6%84%EA%B8%B0%20frame%20%EA%B0%92%EC%9D%84%20%EC%9A%B0%EC%84%A0%ED%95%98%EA%B3%A0%2C%20%EC%8B%9C%EC%84%B8%EC%99%80%20PER%2FPBR%EC%9D%80%20Finnhub%20%EC%A7%80%ED%91%9C%EB%A5%BC%20%EC%9A%B0%EC%84%A0%ED%95%98%EB%A9%B0%20%EB%B6%80%EC%A1%B1%ED%95%9C%20%EA%B0%92%EC%9D%80%20Yahoo%2FSEC%20%EA%B3%84%EC%82%B0%EA%B0%92%EC%9C%BC%EB%A1%9C%20%EB%B3%B4%EC%99%84%ED%95%A9%EB%8B%88%EB%8B%A4.")}</p>
        </section>

        <section className="company-grid company-overview-grid">
          <div className="company-stack">
            <div className="panel company-card">
              <SectionTitle icon={<Building2 size={18} />} title={ko("%EA%B8%B0%EC%97%85%20%EA%B0%9C%EC%9A%94")} />
              <p className="business-summary">{overview}</p>
            </div>

            <div className="panel company-card">
              <SectionTitle icon={<CheckCircle2 size={18} />} title={ko("%ED%88%AC%EC%9E%90%20%EC%B2%B4%ED%81%AC%ED%8F%AC%EC%9D%B8%ED%8A%B8")} />
              <div className="check-list">
                <CheckItem title={ko("%EC%84%B1%EC%9E%A5%EC%84%B1")} value={formatPercent(company.metrics.revenueGrowthPercent)} tone={(company.metrics.revenueGrowthPercent ?? 0) > 0 ? "good" : "watch"} text={ko("%EC%B5%9C%EA%B7%BC%20%EC%97%B0%EA%B0%84%20%EB%A7%A4%EC%B6%9C%20%EC%A6%9D%EA%B0%90%EC%9C%BC%EB%A1%9C%20%EC%84%B1%EC%9E%A5%20%ED%9D%90%EB%A6%84%EC%9D%84%20%EB%B4%85%EB%8B%88%EB%8B%A4.")} />
                <CheckItem title={ko("%EC%88%98%EC%9D%B5%EC%84%B1")} value={formatPercent(company.metrics.operatingMarginPercent)} tone={(company.metrics.operatingMarginPercent ?? 0) > 10 ? "good" : "watch"} text={ko("%EC%98%81%EC%97%85%EC%9D%B4%EC%9D%B5%EB%A5%A0%EB%A1%9C%20%EB%B3%B8%EC%97%85%EC%9D%98%20%EB%A7%88%EC%A7%84%20%EC%B2%B4%EB%A0%A5%EC%9D%84%20%ED%99%95%EC%9D%B8%ED%95%A9%EB%8B%88%EB%8B%A4.")} />
                <CheckItem title={ko("%EC%9E%AC%EB%AC%B4%20%EC%95%88%EC%A0%95%EC%84%B1")} value={formatPercent(company.metrics.debtToEquityPercent)} tone={(company.metrics.debtToEquityPercent ?? 999) < 150 ? "good" : "watch"} text={ko("%EB%B6%80%EC%B1%84%EC%99%80%20%EC%9E%90%EB%B3%B8%20%EB%B9%84%EA%B5%90%EB%A1%9C%20%EC%9E%AC%EB%AC%B4%20%EB%B6%80%EB%8B%B4%EC%9D%84%20%EB%B4%85%EB%8B%88%EB%8B%A4.")} />
                <CheckItem title={ko("%ED%98%84%EA%B8%88%ED%9D%90%EB%A6%84")} value={formatPercent(company.metrics.freeCashFlowMarginPercent)} tone={(company.metrics.freeCashFlowMarginPercent ?? 0) > 0 ? "good" : "watch"} text={ko("%EC%9E%89%EC%97%AC%ED%98%84%EA%B8%88%ED%9D%90%EB%A6%84%EC%9D%B4%20%EB%A7%A4%EC%B6%9C%20%EB%8C%80%EB%B9%84%20%EC%96%BC%EB%A7%88%EB%82%98%20%EB%82%A8%EB%8A%94%EC%A7%80%20%EB%B4%85%EB%8B%88%EB%8B%A4.")} />
              </div>
            </div>
          </div>

          <div className="panel company-card">
            <SectionTitle icon={<Building2 size={18} />} title={ko("%EA%B8%B0%EB%B3%B8%20%EC%A0%95%EB%B3%B4")} />
            <div className="info-list compact-info">
              <InfoRow label={ko("%EC%84%B9%ED%84%B0")} value={market?.sector ?? ko("%EB%AF%B8%ED%99%95%EC%9D%B8")} />
              <InfoRow label={ko("%EC%82%B0%EC%97%85")} value={market?.industry ?? company.industry ?? ko("%EB%AF%B8%ED%99%95%EC%9D%B8")} />
              <InfoRow label={ko("%EA%B5%AD%EA%B0%80")} value={market?.country ?? ko("%EB%AF%B8%ED%99%95%EC%9D%B8")} />
              <InfoRow label={ko("%ED%86%B5%ED%99%94")} value={market?.currency ?? ko("%EB%AF%B8%ED%99%95%EC%9D%B8")} />
              <InfoRow label="IPO" value={market?.ipo ?? ko("%EB%AF%B8%ED%99%95%EC%9D%B8")} />
              <InfoRow label={ko("%EC%A7%81%EC%9B%90%20%EC%88%98")} value={market?.employees ? market.employees.toLocaleString("en-US") : ko("%EB%AF%B8%ED%99%95%EC%9D%B8")} />
              <InfoRow label={ko("%EC%9B%B9%EC%82%AC%EC%9D%B4%ED%8A%B8")} value={market?.website ?? ko("%EB%AF%B8%ED%99%95%EC%9D%B8")} />
              <InfoRow label="CIK" value={company.cik} />
              <InfoRow label={ko("%EA%B1%B0%EB%9E%98%EC%86%8C")} value={exchanges.join(", ") || "-"} />
            </div>
          </div>
        </section>

        <section className="company-grid company-grid-wide">
          <div className="panel company-card">
            <SectionTitle icon={<CheckCircle2 size={18} />} title={ko("%EC%9E%AC%EB%AC%B4%20%EC%83%81%ED%83%9C%20%EC%9A%94%EC%95%BD")} />
            <div className="health-mini">
              <div className={`health-score ${healthScore >= 3 ? "good" : healthScore >= 2 ? "watch" : "bad"}`}>
                <span>{ko("%EC%A2%85%ED%95%A9%20%ED%8C%90%EB%8B%A8")}</span>
                <strong>{healthLabel}</strong>
                <p>{ko("%EC%B5%9C%EA%B7%BC%20%EC%97%B0%EA%B0%84%20%EC%A7%80%ED%91%9C%EC%99%80%20%EC%B5%9C%EA%B7%BC%20%EB%B6%84%EA%B8%B0%20%ED%9D%90%EB%A6%84%EC%9D%84%20%EA%B0%99%EC%9D%B4%20%EB%B3%B4%EB%8A%94%20%EA%B0%84%EB%8B%A8%20%ED%95%84%ED%84%B0%EC%9E%85%EB%8B%88%EB%8B%A4.")}</p>
              </div>
              {healthItems.map((item) => (
                <div className={`health-check ${item.tone}`} key={item.title}>
                  <span>{item.title}</span>
                  <strong>{item.value}</strong>
                  <p>{item.text}</p>
                </div>
              ))}
              {trendItems.map((item) => (
                <div className="trend-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{formatMoney(item.value)}</strong>
                  <em className={item.change === null ? "" : item.change >= 0 ? "positive" : "negative"}>
                    {item.change === null ? ko("%EC%A0%84%EB%85%84%20%EB%8F%99%EA%B8%B0%20%EB%B9%84%EA%B5%90%20%EB%B6%88%EA%B0%80") : `${ko("%EC%A0%84%EB%85%84%20%EB%8F%99%EA%B8%B0")} ${formatSignedPercent(item.change)}`}
                  </em>
                </div>
              ))}
            </div>
          </div>

          <div className="panel company-card">
            <SectionTitle icon={<TrendingUp size={18} />} title={ko("%EC%A3%BC%EC%9A%94%20%ED%88%AC%EC%9E%90%20%EC%A7%80%ED%91%9C")} />
            <div className="metric-grid compact">
              <Metric label={ko("%EC%A0%84%EC%9D%BC%20%EC%A2%85%EA%B0%80")} value={formatPrice(market?.previousClose)} />
              <Metric label={ko("%EC%8B%9C%EA%B0%80")} value={formatPrice(market?.open)} />
              <Metric label={ko("%EC%9D%BC%EC%A4%91%20%EA%B3%A0%EA%B0%80")} value={formatPrice(market?.dayHigh)} />
              <Metric label={ko("%EC%9D%BC%EC%A4%91%20%EC%A0%80%EA%B0%80")} value={formatPrice(market?.dayLow)} />
              <Metric label={ko("%EC%A0%95%EA%B7%9C%20%EA%B1%B0%EB%9E%98%EB%9F%89")} value={formatVolume(market?.volume)} />
              <Metric label="Forward PER" value={formatNumber(market?.forwardPe)} />
              <Metric label={ko("%EB%B0%B0%EB%8B%B9%EC%88%98%EC%9D%B5%EB%A5%A0")} value={formatPercent(market?.dividendYieldPercent)} />
              <Metric label="Beta" value={formatNumber(market?.beta)} />
              <Metric label="52W High" value={formatPrice(market?.fiftyTwoWeekHigh)} />
              <Metric label="52W Low" value={formatPrice(market?.fiftyTwoWeekLow)} />
              <Metric label={ko("%ED%8F%89%EA%B7%A0%20%EA%B1%B0%EB%9E%98%EB%9F%89")} value={formatVolume(market?.averageVolume)} />
            </div>
          </div>
        </section>

        <section className="panel company-card analyst-panel">
          <SectionTitle icon={<TrendingUp size={18} />} title={ko("%EC%95%A0%EB%84%90%EB%A6%AC%EC%8A%A4%ED%8A%B8")} />
          <div className="analyst-layout">
            <div className="analyst-consensus">
              <span>{ko("%EC%BB%A8%EC%84%BC%EC%84%9C%EC%8A%A4")}</span>
              <strong>{analyst.consensus}</strong>
              <p>
                {analyst.analystCount ? `${analyst.analystCount}${ko("%EB%AA%85%20%EA%B8%B0%EC%A4%80")}` : ko("%EB%B6%84%EC%84%9D%EA%B0%80%20%EC%88%98%20%EB%AF%B8%ED%99%95%EC%9D%B8")}
                {latestRecommendation ? ` · ${latestRecommendation.period}` : ""}
              </p>
            </div>
            <div className="analyst-targets">
              <Metric label={ko("%ED%8F%89%EA%B7%A0%20%EB%AA%A9%ED%91%9C%EA%B0%80")} value={formatPrice(analyst.targetMeanPrice)} />
              <Metric label={ko("%EC%83%81%EC%8A%B9%EC%97%AC%EB%A0%A5")} value={formatSignedPercent(analyst.upsidePercent)} />
              <Metric label={ko("%EC%B5%9C%EA%B3%A0%20%EB%AA%A9%ED%91%9C%EA%B0%80")} value={formatPrice(analyst.targetHighPrice)} />
              <Metric label={ko("%EC%B5%9C%EC%A0%80%20%EB%AA%A9%ED%91%9C%EA%B0%80")} value={formatPrice(analyst.targetLowPrice)} />
            </div>
          </div>
          <div className="recommendation-table">
            <div className="recommendation-head">
              <span>{ko("%EA%B8%B0%EA%B0%84")}</span>
              <span>Strong Buy</span>
              <span>Buy</span>
              <span>Hold</span>
              <span>Sell</span>
              <span>Strong Sell</span>
            </div>
            {analyst.recommendationTrends.length ? analyst.recommendationTrends.map((item) => (
              <div className="recommendation-row" key={item.period}>
                <strong>{item.period}</strong>
                <span>{item.strongBuy}</span>
                <span>{item.buy}</span>
                <span>{item.hold}</span>
                <span>{item.sell}</span>
                <span>{item.strongSell}</span>
              </div>
            )) : (
              <div className="recommendation-empty">{ko("%EC%B6%94%EC%B2%9C%20%EC%B6%94%EC%84%B8%20%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%A5%BC%20%EA%B0%80%EC%A0%B8%EC%98%A4%EC%A7%80%20%EB%AA%BB%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4.")}</div>
            )}
          </div>
        </section>

        <section className="panel company-card">
          <SectionTitle icon={<TrendingUp size={18} />} title={ko("%EC%B5%9C%EA%B7%BC%20%EB%B6%84%EA%B8%B0%20%EC%9A%94%EC%95%BD")} />
          <div className="company-summary-grid quarter-summary">
            <Metric label={ko("%EB%B6%84%EA%B8%B0")} value={latestQuarter?.quarterLabel ?? "-"} />
            <Metric label={ko("%EB%A7%A4%EC%B6%9C")} value={formatMoney(latestQuarter?.revenue)} />
            <Metric label={ko("%EC%98%81%EC%97%85%EC%9D%B4%EC%9D%B5")} value={formatMoney(latestQuarter?.operatingIncome)} />
            <Metric label={ko("%EC%88%9C%EC%9D%B4%EC%9D%B5")} value={formatMoney(latestQuarter?.netIncome)} />
            <Metric label="FCF" value={formatMoney(latestQuarter?.freeCashFlow)} />
            <Metric label="Diluted EPS" value={latest?.epsDiluted !== null && latest?.epsDiluted !== undefined ? `$${latest.epsDiluted.toFixed(2)}` : "-"} />
          </div>
        </section>

        <section className="panel company-card">
          <SectionTitle icon={<Landmark size={18} />} title={ko("%EB%B6%84%EA%B8%B0%EB%B3%84%20%EC%9E%AC%EB%AC%B4%EC%A0%9C%ED%91%9C")} />
          <p className="company-note">
            {ko("%EC%8B%A4%EC%A0%84%20%ED%8C%90%EB%8B%A8%EC%97%90%EC%84%9C%EB%8A%94%20%EC%B5%9C%EA%B7%BC%208-12%EA%B0%9C%20%EB%B6%84%EA%B8%B0%EB%A1%9C%20%EB%A7%A4%EC%B6%9C%2C%20%EB%A7%88%EC%A7%84%2C%20%ED%98%84%EA%B8%88%ED%9D%90%EB%A6%84%20%EC%B6%94%EC%84%B8%EB%A5%BC%20%EB%B3%B4%EB%8A%94%20%EA%B2%83%EC%9D%B4%20%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9D%B4%EB%9D%BC%20%EC%B5%9C%EA%B7%BC%2012%EA%B0%9C%20%EB%B6%84%EA%B8%B0%EB%A5%BC%20%ED%91%9C%EC%8B%9C%ED%95%A9%EB%8B%88%EB%8B%A4.")}
          </p>
          <FinancialBarCharts data={financialChartData} />
          <div className="statement-grid">
            <StatementTable
              title={ko("%EC%86%90%EC%9D%B5%EA%B3%84%EC%82%B0%EC%84%9C")}
              rows={recentQuarters}
              columns={[
                { label: ko("%EB%A7%A4%EC%B6%9C"), value: (item) => formatMoney(item.revenue) },
                { label: ko("%EB%A7%A4%EC%B6%9C%EC%B4%9D%EC%9D%B4%EC%9D%B5"), value: (item) => formatMoney(item.grossProfit) },
                { label: ko("%EC%98%81%EC%97%85%EC%9D%B4%EC%9D%B5"), value: (item) => formatMoney(item.operatingIncome) },
                { label: ko("%EC%88%9C%EC%9D%B4%EC%9D%B5"), value: (item) => formatMoney(item.netIncome) },
              ]}
            />
            <StatementTable
              title={ko("%EC%9E%AC%EB%AC%B4%EC%83%81%ED%83%9C%ED%91%9C")}
              rows={recentQuarters}
              columns={[
                { label: ko("%EC%B4%9D%EC%9E%90%EC%82%B0"), value: (item) => formatMoney(item.assets) },
                { label: ko("%EC%B4%9D%EB%B6%80%EC%B1%84"), value: (item) => formatMoney(item.liabilities) },
                { label: ko("%EC%9E%90%EB%B3%B8"), value: (item) => formatMoney(item.equity) },
                { label: ko("%ED%98%84%EA%B8%88"), value: (item) => formatMoney(item.cash) },
                { label: ko("%EC%9E%A5%EA%B8%B0%EB%B6%80%EC%B1%84"), value: (item) => formatMoney(item.longTermDebt) },
              ]}
            />
            <StatementTable
              title={ko("%ED%98%84%EA%B8%88%ED%9D%90%EB%A6%84%ED%91%9C")}
              rows={recentQuarters}
              columns={[
                { label: ko("%EC%98%81%EC%97%85%ED%98%84%EA%B8%88%ED%9D%90%EB%A6%84"), value: (item) => formatMoney(item.operatingCashFlow) },
                { label: ko("%EC%84%A4%EB%B9%84%ED%88%AC%EC%9E%90"), value: (item) => formatMoney(item.capitalExpenditures) },
                { label: "FCF", value: (item) => formatMoney(item.freeCashFlow) },
              ]}
            />
          </div>
        </section>

        <div className="disclaimer company-disclaimer">
          {ko("SEC%20EDGAR%20%EA%B3%B5%EC%8B%9D%20XBRL%20%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%A5%BC%20%EA%B8%B0%EB%B0%98%EC%9C%BC%EB%A1%9C%20%ED%91%9C%EC%8B%9C%ED%95%A9%EB%8B%88%EB%8B%A4.%2010-Q%EB%8A%94%201-3%EB%B6%84%EA%B8%B0%20%EB%B3%B4%EA%B3%A0%EC%84%9C%EC%9D%B4%EB%A9%B0%2C%204%EB%B6%84%EA%B8%B0%20%ED%9D%90%EB%A6%84%20%ED%95%AD%EB%AA%A9%EC%9D%80%2010-K%20%EC%97%B0%EA%B0%84%EA%B0%92%EC%97%90%EC%84%9C%201-3%EB%B6%84%EA%B8%B0%EB%A5%BC%20%EC%B0%A8%EA%B0%90%ED%95%B4%20%ED%91%9C%EC%8B%9C%ED%95%A9%EB%8B%88%EB%8B%A4.")}
        </div>
      </main>
    );
  } catch {
    return (
      <main className="company-shell">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} />
          {ko("%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C")}
        </Link>
        <section className="panel company-error">
          <h1>{symbol}</h1>
          <p>{ko("SEC%20EDGAR%EC%97%90%EC%84%9C%20%ED%95%B4%EB%8B%B9%20%ED%8B%B0%EC%BB%A4%EC%9D%98%20%EA%B8%B0%EC%97%85%20%EC%A0%95%EB%B3%B4%EB%A5%BC%20%EC%B0%BE%EC%A7%80%20%EB%AA%BB%ED%96%88%EC%8A%B5%EB%8B%88%EB%8B%A4.")}</p>
        </section>
      </main>
    );
  }
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {icon}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CheckItem({ title, value, text, tone }: { title: string; value: string; text: string; tone: "good" | "watch" }) {
  return (
    <div className={`check-item ${tone}`}>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      <p>{text}</p>
    </div>
  );
}

type StatementColumn = {
  label: string;
  value: (item: CompanyQuarterlyFinancial) => string;
};

type FinancialChartPoint = {
  label: string;
  revenue: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  freeCashFlow: number | null;
};

function buildFinancialChartData(financials: CompanyQuarterlyFinancial[]): FinancialChartPoint[] {
  return financials
    .slice(0, 12)
    .reverse()
    .map((item) => ({
      label: item.quarterLabel,
      revenue: item.revenue,
      operatingIncome: item.operatingIncome,
      netIncome: item.netIncome,
      freeCashFlow: item.freeCashFlow,
    }));
}

function StatementTable({ title, rows, columns }: { title: string; rows: CompanyQuarterlyFinancial[]; columns: StatementColumn[] }) {
  return (
    <div className="statement-card">
      <h3>{title}</h3>
      <div className="company-table-wrap statement-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{ko("%EB%B6%84%EA%B8%B0")}</th>
              <th>{ko("%EA%B3%B5%EC%8B%9C")}</th>
              {columns.map((column) => (
                <th key={column.label}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={`${title}-${item.fiscalYear}-${item.fiscalPeriod}`}>
                <td>{item.quarterLabel}{item.derived ? " *" : ""}</td>
                <td>{item.form}</td>
                {columns.map((column) => (
                  <td key={column.label}>{column.value(item)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinancialRow({ item }: { item: CompanyQuarterlyFinancial }) {
  return (
    <tr>
      <td>{item.quarterLabel}{item.derived ? " *" : ""}</td>
      <td>{item.form}</td>
      <td>{formatMoney(item.revenue)}</td>
      <td>{formatMoney(item.grossProfit)}</td>
      <td>{formatMoney(item.operatingIncome)}</td>
      <td>{formatMoney(item.netIncome)}</td>
      <td>{formatMoney(item.assets)}</td>
      <td>{formatMoney(item.liabilities)}</td>
      <td>{formatMoney(item.equity)}</td>
      <td>{formatMoney(item.freeCashFlow)}</td>
    </tr>
  );
}

function buildTrendItems(financials: CompanyQuarterlyFinancial[]) {
  const latest = financials[0];
  const yearAgo = latest ? financials.find((item) => item.fiscalYear === latest.fiscalYear - 1 && item.fiscalPeriod === latest.fiscalPeriod) ?? financials[4] : undefined;

  return [
    { label: ko("%EB%A7%A4%EC%B6%9C"), value: latest?.revenue, change: percentChange(latest?.revenue, yearAgo?.revenue) },
    { label: ko("%EC%98%81%EC%97%85%EC%9D%B4%EC%9D%B5"), value: latest?.operatingIncome, change: percentChange(latest?.operatingIncome, yearAgo?.operatingIncome) },
    { label: ko("%EC%88%9C%EC%9D%B4%EC%9D%B5"), value: latest?.netIncome, change: percentChange(latest?.netIncome, yearAgo?.netIncome) },
    { label: "FCF", value: latest?.freeCashFlow, change: percentChange(latest?.freeCashFlow, yearAgo?.freeCashFlow) },
  ];
}

function buildHealthItems(metrics: CompanyMetrics) {
  return [
    {
      title: ko("%EC%84%B1%EC%9E%A5%EC%84%B1"),
      value: formatPercent(metrics.revenueGrowthPercent),
      tone: (metrics.revenueGrowthPercent ?? -1) > 0 ? "good" : "watch",
      text: ko("%EC%97%B0%EA%B0%84%20%EB%A7%A4%EC%B6%9C%EC%9D%B4%20%EC%A6%9D%EA%B0%80%20%EC%B6%94%EC%84%B8%EC%9D%B8%EC%A7%80%20%ED%99%95%EC%9D%B8"),
    },
    {
      title: ko("%EC%88%98%EC%9D%B5%EC%84%B1"),
      value: formatPercent(metrics.operatingMarginPercent),
      tone: (metrics.operatingMarginPercent ?? 0) >= 10 ? "good" : "watch",
      text: ko("%EB%B3%B8%EC%97%85%EC%97%90%EC%84%9C%20%EC%98%81%EC%97%85%EC%9D%B4%EC%9D%B5%EC%9D%B4%20%EC%B6%A9%EB%B6%84%ED%9E%88%20%EB%82%A8%EB%8A%94%EC%A7%80%20%ED%99%95%EC%9D%B8"),
    },
    {
      title: ko("%EC%95%88%EC%A0%95%EC%84%B1"),
      value: formatPercent(metrics.debtToEquityPercent),
      tone: (metrics.debtToEquityPercent ?? 999) <= 150 ? "good" : "watch",
      text: ko("%EB%B6%80%EC%B1%84%20%EB%B6%80%EB%8B%B4%EC%9D%B4%20%EC%9E%90%EB%B3%B8%20%EB%8C%80%EB%B9%84%20%EA%B3%BC%EB%8F%84%ED%95%9C%EC%A7%80%20%ED%99%95%EC%9D%B8"),
    },
    {
      title: ko("%ED%98%84%EA%B8%88%ED%9D%90%EB%A6%84"),
      value: formatPercent(metrics.freeCashFlowMarginPercent),
      tone: (metrics.freeCashFlowMarginPercent ?? 0) > 0 ? "good" : "watch",
      text: ko("%EC%9E%89%EC%97%AC%ED%98%84%EA%B8%88%ED%9D%90%EB%A6%84%EC%9D%B4%20%ED%9D%91%EC%9E%90%EB%A1%9C%20%EB%82%A8%EB%8A%94%EC%A7%80%20%ED%99%95%EC%9D%B8"),
    },
  ] satisfies Array<{ title: string; value: string; tone: "good" | "watch"; text: string }>;
}

function percentChange(current?: number | null, previous?: number | null): number | null {
  if (current === null || current === undefined || previous === null || previous === undefined || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildCompanyOverview(company: CompanyInfo, market: CompanyMarketData | null): string {
  const exchangeText = Array.from(new Set(company.exchanges)).join(", ") || ko("%EB%AF%B8%EA%B5%AD%20%EC%A6%9D%EC%8B%9C");
  const industry = market?.industry ?? company.industry ?? ko("%EC%82%B0%EC%97%85%20%EB%B6%84%EB%A5%98%20%EB%AF%B8%ED%99%95%EC%9D%B8");
  const industryKo = translateIndustry(industry);
  const country = translateCountry(market?.country);
  const ipo = market?.ipo ? `${ko("%20IPO%EC%9D%BC%EC%9D%80%20")}${market.ipo}${ko("%EC%9D%B4%EB%A9%B0%2C")}` : "";
  const marketCap = market?.marketCap ? `${ko("%20%ED%98%84%EC%9E%AC%20%EC%8B%9C%EA%B0%80%EC%B4%9D%EC%95%A1%EC%9D%80%20")}${formatMoney(market.marketCap)}${ko("%20%EC%88%98%EC%A4%80%EC%9E%85%EB%8B%88%EB%8B%A4.")}` : "";
  const sourceSummary = importantSentences(market?.summary, company.name, industryKo);
  const companyFact = `${company.name}(${company.ticker})${ko("%EC%9D%80%2F%EB%8A%94%20")}${country}${ko("%20%EA%B8%B0%EB%B0%98%EC%9D%98%20")}${industryKo}${ko("%20%EA%B4%80%EB%A0%A8%20%EA%B8%B0%EC%97%85%EC%9C%BC%EB%A1%9C%2C%20")}${exchangeText}${ko("%EC%97%90%20%EC%83%81%EC%9E%A5%EB%90%9C%20%EB%AF%B8%EA%B5%AD%20%EC%A3%BC%EC%8B%9D%EC%9E%85%EB%8B%88%EB%8B%A4.%20")}${ipo}${marketCap}`;

  return sourceSummary ? `${companyFact} ${sourceSummary}` : companyFact;
}

function importantSentences(summary: string | null | undefined, companyName: string, industry: string): string {
  if (!summary) return "";
  const normalized = summary.toLowerCase();
  const lead = `${companyName}${ko("%EB%8A%94%20")}`;

  if (normalized.includes("space") || normalized.includes("spacecraft") || normalized.includes("satellite")) {
    return `${lead}${ko("%EC%9A%B0%EC%A3%BC%20%EC%9D%B8%ED%94%84%EB%9D%BC%2C%20%EC%9C%84%EC%84%B1%2C%20%EC%9A%B0%EC%A3%BC%EC%84%A0%20%EA%B4%80%EB%A0%A8%20%EC%8B%9C%EC%8A%A4%ED%85%9C%EA%B3%BC%20%EC%84%9C%EB%B9%84%EC%8A%A4%EB%A5%BC%20%EC%A0%9C%EA%B3%B5%ED%95%98%EB%8A%94%20%EA%B8%B0%EC%97%85%EC%9E%85%EB%8B%88%EB%8B%A4.%20%EC%A3%BC%EC%9A%94%20%EA%B3%A0%EA%B0%9D%EA%B5%B0%EC%9D%80%20%EC%A0%95%EB%B6%80%2C%20%EA%B5%AD%EB%B0%A9%2C%20%EB%AF%BC%EA%B0%84%20%EC%9A%B0%EC%A3%BC%20%EC%82%B0%EC%97%85%20%EC%98%81%EC%97%AD%EC%9C%BC%EB%A1%9C%20%EB%B3%BC%20%EC%88%98%20%EC%9E%88%EC%8A%B5%EB%8B%88%EB%8B%A4.")}`;
  }

  if (normalized.includes("smartphone") || normalized.includes("iphone") || normalized.includes("consumer electronics")) {
    return `${lead}${ko("%EC%8A%A4%EB%A7%88%ED%8A%B8%ED%8F%B0%2C%20%EA%B0%9C%EC%9D%B8%EC%9A%A9%20%EC%BB%B4%ED%93%A8%ED%84%B0%2C%20%ED%83%9C%EB%B8%94%EB%A6%BF%2C%20%EC%9B%A8%EC%96%B4%EB%9F%AC%EB%B8%94%2C%20%EB%94%94%EC%A7%80%ED%84%B8%20%EC%84%9C%EB%B9%84%EC%8A%A4%EB%A5%BC%20%EC%A0%9C%EA%B3%B5%ED%95%98%EB%8A%94%20%EC%86%8C%EB%B9%84%EC%9E%90%20%EA%B8%B0%EC%88%A0%20%EA%B8%B0%EC%97%85%EC%9E%85%EB%8B%88%EB%8B%A4.%20%ED%95%98%EB%93%9C%EC%9B%A8%EC%96%B4%20%ED%8C%90%EB%A7%A4%EC%99%80%20%EC%84%9C%EB%B9%84%EC%8A%A4%20%EB%A7%A4%EC%B6%9C%EC%9D%84%20%ED%95%A8%EA%BB%98%20%EB%B3%B4%EB%8A%94%20%EA%B2%83%EC%9D%B4%20%EC%A4%91%EC%9A%94%ED%95%A9%EB%8B%88%EB%8B%A4.")}`;
  }

  if (normalized.includes("quantum")) {
    return `${lead}${ko("%EC%96%91%EC%9E%90%20%EC%BB%B4%ED%93%A8%ED%8C%85%20%EC%8B%9C%EC%8A%A4%ED%85%9C%EA%B3%BC%20%EA%B4%80%EB%A0%A8%20%EC%84%9C%EB%B9%84%EC%8A%A4%EB%A5%BC%20%EC%A0%9C%EA%B3%B5%ED%95%98%EB%8A%94%20%EA%B8%B0%EC%88%A0%20%EA%B8%B0%EC%97%85%EC%9E%85%EB%8B%88%EB%8B%A4.%20%EC%83%81%EC%9A%A9%ED%99%94%20%EB%8B%A8%EA%B3%84%EC%99%80%20%EB%A7%A4%EC%B6%9C%20%EC%84%B1%EC%9E%A5%EC%84%B1%EC%9D%84%20%ED%95%A8%EA%BB%98%20%ED%99%95%EC%9D%B8%ED%95%B4%EC%95%BC%20%ED%95%A9%EB%8B%88%EB%8B%A4.")}`;
  }

  if (normalized.includes("software") || normalized.includes("cloud")) {
    return `${lead}${ko("%EC%86%8C%ED%94%84%ED%8A%B8%EC%9B%A8%EC%96%B4%EC%99%80%20%ED%81%B4%EB%9D%BC%EC%9A%B0%EB%93%9C%20%EA%B8%B0%EB%B0%98%20%EC%84%9C%EB%B9%84%EC%8A%A4%EB%A5%BC%20%EC%A0%9C%EA%B3%B5%ED%95%98%EB%8A%94%20%EA%B8%B0%EC%97%85%EC%9E%85%EB%8B%88%EB%8B%A4.%20%EA%B5%AC%EB%8F%85%ED%98%95%20%EB%A7%A4%EC%B6%9C%2C%20%EB%A7%88%EC%A7%84%2C%20%EA%B3%A0%EA%B0%9D%20%EC%9C%A0%EC%A7%80%EB%A0%A5%EC%9D%84%20%ED%95%A8%EA%BB%98%20%EB%B3%B4%EB%8A%94%20%EA%B2%83%EC%9D%B4%20%EC%A4%91%EC%9A%94%ED%95%A9%EB%8B%88%EB%8B%A4.")}`;
  }

  if (normalized.includes("semiconductor") || normalized.includes("chip")) {
    return `${lead}${ko("%EB%B0%98%EB%8F%84%EC%B2%B4%20%EB%B0%8F%20%EA%B4%80%EB%A0%A8%20%EA%B8%B0%EC%88%A0%20%EC%82%B0%EC%97%85%EC%97%90%20%EC%86%8D%ED%95%9C%20%EA%B8%B0%EC%97%85%EC%9E%85%EB%8B%88%EB%8B%A4.%20%EC%88%98%EC%9A%94%20%EC%82%AC%EC%9D%B4%ED%81%B4%2C%20%EB%A7%88%EC%A7%84%2C%20%EC%84%A4%EB%B9%84%ED%88%AC%EC%9E%90%20%ED%9D%90%EB%A6%84%EC%9D%84%20%EA%B0%99%EC%9D%B4%20%ED%99%95%EC%9D%B8%ED%95%B4%EC%95%BC%20%ED%95%A9%EB%8B%88%EB%8B%A4.")}`;
  }

  return `${lead}${industry}${ko("%20%EB%B6%84%EC%95%BC%EC%97%90%EC%84%9C%20%EC%A0%9C%ED%92%88%20%EB%98%90%EB%8A%94%20%EC%84%9C%EB%B9%84%EC%8A%A4%EB%A5%BC%20%EC%A0%9C%EA%B3%B5%ED%95%98%EB%8A%94%20%EA%B8%B0%EC%97%85%EC%9E%85%EB%8B%88%EB%8B%A4.%20%EC%83%81%EC%84%B8%20%EC%82%AC%EC%97%85%20%EB%82%B4%EC%9A%A9%EC%9D%80%20Yahoo%20%EC%9B%90%EB%AC%B8%20%EC%84%A4%EB%AA%85%EC%9D%84%20%EA%B8%B0%EB%B0%98%EC%9C%BC%EB%A1%9C%20%ED%95%84%EC%9A%94%20%EB%B2%94%EC%9C%84%EB%A7%8C%20%EB%B0%98%EC%98%81%ED%95%A9%EB%8B%88%EB%8B%A4.")}`;
}

function translateCountry(value?: string | null): string {
  if (!value) return ko("%EB%AF%B8%EA%B5%AD");
  const normalized = value.toUpperCase();
  if (normalized === "US" || normalized === "USA" || normalized === "UNITED STATES") return ko("%EB%AF%B8%EA%B5%AD");
  return value;
}

function translateIndustry(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("consumer electronics")) return ko("%EC%86%8C%EB%B9%84%EC%9E%90%20%EC%A0%84%EC%9E%90%EC%A0%9C%ED%92%88");
  if (normalized.includes("technology")) return ko("%EA%B8%B0%EC%88%A0");
  if (normalized.includes("semiconductor")) return ko("%EB%B0%98%EB%8F%84%EC%B2%B4");
  if (normalized.includes("software")) return ko("%EC%86%8C%ED%94%84%ED%8A%B8%EC%9B%A8%EC%96%B4");
  if (normalized.includes("auto")) return ko("%EC%9E%90%EB%8F%99%EC%B0%A8");
  if (normalized.includes("pharmaceutical")) return ko("%EC%A0%9C%EC%95%BD");
  if (normalized.includes("biotechnology")) return ko("%EB%B0%94%EC%9D%B4%EC%98%A4%ED%85%8C%ED%81%AC");
  if (normalized.includes("bank")) return ko("%EC%9D%80%ED%96%89");
  if (normalized.includes("financial")) return ko("%EA%B8%88%EC%9C%B5");
  if (normalized.includes("retail")) return ko("%EC%86%8C%EB%A7%A4");
  if (normalized.includes("energy")) return ko("%EC%97%90%EB%84%88%EC%A7%80");
  if (normalized.includes("computer integrated systems design")) return ko("%EC%BB%B4%ED%93%A8%ED%84%B0%20%ED%86%B5%ED%95%A9%20%EC%8B%9C%EC%8A%A4%ED%85%9C%20%EC%84%A4%EA%B3%84");
  return value;
}


function formatMoney(value?: number | null): string {
  if (value === null || value === undefined) return "미확인";
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000_000) return `${sign}$${(absolute / 1_000_000_000_000).toFixed(2)}T`;
  if (absolute >= 1_000_000_000) return `${sign}$${(absolute / 1_000_000_000).toFixed(2)}B`;
  if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(2)}M`;
  return `${sign}$${absolute.toLocaleString("en-US")}`;
}

function formatPrice(value?: number | null): string {
  return value === null || value === undefined ? "미확인" : `$${value.toFixed(2)}`;
}

function formatNumber(value?: number | null): string {
  return value === null || value === undefined ? "미확인" : value.toFixed(2);
}

function formatPercent(value?: number | null): string {
  return value === null || value === undefined ? "미확인" : `${value.toFixed(2)}%`;
}

function formatSigned(value?: number | null): string {
  if (value === null || value === undefined) return "미확인";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatSignedPercent(value?: number | null): string {
  if (value === null || value === undefined) return "미확인";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatVolume(value?: number | null): string {
  if (value === null || value === undefined) return "미확인";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  return value.toLocaleString("en-US");
}

function formatFiscalYearEnd(value?: string | null): string {
  if (!value || value.length !== 4) return "미확인";
  return `${value.slice(0, 2)}/${value.slice(2)}`;
}
