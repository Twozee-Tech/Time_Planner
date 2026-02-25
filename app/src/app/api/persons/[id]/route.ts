import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { personSchema } from "@/lib/validators";
import { isSuperAdmin, isAdmin } from "@/lib/auth-utils";

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
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { teamIds, ...personData } = body;
  const parsed = personSchema.partial().safeParse(personData);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const person = await prisma.person.update({
    where: { id },
    data: parsed.data,
    include: { section: true, sdm: true, teamMembers: { include: { team: { select: { id: true, name: true } } } } },
  });

  // Sync team memberships if teamIds provided
  if (Array.isArray(teamIds)) {
    // ADMIN can only manage their own teams
    let allowedTeamIds: string[] = teamIds;
    if (!isSuperAdmin(token.role as string)) {
      const userTeamIds = (
        await prisma.teamUser.findMany({ where: { userId: token.sub as string } })
      ).map((t) => t.teamId);
      allowedTeamIds = teamIds.filter((tid: string) => userTeamIds.includes(tid));
    }

    const current = await prisma.teamMember.findMany({ where: { personId: id } });
    const currentIds = current.map((m) => m.teamId);

    // Only touch teams that are "in scope" (ADMIN: their teams; SUPER_ADMIN: all)
    const scopedCurrentIds = isSuperAdmin(token.role as string)
      ? currentIds
      : currentIds.filter((tid) => {
          // only remove from teams the admin manages
          return allowedTeamIds.includes(tid) || teamIds.includes(tid);
        });

    const toAdd = allowedTeamIds.filter((t) => !currentIds.includes(t));
    const toRemove = scopedCurrentIds.filter((t) => !allowedTeamIds.includes(t));

    if (toAdd.length > 0) {
      await prisma.teamMember.createMany({
        data: toAdd.map((teamId) => ({ teamId, personId: id })),
        skipDuplicates: true,
      });
    }
    if (toRemove.length > 0) {
      await prisma.teamMember.deleteMany({
        where: { personId: id, teamId: { in: toRemove } },
      });
    }
  }

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
