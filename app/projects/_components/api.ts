import type { Project } from "@/lib/notion";
import { ROUTES } from "@/constants/routes";

export type UpdateField =
  | "Status"
  | "Priority"
  | "Name"
  | "Department"
  | "Due Date"
  | "Next Action";

export async function postProjectUpdate(
  pageId: string,
  field: UpdateField,
  value: string | null,
): Promise<{ ok: boolean; archived?: boolean; archiveId?: string; error?: string }> {
  try {
    const res = await fetch(ROUTES.api.projects.update, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, field, value }),
    });
    // A Status -> Archived write returns { ok, archived: true, archiveId } —
    // the project was moved to the Archive DB instead of edited in place.
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      archived?: boolean;
      archiveId?: string;
      error?: string;
    };
    return {
      ok: res.ok && json.ok === true,
      archived: json.archived === true,
      archiveId: json.archiveId,
      error: json.error,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch_failed" };
  }
}

export type CreateDraft = {
  name: string;
  status: string;
  department: string;
  priority: string;
  dueDate: string | null;
  nextAction: string;
  // Optional free-text page body. Server splits on newline into paragraph blocks.
  body?: string;
};

export async function postProjectCreate(
  draft: CreateDraft,
): Promise<{ ok: boolean; project?: Project; error?: string }> {
  try {
    const res = await fetch(ROUTES.api.projects.create, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      project?: Project;
      error?: string;
    };
    return { ok: res.ok && json.ok === true, project: json.project, error: json.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch_failed" };
  }
}
