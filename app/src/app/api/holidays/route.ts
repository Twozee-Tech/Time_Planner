import { NextResponse } from "next/server";
import { getPolishHolidays } from "@/lib/holidays";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Nieprawidłowy rok" }, { status: 400 });
  }

  const holidays = getPolishHolidays(year);
  const formatted = holidays.map((d) => d.toISOString().split("T")[0]);

  return NextResponse.json(formatted);
}
