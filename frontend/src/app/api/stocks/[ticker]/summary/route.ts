import { NextResponse } from "next/server";
import { getSummary } from "@/lib/server/stockData";

export async function GET(_request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  return NextResponse.json(await getSummary(ticker));
}
