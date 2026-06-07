import { NextResponse } from "next/server";
import {
  createProject,
  createResource,
  appendTextBlocks,
  updateInboxEntry,
  type ProjectDraft,
  type ResourceDraft,
} from "@/lib/notion";
import { DEPARTMENTS } from "@/constants/departments";
import { PRIORITIES, type Priority } from "@/constants/priorities";
import { RESOURCE_TYPES } from "@/constants/resource-types";
import { INBOX_TYPES } from "@/constants/inbox";

export const runtime = "nodejs";

type Action = "project" | "resource" | "someday";

type Body = {
  entryId?: unknown;
  action?: unknown;
  payload?: unknown;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SOMEDAY: (typeof INBOX_TYPES)[number] = "Someday";

export async function POST(req: Request) {
  if (!process.env.NOTION_INBOX_DB_ID) return bad("not_configured", 503);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const { entryId, action } = body;
  if (typeof entryId !== "string" || entryId.trim().length === 0) return bad("missing_entry_id");
  if (action !== "project" && action !== "resource" && action !== "someday") {
    return bad("invalid_action");
  }
  const payload = (body.payload ?? {}) as Record<string, unknown>;

  // --- Someday: no create; just flag the Inbox entry. ---
  if (action === "someday") {
    try {
      await updateInboxEntry(entryId, {
        processed: true,
        type: SOMEDAY,
        routedTo: "Someday",
      });
      return NextResponse.json({ ok: true, destination: "someday" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      // eslint-disable-next-line no-console
      console.error("inbox_process_someday_failed", message);
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
  }

  // --- Project / Resource: create the destination first, then flag the entry. ---
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title) return bad("missing_title");
  const pageBody = typeof payload.body === "string" ? payload.body : "";

  let destinationUrl = "";
  let routedTo = "";
  const destination: Action = action;

  try {
    if (action === "project") {
      const department = typeof payload.department === "string" ? payload.department : "";
      if (!(DEPARTMENTS as readonly string[]).includes(department)) return bad("invalid_department");
      const priority = typeof payload.priority === "string" ? payload.priority : "";
      if (!(PRIORITIES as readonly string[]).includes(priority)) return bad("invalid_priority");
      const nextAction = typeof payload.nextAction === "string" ? payload.nextAction : "";
      const dueDate =
        typeof payload.dueDate === "string" && payload.dueDate.length > 0 ? payload.dueDate : null;
      if (dueDate !== null && !DATE_RE.test(dueDate)) return bad("invalid_due_date");

      const draft: ProjectDraft = {
        name: title,
        status: "Active",
        department,
        priority: priority as Priority,
        dueDate,
        nextAction,
      };
      const project = await createProject(draft);
      destinationUrl = project.url;
      routedTo = `Project: ${title}`;

      // Append body as paragraph blocks — non-fatal (same as /api/projects/create).
      if (pageBody.trim()) {
        await appendTextBlocks(project.id, pageBody).catch((err) => {
          // eslint-disable-next-line no-console
          console.warn("append_blocks_failed", err);
        });
      }
    } else {
      // action === "resource"
      const area = typeof payload.area === "string" && payload.area.length > 0 ? payload.area : null;
      const type = typeof payload.type === "string" ? payload.type : "";
      if (!(RESOURCE_TYPES as readonly string[]).includes(type)) return bad("invalid_type");

      const draft: ResourceDraft = { name: title, area, type, body: pageBody };
      const resource = await createResource(draft);
      destinationUrl = resource.notionUrl;
      routedTo = `Resource: ${title}`;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error("inbox_process_create_failed", action, message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  // Destination created. Flag the Inbox entry — but if THIS fails, do NOT lose
  // the created Project/Resource: log both and still return ok with a warning.
  try {
    await updateInboxEntry(entryId, { processed: true, routedTo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error(
      `inbox_process_mark_failed: destination created but Inbox entry not flagged. ` +
        `entryId=${entryId} destinationUrl=${destinationUrl}`,
      message,
    );
    return NextResponse.json({
      ok: true,
      destination,
      url: destinationUrl,
      warning: "inbox_update_failed",
    });
  }

  return NextResponse.json({ ok: true, destination, url: destinationUrl });
}
