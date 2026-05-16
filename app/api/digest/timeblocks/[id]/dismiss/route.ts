import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { TABLES } from "@/constants/tables";
import { ROW_COLS, type SuggestionRow } from "../../_lib";

export const runtime = "nodejs";

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
