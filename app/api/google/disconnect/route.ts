import { NextResponse } from "next/server";
import { disconnectGoogle } from "@/lib/google";

export const runtime = "nodejs";

export async function POST() {
  try {
    await disconnectGoogle();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
