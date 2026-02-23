import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { assignmentBulkSchema } from "@/lib/validators";
import { isSuperAdmin } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const personId = searchParams.get("personId");

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
  }

  const where: Record<string, unknown> = {
    date: {
      gte: new Date(dateFrom),
      lte: new Date(dateTo),
    },
  };

  if (personId) {
    where.personId = personId;
  } else if (!isSuperAdmin(token.role as string)) {
    const userTeamIds = (
      await prisma.teamUser.findMany({ where: { userId: token.sub as string } })
    ).map((t) => t.teamId);

    const personIds = (
      await prisma.teamMember.findMany({ where: { teamId: { in: userTeamIds } } })
    ).map((m) => m.personId);

    where.personId = { in: personIds };
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      project: { select: { id: true, projectId: true, name: true, label: true, color: true } },
    },
    orderBy: [{ date: "asc" }],
  });

  return NextResponse.json(assignments);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = assignmentBulkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { personId, dates, projectIds, primaryProjectId, workload } = parsed.data;

  // Transaction: delete old assignments for this person+dates, then create new ones
  const result = await prisma.$transaction(async (tx) => {
    // Delete existing assignments for person on these dates
    await tx.assignment.deleteMany({
      where: {
        personId,
        date: { in: dates.map((d) => new Date(d)) },
      },
    });

    // Create new assignments
    const data = dates.flatMap((dateStr) =>
      projectIds.map((projectId) => ({
        personId,
        projectId,
        date: new Date(dateStr),
        isPrimary: projectId === primaryProjectId,
        workload: workload as "RED" | "YELLOW" | "GREEN",
      }))
    );

    const created = await tx.assignment.createMany({ data });
    return created;
  });

  return NextResponse.json(result, { status: 201 });
}
