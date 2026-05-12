import { NextResponse } from "next/server";
import { getBacktest } from "@/lib/server/stockData";

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const strategy = searchParams.get("strategy") ?? "pullback";
  const period = searchParams.get("period") ?? "5y";
  return NextResponse.json(await getBacktest(ticker, strategy, period));
}
