// Einnahmen tab — frontend-only helpers (no duplicate of the backend types;
// EinnahmenGrid / EinnahmenClientRow / EinnahmenCell / EinnahmenFooter /
// EinnahmenPayment / EinnahmenClientDetail are imported from lib/einnahmen.ts).

import type { CellStatus } from "@/constants/einnahmen";
import type { EinnahmenClientDetail, EinnahmenGrid } from "@/lib/einnahmen";
import type { Locale } from "@/constants/translations";

// ----- Cache sentinels ------------------------------------------------------

export type GridState = { loading: boolean; grid: EinnahmenGrid | null; error: boolean };
export type DetailState = {
  loading: boolean;
  detail: EinnahmenClientDetail | null;
  error: boolean;
};

// Detail cache key — one entry per (client, year).
export function detailKey(zohoId: string, year: number): string {
  return `${zohoId}:${year}`;
}

// ----- Status -> CSS-var tone ----------------------------------------------
// References the scoped --einnahmen-* custom properties defined in app/globals.css
// (:root + .dark). NEVER a hex literal in a component — only these var refs, so the
// four statuses repaint contrastively on a theme switch (same approach as --pill-*).

export type CellTone = { bg: string; text: string; border: string };

export function cellTone(status: CellStatus | null): CellTone | null {
  if (!status) return null;
  return {
    bg: `var(--einnahmen-${status}-bg)`,
    text: `var(--einnahmen-${status}-text)`,
    border: `var(--einnahmen-${status}-border)`,
  };
}

// Footer metric -> the matching status text var (for the coloured legend dot).
export function footerDotVar(tone: "paid" | "open" | "overdue"): string {
  return `var(--einnahmen-${tone}-text)`;
}

// ----- Formatting -----------------------------------------------------------

function intl(locale: Locale): string {
  return locale === "de" ? "de-DE" : "en-US";
}

// Net euro amount. Grid + footer use whole euros (clean), payment rows pass
// cents:true for exact amounts.
export function formatEur(value: number, locale: Locale, opts?: { cents?: boolean }): string {
  return new Intl.NumberFormat(intl(locale), {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: opts?.cents ? 2 : 0,
    maximumFractionDigits: opts?.cents ? 2 : 0,
  }).format(value);
}

// Localised short month labels Jan..Dec (year-agnostic — uses a fixed reference year).
export function monthLabels(locale: Locale): string[] {
  const fmt = new Intl.DateTimeFormat(intl(locale), { month: "short" });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(Date.UTC(2025, m, 1))));
}

// Localised ISO date "YYYY-MM-DD" -> medium date string; falls back to the raw
// string on a malformed value rather than throwing.
export function formatDate(iso: string, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(intl(locale), { dateStyle: "medium", timeZone: "UTC" }).format(d);
}
