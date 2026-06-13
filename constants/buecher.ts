// Bücher (personal library) taxonomy — Buchtitel, Autor, Lese-Status, Tags.
// Values are case-sensitive and MUST match the Notion "Bücher" DB select /
// multi_select options exactly (created by scripts/create-buecher-db.mjs).
// Mirrors the constants pattern of constants/freizeit.ts.

export const BUCHER_STATUSES = ["Gelesen", "Aktuell", "Demnächst"] as const;
export type BucherStatus = (typeof BUCHER_STATUSES)[number];

// Display order of the status shelves on the Bücher card grid (top → bottom).
// Intentionally separate from BUCHER_STATUSES — that constant drives validation
// and the Status-select option order (unchanged), while this only reorders the
// shelf sections in the UI. All three values are the same BucherStatus set.
export const BUCHER_SHELF_ORDER = ["Aktuell", "Demnächst", "Gelesen"] as const;

// Seed tags — the Notion multi_select is extensible, so this list is only the
// initial set the DB-creation script seeds. New tags can be added in Notion.
export const BUCHER_TAGS = ["Business", "Mindset", "Fiction", "Finance"] as const;
export type BucherTag = (typeof BUCHER_TAGS)[number];

// ===== Cover-art resolution endpoints =======================================
// Google Books (primary) + OpenLibrary (fallback) — both keyless. An optional
// GOOGLE_BOOKS_API_KEY only raises the daily quota. Never inline these URLs in
// code — import from here so an endpoint change is a one-line edit (mirrors the
// constants discipline in CLAUDE.md).

// Google Books volumes search — first result yields imageLinks.thumbnail.
export const GOOGLE_BOOKS_SEARCH_URL = "https://www.googleapis.com/books/v1/volumes";

// OpenLibrary search — first doc yields cover_i.
export const OPENLIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";

// OpenLibrary cover image for a resolved cover id. size ∈ "S" | "M" | "L".
export const OPENLIBRARY_COVER_URL = (
  coverId: number | string,
  size: "S" | "M" | "L" = "L",
): string => `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
