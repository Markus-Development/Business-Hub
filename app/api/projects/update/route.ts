import { NextResponse } from "next/server";
import { updateProjectField, type UpdateField } from "@/lib/notion";
import { PRIORITIES, STATUSES } from "@/constants/priorities";
import { AREAS } from "@/constants/areas";

export const runtime = "nodejs";

const FIELDS: UpdateField[] = ["Status", "Priority", "Name", "Area", "Due Date", "Next Action"];

type Body = { pageId?: unknown; field?: unknown; value?: unknown };

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const { pageId, field, value } = body;
  if (typeof pageId !== "string" || pageId.length === 0) return bad("missing_pageId");
  if (typeof field !== "string" || !(FIELDS as string[]).includes(field)) return bad("invalid_field");

  // Per-field value validation.
  if (field === "Status" || field === "Priority" || field === "Area") {
    if (typeof value !== "string") return bad("invalid_value");
    const allowed = field === "Status" ? STATUSES : field === "Priority" ? PRIORITIES : AREAS;
    if (!(allowed as readonly string[]).includes(value)) return bad("value_not_in_enum");
  } else if (field === "Name" || field === "Next Action") {
    if (typeof value !== "string") return bad("invalid_value");
  } else if (field === "Due Date") {
    if (value !== null && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value))) {
      return bad("invalid_date");
    }
  }

  try {
    await updateProjectField(pageId, field as UpdateField, value as string | null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
