import { NextResponse } from "next/server";
import { createBlock } from "@/lib/google";
import { supabaseServer } from "@/lib/supabase-server";
import { getUserSettings } from "@/lib/settings";
import { TABLES } from "@/constants/tables";

export const runtime = "nodejs";

type SuggestionRow = {
  id: string;
  created_at: string;
  date: string;
  project_name: string;
  start_at: string;
  end_at: string;
  rationale: string;
  status: string;
  google_event_id: string | null;
  batch_id: string;
};

const ROW_COLS =
  "id, created_at, date, project_name, start_at, end_at, rationale, status, google_event_id, batch_id";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (typeof id !== "string" || id.length === 0) return bad("missing_id");

  const db = supabaseServer();
  const { data: row, error: readErr } = await db
    .from(TABLES.TIME_BLOCK_SUGGESTIONS)
    .select(ROW_COLS)
    .eq("id", id)
    .maybeSingle();
  if (readErr) return bad(`read_failed:${readErr.message}`, 500);
  if (!row) return bad("not_found", 404);
  const suggestion = row as SuggestionRow;
  if (suggestion.status !== "pending") return bad("not_pending", 409);

  let event;
  try {
    const settings = await getUserSettings();
    const calendarId = settings.master_calendar_id ?? "primary";
    event = await createBlock(
      suggestion.project_name,
      suggestion.start_at,
      suggestion.end_at,
      calendarId,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "calendar_insert_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  const { data: updated, error: updateErr } = await db
    .from(TABLES.TIME_BLOCK_SUGGESTIONS)
    .update({ status: "confirmed", google_event_id: event.id })
    .eq("id", id)
    .eq("status", "pending")
    .select(ROW_COLS)
    .maybeSingle();
  if (updateErr) return bad(`update_failed:${updateErr.message}`, 500);
  if (!updated) return bad("race_lost", 409);

  return NextResponse.json({ suggestion: updated as SuggestionRow });
}
