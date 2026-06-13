export const PRIORITIES = ["High", "Medium", "Low"] as const;

export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["Active", "On Hold", "Done"] as const;

export type Status = (typeof STATUSES)[number];

// Notion's option `color` field uses these names. The mapping below renders each
// as a concrete CSS colour token usable as a left-border on a badge. Used by the
// Projects table to colour Status / Area cells from live Notion data rather than
// hardcoded enum-based colours.
export const NOTION_COLOUR_MAP: Record<string, string> = {
  default: "var(--muted-foreground)",
  gray: "#9ca3af",
  brown: "#92400e",
  orange: "#ea580c",
  yellow: "#d97706",
  green: "#16a34a",
  blue: "#2563eb",
  purple: "#7c3aed",
  pink: "#db2777",
  red: "#dc2626",
};

export function notionColour(name: string | null | undefined): string {
  if (!name) return NOTION_COLOUR_MAP.default;
  return NOTION_COLOUR_MAP[name] ?? NOTION_COLOUR_MAP.default;
}

// Light background fills matching Notion's tag palette — used as the `background`
// on rendered option pills (Status / Area cells in the Projects table).
//
// NOTE: these *_MAP objects document the light-mode source values and seed the
// `--pill-*` CSS custom properties in app/globals.css (:root). The helper functions
// below DO NOT read these maps at render time — they return `var(--pill-…)` so dark
// mode (.dark in globals.css) can override the fill/text per-theme for contrast. Keep
// the maps in sync with the :root seed values if either changes.
export const NOTION_COLOUR_BG_MAP: Record<string, string> = {
  default: "rgba(227,226,224,0.5)",
  gray:    "rgba(227,226,224,0.5)",
  brown:   "rgba(238,224,218,0.6)",
  orange:  "rgba(250,222,201,0.6)",
  yellow:  "rgba(253,236,200,0.6)",
  green:   "rgba(219,237,219,0.6)",
  blue:    "rgba(211,229,239,0.6)",
  purple:  "rgba(232,222,238,0.6)",
  pink:    "rgba(245,224,233,0.6)",
  red:     "rgba(255,226,221,0.6)",
};

// Darker text colours for readability on top of the light fills above. These
// pair 1:1 with NOTION_COLOUR_BG_MAP entries.
export const NOTION_COLOUR_TEXT_MAP: Record<string, string> = {
  default: "#787774",
  gray:    "#787774",
  brown:   "#976d57",
  orange:  "#d9730d",
  yellow:  "#cb912f",
  green:   "#448361",
  blue:    "#337ea9",
  purple:  "#9065b0",
  pink:    "#c14c8a",
  red:     "#d44c47",
};

// The pill fill/text helpers return CSS-variable references (defined in
// app/globals.css under :root with light values and .dark with higher-contrast
// dark-mode overrides) rather than literal colours, so a theme switch repaints the
// pills live. Unknown / null names fall back to the `default` pill vars.
const KNOWN_PILL_COLOURS = new Set(Object.keys(NOTION_COLOUR_BG_MAP));

export function notionColourBg(name: string | null | undefined): string {
  const key = name && KNOWN_PILL_COLOURS.has(name) ? name : "default";
  return `var(--pill-bg-${key})`;
}

export function notionColourText(name: string | null | undefined): string {
  const key = name && KNOWN_PILL_COLOURS.has(name) ? name : "default";
  return `var(--pill-text-${key})`;
}

// Priority traffic-light pills for the Projects table (High = red, Medium = amber,
// Low = green). Light fill + matching darker text, mirroring the Notion-pill style
// in NOTION_COLOUR_BG_MAP / NOTION_COLOUR_TEXT_MAP above.
//
// SCOPED COLOUR EXCEPTION (Tier-2 palette): red / amber / green are not theme
// tokens, so these are deliberately scoped OKLCH literals — the same exception the
// Projects-calendar already makes for Medium priority. The Medium text value
// reuses that calendar amber (`oklch(0.68 0.16 75)`) verbatim so the two surfaces
// agree. No hex; keep these confined to priority rendering only.
//
// As with the Notion maps above, these objects document the light-mode source
// values and seed the `--pill-bg-{high,medium,low}` / `--pill-text-*` vars in
// app/globals.css. priorityColourBg / priorityColourText return `var(--pill-…)` (with
// per-theme .dark overrides), not these literals directly.
export const PRIORITY_COLOUR_BG_MAP: Record<Priority, string> = {
  High: "oklch(0.94 0.04 25)",
  Medium: "oklch(0.95 0.05 75)",
  Low: "oklch(0.94 0.05 150)",
};

export const PRIORITY_COLOUR_TEXT_MAP: Record<Priority, string> = {
  High: "oklch(0.55 0.17 25)",
  Medium: "oklch(0.68 0.16 75)", // reuses the Projects-calendar Medium amber
  Low: "oklch(0.52 0.13 150)",
};

export function priorityColourBg(name: string | null | undefined): string {
  if (name && name in PRIORITY_COLOUR_BG_MAP) {
    return `var(--pill-bg-${name.toLowerCase()})`;
  }
  return "var(--pill-bg-default)";
}

export function priorityColourText(name: string | null | undefined): string {
  if (name && name in PRIORITY_COLOUR_TEXT_MAP) {
    return `var(--pill-text-${name.toLowerCase()})`;
  }
  return "var(--pill-text-default)";
}
