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
  const teamProjects = await prisma.teamProject.findMany({
    where: { teamId: id },
    include: { project: true },
  });

  return NextResponse.json(teamProjects.map((tp) => tp.project));
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
  const { projectId } = await request.json();

  if (!projectId) {
    return NextResponse.json({ error: "projectId jest wymagane" }, { status: 400 });
  }

  const teamProject = await prisma.teamProject.create({
    data: { teamId: id, projectId },
  });

  return NextResponse.json(teamProject, { status: 201 });
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
  const { projectId } = await request.json();

  if (!projectId) {
    return NextResponse.json({ error: "projectId jest wymagane" }, { status: 400 });
  }

  await prisma.teamProject.deleteMany({
    where: { teamId: id, projectId },
  });

  return NextResponse.json({ success: true });
}
