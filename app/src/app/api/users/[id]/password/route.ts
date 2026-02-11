import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { passwordChangeSchema } from "@/lib/validators";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
  }

  const { id } = await params;
  const isAdmin = token.role === "ADMIN";
  const isSelf = token.sub === id;

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = passwordChangeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Non-admin changing own password must provide old password
  if (!isAdmin || isSelf) {
    if (!parsed.data.oldPassword) {
      return NextResponse.json({ error: "Obecne hasło jest wymagane" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 });
    }

    const isValid = await compare(parsed.data.oldPassword, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json({ error: "Obecne hasło jest nieprawidłowe" }, { status: 400 });
    }
  }

  const hashedPassword = await hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id },
    data: { hashedPassword },
  });

  return NextResponse.json({ success: true });
}
