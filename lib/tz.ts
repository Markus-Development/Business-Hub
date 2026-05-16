import "server-only";

// Shared timezone math used by the digest planner and the per-client month filter.
// Centralised here so all consumers share identical DST/offset behaviour.

// YYYY-MM-DD in the given timezone, derived from "right now".
export function todayInTz(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

// Returns the given timezone's local offset from UTC in ms at the given instant.
// Used to convert "9:00 local on date D" to a UTC ISO string.
export function tzOffsetMs(at: Date, timezone: string): number {
  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(localParts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - at.getTime();
}

// `hour` is 0–23 in the given timezone on `date` (YYYY-MM-DD).
// Returns the corresponding UTC ISO string for that instant.
export function localHourToIso(date: string, hour: number, timezone: string): string {
  const naive = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`);
  const offset = tzOffsetMs(naive, timezone);
  return new Date(naive.getTime() - offset).toISOString();
}

// True if the ISO timestamp falls inside the current UTC month. Used by the
// Clients tab's "this month's projects" filter and the generate-tasks idempotency check.
// Intentionally UTC-only — both callers operate on Notion `created_time`/`Due Date`
// values which are already UTC, and the month boundary tolerance doesn't matter
// enough to warrant timezone-correct math here.
export function isInCurrentMonth(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}
