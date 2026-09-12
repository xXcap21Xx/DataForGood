import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getGoogleAuthUrl } from "@/lib/google";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: Request) {
  try {
    const state = randomBytes(16).toString("hex");
    const url = getGoogleAuthUrl(state);

    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/entrar?error=google", request.url));
  }
}
