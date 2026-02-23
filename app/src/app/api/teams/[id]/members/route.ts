import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isSuperAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;
  const members = await prisma.teamMember.findMany({
    where: { teamId: id },
    include: { person: { include: { section: true } } },
  });

  return NextResponse.json(members.map((m) => m.person));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isSuperAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;
  const { personId } = await request.json();

  if (!personId) {
    return NextResponse.json({ error: "personId jest wymagane" }, { status: 400 });
  }

  const member = await prisma.teamMember.create({
    data: { teamId: id, personId },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isSuperAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;
  const { personId } = await request.json();

  if (!personId) {
    return NextResponse.json({ error: "personId jest wymagane" }, { status: 400 });
  }

  await prisma.teamMember.deleteMany({
    where: { teamId: id, personId },
  });

  return NextResponse.json({ success: true });
}
