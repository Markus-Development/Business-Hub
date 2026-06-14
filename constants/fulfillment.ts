// Fulfillment taxonomy (Tab "Fulfillment") — a monthly checkbox grid over all
// clients tracking the fulfillment cycle. The four stages are Notion checkbox
// properties on the "🚚 10 Fulfillment" DB (created by
// scripts/create-fulfillment-db.mjs). Values are case-sensitive and MUST match
// the Notion checkbox-property names exactly. Never inline these strings.

export const FULFILLMENT_STAGES = [
  "Call Termin",
  "Transaktionen",
  "Ready",
  "Fertig",
] as const;
export type FulfillmentStage = (typeof FULFILLMENT_STAGES)[number];

// The Notion Clients-DB `Status` value(s) that mean a client is paused. Paused
// clients still appear in the grid (greyed out, checkboxes disabled) but are
// sorted to the bottom. The pause state is NOT stored on the fulfillment row —
// it is joined live from the Clients DB at load time, so changing a client's
// status in Notion is reflected immediately. Kept as an array so additional
// "paused"-equivalent statuses can be added without touching call sites.
// Must match the Notion Clients-DB `Status` option exactly: "Paused" (English).
export const PAUSED_CLIENT_STATUSES = ["Paused"] as const;
export type PausedClientStatus = (typeof PAUSED_CLIENT_STATUSES)[number];

// True when a (possibly null) Notion client status counts as paused. Kept for the
// status-pill colour distinction (Paused renders gray like Inactive, but the two
// stay separable here if they ever need different treatment).
export function isPausedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (PAUSED_CLIENT_STATUSES as readonly string[]).includes(status);
}

// The Notion Clients-DB `Status` values that count as "not active" in the
// fulfillment grid: such clients are greyed out, their checkboxes disabled, and
// they sort to the bottom. They are NOT removed — a header toggle hides/shows
// them. Active + Reduced are the active states (editable). Values must match the
// Notion Clients-DB `Status` options exactly (English): "Paused", "Inactive".
export const MUTED_CLIENT_STATUSES = ["Paused", "Inactive"] as const;
export type MutedClientStatus = (typeof MUTED_CLIENT_STATUSES)[number];

// True when a (possibly null) Notion client status counts as not-active (muted).
export function isMutedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (MUTED_CLIENT_STATUSES as readonly string[]).includes(status);
}

// Maps a Notion client status to a Notion pill colour name consumed by
// constants/priorities.ts notionColourBg / notionColourText (theme-aware CSS
// vars). Active -> green, Reduced -> yellow, Paused/Inactive/unknown -> gray.
const CLIENT_STATUS_COLOUR: Record<string, string> = {
  Active: "green",
  Reduced: "yellow",
  Paused: "gray",
  Inactive: "gray",
};

export function clientStatusColour(status: string | null | undefined): string {
  if (!status) return "gray";
  return CLIENT_STATUS_COLOUR[status] ?? "gray";
}

// ===== Month identity helpers ===============================================
// A month is identified everywhere by the "YYYY-MM" key, but stored in Notion as
// the 1st of that month (an ISO date "YYYY-MM-01"). These two helpers convert
// between the two representations. Pure string math — no Date/timezone math, so
// they are deterministic regardless of the runtime zone.

// "2026-06" -> "2026-06-01"
export function monthKeyToFirstOfMonthIso(monthKey: string): string {
  return `${monthKey}-01`;
}

// "2026-06-01" (or any "YYYY-MM-...") -> "2026-06". Returns null on malformed
// input so callers can skip the row rather than crash.
export function firstOfMonthIsoToMonthKey(iso: string | null | undefined): string | null {
  if (!iso || typeof iso !== "string") return null;
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  return m ? `${m[1]}-${m[2]}` : null;
}
