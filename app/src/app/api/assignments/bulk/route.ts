import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignmentDeleteSchema } from "@/lib/validators";

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = assignmentDeleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { personId, dates } = parsed.data;

  await prisma.assignment.deleteMany({
    where: {
      personId,
      date: { in: dates.map((d) => new Date(d)) },
    },
  });

  return NextResponse.json({ success: true });
}
