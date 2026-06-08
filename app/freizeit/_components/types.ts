import type { NotionFreizeitItem } from "@/lib/notion";

// Front-end alias for the leisure item shape returned by listFreizeit().
// Includes `cover: string | null` (Steam header / TMDB poster URL) — see the
// cover-art backend layer.
export type FreizeitItem = NotionFreizeitItem;

// ===== Card-grid presentation helpers =======================================
// Two top-level sections: "Filme & Serien" (Film + Serie + unknown) and
// "Videospiele" (Videospiel). Section membership + cover aspect ratio + the
// no-cover fallback icon/tint are derived from the category here so the card and
// the drawer stay in sync.

export type FreizeitSection = "filmSeries" | "games";

export function sectionForCategory(category: string | null): FreizeitSection {
  return category === "Videospiel" ? "games" : "filmSeries";
}

// Cover aspect ratio: Steam headers are landscape (~460x215), TMDB posters are
// portrait (2:3). Tailwind v4 arbitrary aspect classes — static strings so JIT
// picks them up.
export function coverAspectClass(category: string | null): string {
  return category === "Videospiel" ? "aspect-[460/215]" : "aspect-[2/3]";
}

// Category-tinted background + icon colour for the no-cover fallback block.
// Mirrors the Notion select colours (Film=blue, Serie=purple, Videospiel=green).
export function categoryFallbackTone(category: string | null): string {
  switch (category) {
    case "Videospiel":
      return "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300";
    case "Serie":
      return "bg-purple-500/12 text-purple-600 dark:text-purple-300";
    case "Film":
      return "bg-blue-500/12 text-blue-600 dark:text-blue-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// Status-filter sentinel values (kept out of the FREIZEIT_STATUSES enum because
// "Aktiv" + "Alle" are view filters, not real Notion status options).
export const FILTER_ACTIVE = "__active";
export const FILTER_ALL = "__all";

// Local YYYY-MM-DD for optimistic done-date display. The server stamps its own
// timezone-aware date on the PATCH; this is only the optimistic placeholder.
export function todayLocalIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function safeFormat(fmt: Intl.DateTimeFormat, iso: string): string {
  try {
    return fmt.format(new Date(iso));
  } catch {
    return iso;
  }
}
