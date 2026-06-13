// Pure, framework-agnostic logic for the Weekly Journal tab.
//
// DELIBERATELY no `import "server-only"`, no Notion client, no React. Everything
// here is a pure transform of plain data so it can be unit-tested in a vanilla
// runner (see lib/journal.test.ts). The server-side Notion queries live in
// lib/notion.ts (`listJournalWeeks` / `listErfolge`) and call the mappers below.
//
// Rule: "today" is ALWAYS passed in as an ISO date string — never read from the
// wall clock inside this module — so the overdue/week logic is deterministic and
// testable. The UI computes today's ISO at the edge and hands it down.

import { WEEK_COMPLETED_STATUS, OVERDUE_THRESHOLD_WEEKDAY } from "@/constants/journal";

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

// One Weekly-Journal row (one per week).
export type JournalWeek = {
  id: string;
  name: string;
  // "Woche (Start)" — the Monday of the week, as YYYY-MM-DD (time stripped).
  weekStart: string | null;
  status: string | null; // "Entwurf" | "Abgeschlossen"
  url: string;
};

// One Erfolg (a single win).
export type Erfolg = {
  id: string;
  name: string;
  kategorie: string | null; // "Business" | "Privat" | "Weiterbildung"
  area: string | null; // free-form area tag (Marketing, Gym, Spanisch, …)
  // "Woche" relation → the Weekly-Journal page id(s) this win belongs to.
  weekIds: string[];
  status: string | null; // "Not started" | "In progress" | "Done"
  url: string;
};

