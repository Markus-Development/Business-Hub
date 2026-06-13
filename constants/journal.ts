// Weekly Journal taxonomy. These strings are case-sensitive and MUST match the
// Notion select / status options exactly (see CLAUDE.md → PARA Data Model →
// Weekly Journal / Erfolge). Never hardcode these option strings elsewhere —
// import from here so a Notion option rename is a one-line edit.

// Erfolge "Kategorie" select — also the Journal-Kanban column order. Shares the
// same three values as the Areas-tab Kategorie (constants/area-categories.ts),
// but the Erfolge DB owns its own select, so it gets its own constant.
export const JOURNAL_KATEGORIEN = ["Business", "Privat", "Weiterbildung"] as const;
export type JournalKategorie = (typeof JOURNAL_KATEGORIEN)[number];

// Weekly Journal "Status" select (one row per week).
export const JOURNAL_WEEK_STATUSES = ["Entwurf", "Abgeschlossen"] as const;
export type JournalWeekStatus = (typeof JOURNAL_WEEK_STATUSES)[number];

// The week-status value that marks a week as fully reviewed. The overdue check
// fires when the CURRENT ISO week has no Weekly-Journal row at this status.
export const WEEK_COMPLETED_STATUS: JournalWeekStatus = "Abgeschlossen";

// Erfolge "Status" (a Notion `status` property, not a `select`).
export const ERFOLG_STATUSES = ["Not started", "In progress", "Done"] as const;
export type ErfolgStatus = (typeof ERFOLG_STATUSES)[number];

// Overdue threshold: ISO weekday (Mon=1 … Sun=7) on/after which an un-finished
// current week counts as overdue. 7 = Sunday. Single knob — change here to move
// the reminder earlier/later in the week.
export const OVERDUE_THRESHOLD_WEEKDAY = 7;

// Public Notion URL of the Weekly Journal database — the overdue banner links
// here so Markus can fill in the missing week directly in Notion. Derived from
// the database_id (9c8a7e60946d42f6994d977b432398e1).
export const JOURNAL_NOTION_DB_URL =
  "https://www.notion.so/9c8a7e60946d42f6994d977b432398e1";
