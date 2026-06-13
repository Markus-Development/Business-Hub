import type { NotionBuch } from "@/lib/notion";

// Front-end alias for the book shape returned by listBuecher(). Includes
// `cover: string | null` (Google Books / OpenLibrary cover URL) and
// `tags: string[]` — see the cover-art + Tags backend layer.
export type Buch = NotionBuch;

// ===== Card-grid presentation helpers =======================================
// Unlike Freizeit, books are ONE collection (no category sections). They are
// grouped only into the three status shelves. Covers are always portrait, so the
// aspect ratio is a single constant rather than a per-category switch.

export const COVER_ASPECT_CLASS = "aspect-[2/3]";

// Tinted background + icon colour for the no-cover fallback block.
export const COVER_FALLBACK_TONE = "bg-amber-500/12 text-amber-600 dark:text-amber-300";

// Filter sentinel values (kept out of BUCHER_STATUSES / BUCHER_TAGS because
// "Alle" is a view filter, not a real Notion option).
export const FILTER_ALL = "__all";
export const TAG_ALL = "__alltags";

// Local YYYY-MM-DD for optimistic reading-date display. The server stamps its
// own timezone-aware date on the PATCH; this is only the optimistic placeholder.
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
