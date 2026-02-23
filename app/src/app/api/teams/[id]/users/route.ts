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
  const teamUsers = await prisma.teamUser.findMany({
    where: { teamId: id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  return NextResponse.json(teamUsers.map((tu) => tu.user));
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
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId jest wymagane" }, { status: 400 });
  }

  const teamUser = await prisma.teamUser.create({
    data: { teamId: id, userId },
  });

  return NextResponse.json(teamUser, { status: 201 });
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
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId jest wymagane" }, { status: 400 });
  }

  await prisma.teamUser.deleteMany({
    where: { teamId: id, userId },
  });

  return NextResponse.json({ success: true });
}
