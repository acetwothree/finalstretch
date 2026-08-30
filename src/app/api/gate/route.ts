import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return NextResponse.json({ ok: true }); // gate disabled

  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };

  if (password !== pw) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("fl_gate", pw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
