import { NextResponse } from "next/server";
import { appendTextBlocks, createProject, type ProjectDraft } from "@/lib/notion";
import { PRIORITIES, STATUSES, type Priority, type Status } from "@/constants/priorities";
import { AREAS } from "@/constants/areas";

export const runtime = "nodejs";

type Body = {
  name?: unknown;
  status?: unknown;
  area?: unknown;
  priority?: unknown;
  dueDate?: unknown;
  nextAction?: unknown;
  body?: unknown;
};

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

  const { name, status, area, priority, dueDate, nextAction, body: pageBody } = body;

  if (typeof name !== "string" || name.trim().length === 0) return bad("missing_name");
  if (typeof status !== "string" || !(STATUSES as readonly string[]).includes(status)) return bad("invalid_status");
  if (typeof area !== "string" || !(AREAS as readonly string[]).includes(area)) return bad("invalid_area");
  if (typeof priority !== "string" || !(PRIORITIES as readonly string[]).includes(priority)) return bad("invalid_priority");
  if (dueDate !== null && dueDate !== "" && (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(dueDate))) {
    return bad("invalid_date");
  }
  if (typeof nextAction !== "string") return bad("invalid_nextAction");
  // `body` is optional: undefined/null/string accepted; anything else rejected.
  if (pageBody !== undefined && pageBody !== null && typeof pageBody !== "string") {
    return bad("invalid_body");
  }

  const draft: ProjectDraft = {
    name: name.trim(),
    status: status as Status,
    area,
    priority: priority as Priority,
    dueDate: dueDate ? (dueDate as string) : null,
    nextAction,
  };

  try {
    const project = await createProject(draft);
    // Non-fatal: the page exists even if the block append fails. We log a
    // warning and still return the created project so the UI doesn't show
    // a misleading error for a partial success.
    if (typeof pageBody === "string" && pageBody.trim()) {
      await appendTextBlocks(project.id, pageBody).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("append_blocks_failed", err);
      });
    }
    return NextResponse.json({ ok: true, project });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
