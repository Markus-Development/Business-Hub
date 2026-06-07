import { NextResponse } from "next/server";
import { createAreaProject } from "@/lib/notion-areas";

export const runtime = "nodejs";

type ProjectInput = {
  name?: unknown;
  dueDate?: unknown;
};

type Body = {
  department?: unknown;
  projects?: unknown;
};

// Matches a YYYY-MM-DD date string. Notion's `date.start` also accepts datetimes,
// but the panel's <input type="date"> always emits this calendar-day shape.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/areas/review/projects
// Manual "new projects" panel from the Areas Review step. Creates one Projects-DB
// page per valid entry in the area's department (Status=Active, Priority=Medium).
// Per-item failures (bad date, Notion error) are collected into failed[] and do
// NOT abort the whole request — every other valid entry still lands.
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { department, projects } = body;

  if (typeof department !== "string" || department.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "missing_department" }, { status: 400 });
  }

  if (!Array.isArray(projects)) {
    return NextResponse.json({ ok: false, error: "invalid_projects" }, { status: 400 });
  }

  if (!process.env.NOTION_PROJECTS_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const dept = department.trim();
  const created: { name: string; id: string; url: string }[] = [];
  const failed: { name: string; error: string }[] = [];

  for (const entry of projects as ProjectInput[]) {
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    if (!name) {
      failed.push({ name: "", error: "missing_name" });
      continue;
    }

    let dueDate: string | null = null;
    if (entry?.dueDate !== undefined && entry?.dueDate !== null && entry?.dueDate !== "") {
      if (typeof entry.dueDate !== "string" || !ISO_DATE.test(entry.dueDate)) {
        failed.push({ name, error: "invalid_due_date" });
        continue;
      }
      dueDate = entry.dueDate;
    }

    try {
      const { id, url } = await createAreaProject({ name, department: dept, dueDate });
      created.push({ name, id, url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      // eslint-disable-next-line no-console
      console.error("area_review_project_create_failed", name, message);
      failed.push({ name, error: message });
    }
  }

  return NextResponse.json({ ok: true, created, failed });
}
