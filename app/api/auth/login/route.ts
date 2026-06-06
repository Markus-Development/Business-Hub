import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

export const runtime = "nodejs";

type Body = { password?: unknown };

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { password } = body;
  if (typeof password !== "string" || password !== expected) {
    return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
