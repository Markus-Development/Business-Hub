import { NextResponse } from "next/server";
import { listInboxEntries } from "@/lib/notion";

export const runtime = "nodejs";

// GET /api/inbox/list — unprocessed Inbox entries, oldest-first (FIFO). 503
// when NOTION_INBOX_DB_ID is unset so the Inbox tab renders its not-configured
// state instead of crashing.
export async function GET() {
  if (!process.env.NOTION_INBOX_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  try {
    const entries = await listInboxEntries();
    return NextResponse.json({ ok: true, entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error("inbox_list_failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
