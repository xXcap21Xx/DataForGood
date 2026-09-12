import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session_token";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession) {
    const url = new URL("/entrar", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/campanas/:path*",
    "/mis-aportes/:path*",
    "/mis-campanas/:path*",
    "/cuenta/:path*",
    "/supervision/:path*",
  ],
};
