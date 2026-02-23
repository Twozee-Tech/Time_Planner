import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validators";
import { isSuperAdmin } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  let projectFilter: { id?: { in: string[] } } = {};

  if (!isSuperAdmin(token.role as string)) {
    const userTeamIds = (
      await prisma.teamUser.findMany({ where: { userId: token.sub as string } })
    ).map((t) => t.teamId);

    const projectIds = (
      await prisma.teamProject.findMany({ where: { teamId: { in: userTeamIds } } })
    ).map((p) => p.projectId);

    projectFilter = { id: { in: projectIds } };
  }

  const projects = await prisma.project.findMany({
    where: projectFilter,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = projectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: parsed.data,
  });

  return NextResponse.json(project, { status: 201 });
}
