import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sectionSchema } from "@/lib/validators";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = sectionSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const section = await prisma.section.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(section);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.section.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
