import { NextResponse } from "next/server";
import { archiveResourcePage } from "@/lib/notion";
import { REASONS_ARCHIVED, type ReasonArchived } from "@/constants/archive";

export const runtime = "nodejs";

type Body = { reason?: unknown };

// POST /api/resources/[id]/archive — archives a Resource: copies its metadata
// into the Archive DB and moves the source page to Notion's trash. The body
// { reason? } is optional; archiveResourcePage falls back to
// DEFAULT_REASON_RESOURCE when no reason is given.
//
// Next.js 16: dynamic-segment params is a Promise (matches the other dynamic
// routes in this repo).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  // Body is optional — tolerate an empty/absent request body.
  let body: Body = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  let reason: ReasonArchived | undefined;
  if (body.reason !== undefined && body.reason !== null) {
    if (
      typeof body.reason !== "string" ||
      !(REASONS_ARCHIVED as readonly string[]).includes(body.reason)
    ) {
      return NextResponse.json({ ok: false, error: "invalid_reason" }, { status: 400 });
    }
    reason = body.reason as ReasonArchived;
  }

  try {
    const { archiveId } = await archiveResourcePage(id, { reason });
    return NextResponse.json({ ok: true, archiveId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "archive_failed";
    // eslint-disable-next-line no-console
    console.error("resource_archive_failed", { resourceId: id, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
