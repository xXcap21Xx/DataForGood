import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session_token";
const ROOT_SESSION_COOKIE = "root_session_token";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/sistema")) {
    const hasRootSession = Boolean(request.cookies.get(ROOT_SESSION_COOKIE)?.value);

    if (!hasRootSession) {
      return NextResponse.redirect(new URL("/root", request.url));
    }

    return NextResponse.next();
  }

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
    "/sistema/:path*",
  ],
};
