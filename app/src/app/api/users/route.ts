import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { userCreateSchema } from "@/lib/validators";
import { isAdmin, isSuperAdmin } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const select = { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true };

  if (isSuperAdmin(token.role as string)) {
    const users = await prisma.user.findMany({ select, orderBy: { name: "asc" } });
    return NextResponse.json(users);
  }

  // ADMIN: return only users in their teams
  const adminTeamIds = (
    await prisma.teamUser.findMany({ where: { userId: token.sub as string } })
  ).map((t) => t.teamId);

  const userIds = (
    await prisma.teamUser.findMany({ where: { teamId: { in: adminTeamIds } } })
  ).map((tu) => tu.userId);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = userCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // ADMIN cannot create SUPER_ADMIN
  if (!isSuperAdmin(token.role as string) && parsed.data.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień do tworzenia Super Admina" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Użytkownik z tym adresem email już istnieje" }, { status: 409 });
  }

  const hashedPassword = await hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      hashedPassword,
      role: parsed.data.role || "USER",
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });

  // ADMIN: auto-assign new user to all of admin's teams
  if (!isSuperAdmin(token.role as string)) {
    const adminTeamIds = (
      await prisma.teamUser.findMany({ where: { userId: token.sub as string } })
    ).map((t) => t.teamId);

    if (adminTeamIds.length > 0) {
      await prisma.teamUser.createMany({
        data: adminTeamIds.map((teamId) => ({ teamId, userId: user.id })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json(user, { status: 201 });
}
