import { NextResponse } from "next/server";
import { getChart } from "@/lib/server/stockData";

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  const timeframe = new URL(request.url).searchParams.get("timeframe") ?? "1d";
  return NextResponse.json(await getChart(ticker, timeframe));
}
