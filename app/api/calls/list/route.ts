import { NextResponse } from "next/server";
import { listCallNotes } from "@/lib/notion";

export const runtime = "nodejs";

// GET /api/calls/list — the ~25 most recent Call Notes for the Calls tab list.
export async function GET() {
  if (!process.env.NOTION_CALL_NOTES_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  try {
    const calls = await listCallNotes(25);
    return NextResponse.json({ ok: true, calls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    if (message === "call_notes_not_configured") {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
    }
    // eslint-disable-next-line no-console
    console.error("call_notes_list_failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
