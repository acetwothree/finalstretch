import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Soft site-wide password gate (Next 16 "proxy", formerly middleware).
 * Set SITE_PASSWORD in the host's env to turn it on; leave it unset and the
 * site is fully open. This is a lock on the front door, not real auth.
 */
export function proxy(req: NextRequest) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/gate" || pathname.startsWith("/api/gate")) {
    return NextResponse.next();
  }

  if (req.cookies.get("fl_gate")?.value === pw) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.search = "";
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)).*)",
  ],
};
