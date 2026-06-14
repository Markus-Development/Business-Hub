// Einnahmen tab (revenue grid) — shared taxonomy + pure helpers.
// Phase 1 is the server-side read path only (Zoho + Notion -> grid payload).
// No UI strings here — i18n lives in the frontend layer. No Date/timezone math
// here either; the only timezone-aware "today" is resolved in lib/einnahmen.ts
// via lib/tz.ts. Keep this module pure + framework-agnostic.

// The status of a single month cell for one client.
//  - "paid"     = invoice exists in that month and its balance is 0
//  - "overdue"  = invoice exists, balance > 0, due_date is in the past
//  - "open"     = invoice exists, balance > 0, due_date is today or future
//  - "forecast" = no invoice yet, but the client has a Monthly Fee > 0 (projected)
export type CellStatus = "paid" | "overdue" | "open" | "forecast";

export const CELL_STATUSES: readonly CellStatus[] = [
  "paid",
  "overdue",
  "open",
  "forecast",
] as const;

// Placeholder monthly cost used in the footer's profit formula. Phase 1 has no
// configurable cost source, so it is a single named 0.
// TODO Phase 3: replace with a configurable Supabase value (per month / global).
export const DEFAULT_MONTHLY_COSTS = 0;

// "YYYY-MM-DD" -> month index 0..11. Pure string math (no Date / timezone), so it
// is deterministic regardless of runtime zone — mirrors the constants/fulfillment.ts
// style. Returns -1 on malformed input so callers can skip rather than crash.
export function monthIndexFromIso(iso: string | null | undefined): number {
  if (!iso || typeof iso !== "string") return -1;
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return -1;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return -1;
  return month - 1;
}

// Minimal shape needed to derive a human-readable account/method label for a
// payment. The real Zoho payment object carries more fields — this only names the
// three we fall back through.
export type PaymentLabelSource = {
  payment_mode_formatted?: string | null;
  payment_mode?: string | null;
  account_name?: string | null;
};

// Human "Konto"/method label for a payment, e.g. "Stripe". Prefer the formatted
// mode, then the raw mode, then the deposit account name (verified against the
// live Zoho response in Phase 0 — account_name carries values like "Stripe Clearing").
export function paymentLabel(p: PaymentLabelSource): string {
  const formatted = p.payment_mode_formatted?.trim();
  if (formatted) return formatted;
  const mode = p.payment_mode?.trim();
  if (mode) return mode;
  const account = p.account_name?.trim();
  if (account) return account;
  return "";
}
