import { NextResponse } from "next/server";
import { listFreizeit } from "@/lib/notion";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.NOTION_FREIZEIT_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  try {
    const items = await listFreizeit();
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
