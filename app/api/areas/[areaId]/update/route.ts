import { NextResponse } from "next/server";
import { updateAreaField, type AreaUpdateField } from "@/lib/notion";

export const runtime = "nodejs";

const FIELDS: AreaUpdateField[] = [
  "Current Milestone",
  "Next Steps",
  "Next Focus",
  "Goal",
  "Status",
];

// Status select options match those seeded by scripts/create-areas-db.mjs.
const STATUS_VALUES = ["Active", "Needs Attention", "Paused"] as const;

type Body = { field?: unknown; value?: unknown };

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ areaId: string }> }) {
  const { areaId } = await ctx.params;
  if (typeof areaId !== "string" || areaId.length === 0) return bad("missing_areaId");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const { field, value } = body;
  if (typeof field !== "string" || !(FIELDS as string[]).includes(field)) return bad("invalid_field");
  if (typeof value !== "string") return bad("invalid_value");

  if (field === "Status" && !(STATUS_VALUES as readonly string[]).includes(value)) {
    return bad("value_not_in_enum");
  }

  try {
    await updateAreaField(areaId, field as AreaUpdateField, value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