// Minimal shape of a Notion page payload the mappers read from.
type RawPage = {
  id: string;
  url?: string;
  created_time?: string;
  properties: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Pure property extractors (mirror lib/notion.ts's `as*` helpers, kept local so
// this module stays free of the server-only Notion file).
// ---------------------------------------------------------------------------

function titleOf(prop: any): string {
  if (!prop || prop.type !== "title") return "";
  return prop.title?.[0]?.plain_text ?? "";
}
function selectOf(prop: any): string | null {
  if (!prop || prop.type !== "select") return null;
  return prop.select?.name ?? null;
}
function statusOf(prop: any): string | null {
  if (!prop || prop.type !== "status") return null;
  return prop.status?.name ?? null;
}
function dateOf(prop: any): string | null {
  if (!prop || prop.type !== "date") return null;
  const start = prop.date?.start ?? null;
  return typeof start === "string" ? start.slice(0, 10) : null;
}
function relationIdsOf(prop: any): string[] {
  if (!prop || prop.type !== "relation" || !Array.isArray(prop.relation)) return [];
  return prop.relation.map((r: any) => r?.id).filter((id: unknown): id is string => !!id);
}

// Notion ids come dashed (8-4-4-4-12); relation ids and page ids are both dashed
// but we normalize defensively so a stray casing/dash mismatch never breaks the
// win↔week join.
export function normalizeId(id: string): string {
  return String(id).replace(/-/g, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Mappers (Notion payload → DTO)
// ---------------------------------------------------------------------------

export function mapWeek(page: RawPage): JournalWeek {
  const p = page.properties;
  return {
    id: page.id,
    name: titleOf(p["Name"]),
    weekStart: dateOf(p["Woche (Start)"]),
    status: selectOf(p["Status"]),
    url: page.url ?? "",
  };
}

export function mapErfolg(page: RawPage): Erfolg {
  const p = page.properties;
  return {
    id: page.id,
    name: titleOf(p["Name"]),
    kategorie: selectOf(p["Kategorie"]),
    area: selectOf(p["Area"]),
    weekIds: relationIdsOf(p["Woche"]),
    status: statusOf(p["Status"]),
    url: page.url ?? "",
  };
}

// ---------------------------------------------------------------------------
// Win ↔ week assignment
// ---------------------------------------------------------------------------

// All wins whose "Woche" relation points at the given Weekly-Journal page id.
export function erfolgeForWeek(erfolge: Erfolg[], weekId: string): Erfolg[] {
  const target = normalizeId(weekId);
  return erfolge.filter((e) => e.weekIds.some((wid) => normalizeId(wid) === target));
}

// Group wins by (normalized) week id. A win related to N weeks appears under each.
export function groupErfolgeByWeek(erfolge: Erfolg[]): Record<string, Erfolg[]> {
  const out: Record<string, Erfolg[]> = {};
  for (const e of erfolge) {
    for (const wid of e.weekIds) {
      const key = normalizeId(wid);
      (out[key] ??= []).push(e);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// ISO-week date math — all functions take/return YYYY-MM-DD strings and operate
// in UTC so there is no timezone drift. "today" is always a caller-supplied ISO.
// ---------------------------------------------------------------------------

function parseUtc(iso: string): Date {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function formatIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ISO weekday: Monday = 1 … Sunday = 7.
export function isoWeekday(iso: string): number {
  return ((parseUtc(iso).getUTCDay() + 6) % 7) + 1;
}

// YYYY-MM-DD of the Monday that opens the ISO week containing `iso`.
export function mondayOf(iso: string): string {
  const d = parseUtc(iso);
  const offset = (d.getUTCDay() + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - offset);
  return formatIso(d);
}

export function addDaysIso(iso: string, n: number): string {
  const d = parseUtc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return formatIso(d);
}

// ISO 8601 week number (1–53). Week 1 is the week containing the first Thursday.
export function isoWeekNumber(iso: string): number {
  const d = parseUtc(iso);
  const offset = (d.getUTCDay() + 6) % 7;
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - offset + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstOffset = (firstThursday.getUTCDay() + 6) % 7;
  const week1Monday = new Date(firstThursday);
  week1Monday.setUTCDate(firstThursday.getUTCDate() - firstOffset);
  const weekMonday = new Date(thursday);
  weekMonday.setUTCDate(thursday.getUTCDate() - 3);
  const diffDays = Math.round((weekMonday.getTime() - week1Monday.getTime()) / 86_400_000);
  return 1 + Math.round(diffDays / 7);
}

// "01.06.2026" from a YYYY-MM-DD ISO.
export function formatDmy(iso: string): string {
  const d = parseUtc(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${m}.${d.getUTCFullYear()}`;
}

// "KW 23" for the ISO week of the given date.
export function kwLabel(iso: string): string {
  return `KW ${isoWeekNumber(iso)}`;
}

// "KW 23 (01.06.2026 – 07.06.2026)" for the ISO week of the given date.
export function weekRangeLabel(iso: string): string {
  const monday = mondayOf(iso);
  const sunday = addDaysIso(monday, 6);
  return `${kwLabel(iso)} (${formatDmy(monday)} – ${formatDmy(sunday)})`;
}

// ---------------------------------------------------------------------------
// Overdue logic
// ---------------------------------------------------------------------------

export type OverdueResult = { ueberfaellig: boolean; fehlendeKw: string };

// Overdue = the CURRENT ISO week has no Weekly-Journal row at status
// "Abgeschlossen" AND today's ISO weekday is on/after the threshold (default
// Sunday = 7). `todayIso` and `thresholdWeekday` are injected so the result is
// pure and unit-testable.
export function computeOverdue(opts: {
  weeks: Pick<JournalWeek, "weekStart" | "status">[];
  todayIso: string;
  thresholdWeekday?: number;
}): OverdueResult {
  const { weeks, todayIso } = opts;
  const threshold = opts.thresholdWeekday ?? OVERDUE_THRESHOLD_WEEKDAY;
  const monday = mondayOf(todayIso);
  const hasCompleted = weeks.some(
    (w) => w.status === WEEK_COMPLETED_STATUS && w.weekStart === monday,
  );
  const ueberfaellig = !hasCompleted && isoWeekday(todayIso) >= threshold;
  return { ueberfaellig, fehlendeKw: weekRangeLabel(todayIso) };
}
