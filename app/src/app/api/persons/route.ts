import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { personSchema } from "@/lib/validators";
import { isSuperAdmin } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  let personFilter: { id?: { in: string[] } } = {};

  if (!isSuperAdmin(token.role as string)) {
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
  const body = await request.json();
  const parsed = personSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const person = await prisma.person.create({
    data: parsed.data,
    include: { section: true, sdm: true },
  });

  return NextResponse.json(person, { status: 201 });
}
