// Development tab taxonomy. These strings MUST match the Notion Projects DB
// select options exactly (case-sensitive) — `Product` and `Dev Type`. Dev items
// are flagged by the existing `Department` select option "Development". Never
// hardcode these option strings anywhere else — import from here.

import type { TranslationKey } from "@/constants/translations";

export const PRODUCTS = [
  "Business Hub",
  "EasyFinance",
  "Familien-Stammbaum",
] as const;

export type Product = (typeof PRODUCTS)[number];

export const DEV_TYPES = ["Feature", "Bug", "Anpassung"] as const;

export type DevType = (typeof DEV_TYPES)[number];

// The Department select option that flags a project as dev work.
export const DEVELOPMENT_DEPARTMENT = "Development";

// ===== Status buckets (Development-tab Status filter) =======================
// Curated buckets layered over the raw Notion Status names. The Projects DB has
// more Status options than the narrow Active/On Hold/Done union; on the Dev tab
// we collapse them into five planning buckets instead of exposing every option.
//
// "Nicht relevant" is a Notion Status option (Complete group) added manually by
// Markus — case-sensitive, must match Notion exactly.

export const STATUS_BACKLOG = "Backlog";
export const STATUS_DONE = "Done";
export const STATUS_ARCHIVED = "Archived";
export const STATUS_NOT_RELEVANT = "Nicht relevant";

// Statuses excluded from the "active" bucket — everything else (Active, In
// Progress, Later, On Hold, Waiting, …) counts as active dev work.
const NON_ACTIVE_STATUSES: readonly string[] = [
  STATUS_BACKLOG,
  STATUS_DONE,
  STATUS_ARCHIVED,
  STATUS_NOT_RELEVANT,
];

// Display order + i18n label keys. `active` / `done` reuse the existing
// status.* keys; the rest get dedicated development.bucket.* keys.
export const DEV_STATUS_BUCKETS = [
  { key: "all", labelKey: "development.bucket.all" },
  { key: "active", labelKey: "status.Active" },
  { key: "backlog", labelKey: "development.bucket.backlog" },
  { key: "done", labelKey: "status.Done" },
  { key: "not_relevant", labelKey: "development.bucket.notRelevant" },
] as const satisfies readonly { key: string; labelKey: TranslationKey }[];

export type DevStatusBucket = (typeof DEV_STATUS_BUCKETS)[number]["key"];

export const DEFAULT_DEV_STATUS_BUCKET: DevStatusBucket = "active";

// True when a project's Notion Status name belongs to the given bucket.
//   backlog      → Status === "Backlog"
//   done         → Status === "Done"
//   not_relevant → Status === "Nicht relevant"
//   active       → anything NOT in { Backlog, Done, Archived, Nicht relevant }
//   all          → no status filter
export function matchesDevStatusBucket(
  bucket: DevStatusBucket,
  status: string | null,
): boolean {
  switch (bucket) {
    case "all":
      return true;
    case "backlog":
      return status === STATUS_BACKLOG;
    case "done":
      return status === STATUS_DONE;
    case "not_relevant":
      return status === STATUS_NOT_RELEVANT;
    case "active":
      return status != null && !NON_ACTIVE_STATUSES.includes(status);
    default:
      return true;
  }
}
