import { NextResponse } from "next/server";
import { archiveProjectPage, updateProjectField, type UpdateField } from "@/lib/notion";
import { PRIORITIES } from "@/constants/priorities";
import { DEPARTMENTS } from "@/constants/departments";
import { PROJECT_VIEW_STATUSES } from "@/constants/project-views";

export const runtime = "nodejs";

const FIELDS: UpdateField[] = [
  "Status",
  "Priority",
  "Name",
  "Department",
  "Due Date",
  "Next Action",
];

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

  // Intercept: Status -> Archived is not a normal property write — it moves the
  // project to the Archive DB and trashes the source page. This must run BEFORE
  // the Status enum validation below ("Archived" is intentionally NOT in
  // PROJECT_VIEW_STATUSES). Every other write falls through to the unchanged logic.
  if (field === "Status" && value === "Archived") {
    try {
      const { archiveId } = await archiveProjectPage(pageId);
      return NextResponse.json({ ok: true, archived: true, archiveId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "archive_failed";
      // eslint-disable-next-line no-console
      console.error("project_archive_failed", { pageId, error: message });
      return NextResponse.json({ ok: false, error: message }, { status: 502 });
    }
  }

  // Per-field value validation.
  if (field === "Status" || field === "Priority" || field === "Department") {
    if (typeof value !== "string") return bad("invalid_value");
    const allowed =
      field === "Status"
        ? PROJECT_VIEW_STATUSES
        : field === "Priority"
          ? PRIORITIES
          : DEPARTMENTS;
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
