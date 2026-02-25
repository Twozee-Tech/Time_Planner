import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { personSchema } from "@/lib/validators";
import { isSuperAdmin, isAdmin } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  let personFilter: { id?: { in: string[] } } = {};

  if (isSuperAdmin(token.role as string)) {
    // SUPER_ADMIN: optionally filter by a specific teamId
    if (teamId) {
      const personIds = (
        await prisma.teamMember.findMany({ where: { teamId } })
      ).map((m) => m.personId);
      personFilter = { id: { in: personIds } };
    }
    // else: no filter — return all persons
  } else {
    const userTeamIds = (
      await prisma.teamUser.findMany({ where: { userId: token.sub as string } })
    ).map((t) => t.teamId);

    const personIds = (
      await prisma.teamMember.findMany({ where: { teamId: { in: userTeamIds } } })
    ).map((m) => m.personId);

    personFilter = { id: { in: personIds } };
  }

  const persons = await prisma.person.findMany({
    where: personFilter,
    include: {
      section: true,
      sdm: true,
      teamMembers: { include: { team: { select: { id: true, name: true } } } },
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
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !isAdmin(token.role as string)) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await request.json();
  const { teamIds = [], ...personData } = body;
  const parsed = personSchema.safeParse(personData);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // ADMIN can only assign to their own teams
  let allowedTeamIds: string[] = teamIds;
  if (!isSuperAdmin(token.role as string) && teamIds.length > 0) {
    const userTeamIds = (
      await prisma.teamUser.findMany({ where: { userId: token.sub as string } })
    ).map((t) => t.teamId);
    allowedTeamIds = (teamIds as string[]).filter((id) => userTeamIds.includes(id));
  }

  const person = await prisma.person.create({
    data: parsed.data,
    include: { section: true, sdm: true, teamMembers: { include: { team: { select: { id: true, name: true } } } } },
  });

  if (allowedTeamIds.length > 0) {
    await prisma.teamMember.createMany({
      data: allowedTeamIds.map((teamId) => ({ teamId, personId: person.id })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json(person, { status: 201 });
}
