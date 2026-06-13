import { NextResponse } from "next/server";
import { getBuch, updateBuch } from "@/lib/notion";
import { BUCHER_STATUSES, type BucherStatus } from "@/constants/buecher";
import { getUserSettings } from "@/lib/settings";
import { todayInTz } from "@/lib/tz";

export const runtime = "nodejs";

type Body = {
  status?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  link?: unknown;
  note?: unknown;
};

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

// Next.js 16: dynamic-segment params is a Promise. Matches the other dynamic
// routes in this repo (/api/freizeit/[id], /api/clients/[zohoId], etc.).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!process.env.NOTION_BUCHER_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!id) return bad("missing_id");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const { status, startDate, endDate, link, note } = body;
  if (status !== undefined && !BUCHER_STATUSES.includes(status as BucherStatus)) {
    return bad("invalid_status");
  }
  if (startDate !== undefined && startDate !== null && typeof startDate !== "string") {
    return bad("invalid_start_date");
  }
  if (endDate !== undefined && endDate !== null && typeof endDate !== "string") {
    return bad("invalid_end_date");
  }
  if (link !== undefined && link !== null && typeof link !== "string") return bad("invalid_link");
  if (note !== undefined && note !== null && typeof note !== "string") return bad("invalid_note");

  const patch: {
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
    link?: string | null;
    note?: string | null;
  } = {};

  if (status !== undefined) patch.status = status as string;
  // Explicit date edits from the body always apply.
  if (startDate !== undefined) {
    patch.startDate = typeof startDate === "string" && startDate.length > 0 ? startDate : null;
  }
  if (endDate !== undefined) {
    patch.endDate = typeof endDate === "string" && endDate.length > 0 ? endDate : null;
  }
  if (link !== undefined) patch.link = typeof link === "string" && link.length > 0 ? link : null;
  if (note !== undefined) patch.note = typeof note === "string" && note.length > 0 ? note : null;

  // Server-side reading-date tracker: when a status moves to "Aktuell" stamp
  // Startdatum with today (only if currently empty and not set in this request);
  // when it moves to "Gelesen" stamp Enddatum the same way. Moving back to
  // "Demnächst" leaves both dates untouched. Only read the current page for the
  // two statuses that need it, to stay Notion-rate-limit friendly.
  if (status === "Aktuell" || status === "Gelesen") {
    try {
      const current = await getBuch(id);
      const { timezone } = await getUserSettings();
      const today = todayInTz(timezone);
      if (status === "Aktuell" && patch.startDate === undefined && !current.startDate) {
        patch.startDate = today;
      }
      if (status === "Gelesen" && patch.endDate === undefined && !current.endDate) {
        patch.endDate = today;
      }
    } catch (err) {
      // Soft-fail the auto-stamp — never block the status write on a read error.
      console.warn("[buecher] date_stamp_skipped", err);
    }
  }

  try {
    await updateBuch(id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
