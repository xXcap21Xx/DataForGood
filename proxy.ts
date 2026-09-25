import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { absoluteUrl } from "@/lib/app-url";

const SESSION_COOKIE = "session_token";
const ROOT_SESSION_COOKIE = "root_session_token";
const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Protección CSRF para las mutaciones de /api. La cookie de sesión va con
 * SameSite, pero además se exige que el navegador declare venir de este
 * mismo sitio: Origin debe coincidir con el host al que llegó la petición
 * (o con APP_ORIGIN). Los clientes que no son navegador no mandan Origin y
 * no pueden usar la cookie de otra persona, así que se dejan pasar. Las
 * server actions no pasan por aquí: Next ya verifica su Origin.
 */
function origenPermitido(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return request.headers.get("sec-fetch-site") !== "cross-site";
  }

  let hostDeOrigen: string;
  try {
    hostDeOrigen = new URL(origin).host;
  } catch {
    return false;
  }

  const permitidos = [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
    process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).host : null,
  ];
  return permitidos.some((host) => host && host === hostDeOrigen);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /api: solo se revisa el origen de las mutaciones. La sesión la valida
  // cada route handler (este archivo solo ve si hay cookie).
  if (pathname.startsWith("/api/")) {
    if (!METODOS_SEGUROS.has(request.method) && !origenPermitido(request)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/sistema")) {
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
    "/api/:path*",
    "/campanas/:path*",
    "/mis-aportes/:path*",
    "/mis-campanas/:path*",
    "/cuenta/:path*",
    "/supervision/:path*",
    "/sistema/:path*",
  ],
};
