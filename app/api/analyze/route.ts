import { NextResponse } from "next/server";
import { analyzeCsv } from "@/lib/xauusd/analyze";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const filePath = process.env.XAUUSD_CSV_PATH;
  if (!filePath) {
    return NextResponse.json(
      { error: "XAUUSD_CSV_PATH is not configured. Point it to your local XAUUSD.csv file." },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeCsv(filePath);
    return NextResponse.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read CSV";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}