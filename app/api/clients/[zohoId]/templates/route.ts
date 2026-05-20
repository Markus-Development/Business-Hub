import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { TABLES } from "@/constants/tables";
import { MONTHLY_TASK_NAMES, type MonthlyTaskName } from "@/constants/client-tasks";

export const runtime = "nodejs";

// PostgREST returns code "PGRST205" when the table is not in the schema cache;
// PostgreSQL itself returns "42P01" for a missing relation. Either means the
// migration has not been run yet — degrade silently rather than 500.
function isMissingTableError(code: string | undefined): boolean {
  return code === "PGRST205" || code === "42P01";
}

function isMonthlyTaskName(s: unknown): s is MonthlyTaskName {
  return typeof s === "string" && (MONTHLY_TASK_NAMES as readonly string[]).includes(s);
}

export async function GET(_req: Request, ctx: { params: Promise<{ zohoId: string }> }) {
  const { zohoId } = await ctx.params;
  if (!zohoId) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const db = supabaseServer();
  const { data, error } = await db
    .from(TABLES.CLIENT_TEMPLATE_OVERRIDES)
    .select("id, template_key, custom_text")
    .eq("zoho_contact_id", zohoId);

  if (error) {
    if (isMissingTableError(error.code)) {
      // eslint-disable-next-line no-console
      console.warn(
        "client_template_overrides table not found — run migration 20260520120000_client_template_overrides.sql",
      );
      return NextResponse.json({ overrides: {} });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const overrides: Record<string, string> = {};
  for (const row of data ?? []) {
    overrides[row.template_key as string] = row.custom_text as string;
  }
  return NextResponse.json({ overrides });
}

export async function PUT(req: Request, ctx: { params: Promise<{ zohoId: string }> }) {
  const { zohoId } = await ctx.params;
  if (!zohoId) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const { template_key, custom_text } = (body ?? {}) as {
    template_key?: unknown;
    custom_text?: unknown;
  };

  if (!isMonthlyTaskName(template_key)) {
    return NextResponse.json(
      { ok: false, error: "invalid_template_key" },
      { status: 400 },
    );
  }
  if (typeof custom_text !== "string") {
    return NextResponse.json(
      { ok: false, error: "invalid_custom_text" },
      { status: 400 },
    );
  }

  const db = supabaseServer();
  const { error } = await db
    .from(TABLES.CLIENT_TEMPLATE_OVERRIDES)
    .upsert(
      {
        zoho_contact_id: zohoId,
        template_key,
        custom_text,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "zoho_contact_id,template_key" },
    );

  if (error) {
    if (isMissingTableError(error.code)) {
      return NextResponse.json(
        { ok: false, error: "migration_not_run" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ zohoId: string }> }) {
  const { zohoId } = await ctx.params;
  if (!zohoId) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }
  const url = new URL(req.url);
  const template_key = url.searchParams.get("template_key");
  if (!isMonthlyTaskName(template_key)) {
    return NextResponse.json(
      { ok: false, error: "invalid_template_key" },
      { status: 400 },
    );
  }

  const db = supabaseServer();
  const { error } = await db
    .from(TABLES.CLIENT_TEMPLATE_OVERRIDES)
    .delete()
    .eq("zoho_contact_id", zohoId)
    .eq("template_key", template_key);

  if (error) {
    if (isMissingTableError(error.code)) {
      // No row to delete if the table doesn't exist — treat as a no-op success
      // so the UI's Reset button stays idempotent.
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
