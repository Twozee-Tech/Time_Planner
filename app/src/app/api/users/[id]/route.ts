import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/lib/validators";
import { isAdmin, isSuperAdmin } from "@/lib/auth-utils";

async function getAdminUserIds(adminUserId: string): Promise<string[]> {
  const teamIds = (
    await prisma.teamUser.findMany({ where: { userId: adminUserId } })
  ).map((t) => t.teamId);
  const userIds = (
    await prisma.teamUser.findMany({ where: { teamId: { in: teamIds } } })
  ).map((tu) => tu.userId);
  return userIds;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;

  if (!isSuperAdmin(token.role as string)) {
    const allowedIds = await getAdminUserIds(token.sub as string);
    if (!allowedIds.includes(id)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;

  if (!isSuperAdmin(token.role as string)) {
    const allowedIds = await getAdminUserIds(token.sub as string);
    if (!allowedIds.includes(id)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }
  }

  const body = await request.json();
  const parsed = userUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // ADMIN cannot set SUPER_ADMIN role
  if (!isSuperAdmin(token.role as string) && parsed.data.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień do nadania roli Super Admina" }, { status: 403 });
  }

  if (parsed.data.email) {
    const existing = await prisma.user.findFirst({
      where: { email: parsed.data.email, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Użytkownik z tym adresem email już istnieje" }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;

  if (token.sub === id) {
    return NextResponse.json({ error: "Nie można usunąć własnego konta" }, { status: 400 });
  }

  if (!isSuperAdmin(token.role as string)) {
    const allowedIds = await getAdminUserIds(token.sub as string);
    if (!allowedIds.includes(id)) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
