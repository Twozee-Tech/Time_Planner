import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { teamSchema } from "@/lib/validators";
import { isSuperAdmin } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  if (isSuperAdmin(token.role as string)) {
    const teams = await prisma.team.findMany({
      include: {
        _count: { select: { members: true, projects: true, users: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(teams);
  }

  // ADMIN/USER: return only teams they are assigned to
  const teamUsers = await prisma.teamUser.findMany({
    where: { userId: token.sub as string },
    include: {
      team: {
        include: {
          _count: { select: { members: true, projects: true, users: true } },
        },
      },
    },
  });

  return NextResponse.json(teamUsers.map((tu) => tu.team));
}

export async function POST(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isSuperAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = teamSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const team = await prisma.team.create({
    data: parsed.data,
    include: {
      _count: { select: { members: true, projects: true, users: true } },
    },
  });

  return NextResponse.json(team, { status: 201 });
}
