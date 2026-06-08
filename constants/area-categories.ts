// Über-categories for the Areas tab. These strings are both the display order
// and the grouping order, and must match the Notion Areas DB `Kategorie` select
// options exactly (case-sensitive). Never hardcode these values elsewhere.
export const AREA_CATEGORIES = ["Business", "Privat", "Weiterbildung"] as const;

export type AreaCategory = (typeof AREA_CATEGORIES)[number];
