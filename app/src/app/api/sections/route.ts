import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sectionSchema } from "@/lib/validators";

export async function GET() {
  const sections = await prisma.section.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(sections);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = sectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const section = await prisma.section.create({
    data: parsed.data,
  });

  return NextResponse.json(section, { status: 201 });
}
