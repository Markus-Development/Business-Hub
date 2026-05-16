import { NextResponse } from "next/server";
import { listNotionClients, updateClientField, type ClientUpdateField } from "@/lib/notion";

export const runtime = "nodejs";

const FIELDS: ClientUpdateField[] = [
  "Industry",
  "Employees",
  "Monthly Revenue",
  "Call Notes Link",
  "Client Database Link",
  "Dashboard Link",
];

type Body = { field?: unknown; value?: unknown };

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ zohoId: string }> }) {
  const { zohoId } = await ctx.params;
  if (typeof zohoId !== "string" || zohoId.length === 0) return bad("missing_id");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }
  const { field, value } = body;
  if (typeof field !== "string" || !(FIELDS as string[]).includes(field)) {
    return bad("invalid_field");
  }

  // Per-field value validation.
  if (field === "Industry") {
    if (value !== null && typeof value !== "string") return bad("invalid_value");
  } else if (field === "Employees" || field === "Monthly Revenue") {
    if (value !== null && typeof value !== "number") return bad("invalid_value");
    if (typeof value === "number" && !Number.isFinite(value)) return bad("invalid_value");
  } else {
    // URL fields
    if (value !== null && typeof value !== "string") return bad("invalid_value");
  }

  try {
    // Resolve the Notion pageId for this Zoho contact ID. We don't trust a client-supplied
    // pageId — re-resolving server-side prevents a malicious caller from updating a different
    // client's page by passing someone else's ID.
    const all = await listNotionClients();
    const record = all.find((c) => c.zohoContactId === zohoId);
    if (!record) return bad("notion_not_linked", 404);

    await updateClientField(record.pageId, field as ClientUpdateField, value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
