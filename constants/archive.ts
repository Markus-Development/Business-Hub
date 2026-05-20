// Archive automation — the "Reason Archived" taxonomy.
// Mirrors the `Reason Archived` select options on the Notion Archive DB exactly
// (verified via the Phase 2 pre-flight). Order is the picker order.

export const REASONS_ARCHIVED = [
  "Completed",
  "Cancelled",
  "Outdated",
  "Replaced",
  "No longer relevant",
] as const;

export type ReasonArchived = (typeof REASONS_ARCHIVED)[number];

// Default reason applied when a caller archives without specifying one.
// Projects are archived mainly when finished; Resources when they stop mattering.
export const DEFAULT_REASON_PROJECT: ReasonArchived = "Completed";
export const DEFAULT_REASON_RESOURCE: ReasonArchived = "No longer relevant";
