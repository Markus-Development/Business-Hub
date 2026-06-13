// Strip the Brand-OS-style " (vN)" version suffix from an Area page name so the
// display, project-filter links, and review/diff routes all key on the base name.
// The suffix stays in Notion — only the app strips it.
export const normalizeAreaName = (name: string) => name.replace(/ \(v\d+\)$/, "").trim();
