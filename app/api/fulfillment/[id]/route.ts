import { NextResponse } from "next/server";
import { updateFulfillmentField } from "@/lib/notion";
import { FULFILLMENT_STAGES, type FulfillmentStage } from "@/constants/fulfillment";

export const runtime = "nodejs";

type Body = { field?: unknown; value?: unknown };

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

// Next.js 16: dynamic-segment params is a Promise. Matches the other dynamic
// routes in this repo (/api/buecher/[id], /api/freizeit/[id], etc.).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!process.env.NOTION_FULFILLMENT_DB_ID) {
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

  const { field, value } = body;
  if (
    typeof field !== "string" ||
    !FULFILLMENT_STAGES.includes(field as FulfillmentStage)
  ) {
    return bad("invalid_field");
  }
  if (typeof value !== "boolean") {
    return bad("invalid_value");
  }

  try {
    await updateFulfillmentField(id, field, value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
