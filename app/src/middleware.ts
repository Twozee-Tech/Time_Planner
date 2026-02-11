import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/person", "/projects", "/people", "/users", "/api/assignments", "/api/projects", "/api/persons", "/api/sections", "/api/holidays", "/api/users"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/person/:path*", "/projects/:path*", "/people/:path*", "/users/:path*", "/api/assignments/:path*", "/api/projects/:path*", "/api/persons/:path*", "/api/sections/:path*", "/api/holidays/:path*", "/api/users/:path*"],
};
