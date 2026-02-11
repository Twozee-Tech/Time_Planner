import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { personSchema } from "@/lib/validators";

export async function GET() {
  const persons = await prisma.person.findMany({
    include: {
      section: true,
      sdm: true,
    },
    orderBy: [
      { section: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { lastName: "asc" },
    ],
  });
  return NextResponse.json(persons);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = personSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const person = await prisma.person.create({
    data: parsed.data,
    include: { section: true, sdm: true },
  });

  return NextResponse.json(person, { status: 201 });
}
