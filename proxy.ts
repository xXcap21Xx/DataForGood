import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { absoluteUrl } from "@/lib/app-url";

const SESSION_COOKIE = "session_token";
const ROOT_SESSION_COOKIE = "root_session_token";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/sistema")) {
    const hasRootSession = Boolean(request.cookies.get(ROOT_SESSION_COOKIE)?.value);

    if (!hasRootSession) {
      return NextResponse.redirect(absoluteUrl("/root"));
    }

    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession) {
    return NextResponse.redirect(absoluteUrl("/entrar"));
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
