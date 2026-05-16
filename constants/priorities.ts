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
