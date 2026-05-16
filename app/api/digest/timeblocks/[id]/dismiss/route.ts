import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
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
  const { data, error } = await db
    .from(TABLES.TIME_BLOCK_SUGGESTIONS)
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("status", "pending")
    .select(ROW_COLS)
    .maybeSingle();
  if (error) return bad(`update_failed:${error.message}`, 500);
  if (!data) return bad("not_pending_or_missing", 409);

  return NextResponse.json({ suggestion: data as SuggestionRow });
}
