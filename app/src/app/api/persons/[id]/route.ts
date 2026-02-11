import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { personSchema } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    include: { section: true, sdm: true },
  });
  if (!person) {
    return NextResponse.json({ error: "Nie znaleziono osoby" }, { status: 404 });
  }
  return NextResponse.json(person);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = personSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const person = await prisma.person.update({
    where: { id },
    data: parsed.data,
    include: { section: true, sdm: true },
  });

  return NextResponse.json(person);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.person.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}
