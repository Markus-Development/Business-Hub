import { NextResponse } from "next/server";
import { listJournalWeeks, listErfolge } from "@/lib/notion";

// Weekly Journal (read-only). Returns both source DBs in one shot: the
// Weekly-Journal weeks + all Erfolge (wins). Mirrors /api/development's error
// posture: 503 when an env var is unset, 500 on a Notion failure.
export const runtime = "nodejs";

export async function GET() {
  if (!process.env.NOTION_WEEKLY_JOURNAL_DB_ID || !process.env.NOTION_ERFOLGE_DB_ID) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  try {
    const [weeks, erfolge] = await Promise.all([listJournalWeeks(), listErfolge()]);
    return NextResponse.json({ ok: true, weeks, erfolge });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("journal_list_failed", err);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
}
