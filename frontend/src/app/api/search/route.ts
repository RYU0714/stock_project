import { NextResponse } from "next/server";

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  exchDisp?: string;
  quoteType?: string;
  typeDisp?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json({ query, results: [] });
  }

  const yahooUrl = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  yahooUrl.searchParams.set("q", query);
  yahooUrl.searchParams.set("quotesCount", "8");
  yahooUrl.searchParams.set("newsCount", "0");
  yahooUrl.searchParams.set("enableFuzzyQuery", "true");
  yahooUrl.searchParams.set("quotesQueryId", "tss_match_phrase_query");

  const response = await fetch(yahooUrl, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return NextResponse.json({ query, results: [] }, { status: 200 });
  }

  const data = (await response.json()) as { quotes?: YahooQuote[] };
  const results = (data.quotes ?? [])
    .filter((item) => item.symbol && item.quoteType !== "CRYPTOCURRENCY")
    .map((item) => ({
      symbol: item.symbol ?? "",
      name: item.shortname ?? item.longname ?? item.symbol ?? "",
      exchange: item.exchDisp ?? item.exchange ?? "",
      type: item.typeDisp ?? item.quoteType ?? "",
    }))
    .slice(0, 6);

  return NextResponse.json({ query, results });
}
