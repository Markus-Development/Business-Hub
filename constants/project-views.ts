// Named list-views for Tab 1 (Projects), mirroring the four list views Markus
// keeps in Notion. Each view filters the Projects table + calendar by a set of
// Notion Status values.
//
// IMPORTANT: the `statuses` here intentionally include Notion Status values that
// are NOT part of the narrow `Status` union in `constants/priorities.ts`
// (Backlog / In Progress / Later / Waiting). That union drives the Kanban
// columns, the drawer Status select, and the Add-dialog select — it must stay
// limited to Active / On Hold / Done. The wider list here is for filtering only,
// so it lives in its own file and is typed as `readonly string[]`.

export const PROJECT_VIEWS = [
  { key: "open", statuses: ["Active", "In Progress", "Later"] },
  { key: "backlog", statuses: ["Backlog"] },
  { key: "onhold", statuses: ["On Hold", "Waiting"] },
  { key: "done", statuses: ["Done"] },
] as const satisfies readonly { key: string; statuses: readonly string[] }[];

export type ViewKey = (typeof PROJECT_VIEWS)[number]["key"];

// Default view shown on first load (and when no valid localStorage value exists).
export const DEFAULT_VIEW_KEY: ViewKey = "open";

// Union of every status referenced by any view — used by the server-side
// `listProjectsForViews()` loader to fetch exactly the rows the views can show.
export const PROJECT_VIEW_STATUSES: readonly string[] = Array.from(
  new Set(PROJECT_VIEWS.flatMap((v) => v.statuses)),
);
