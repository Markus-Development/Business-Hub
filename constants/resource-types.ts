// Notion Resources DB `Type` select options. These mirror the values hardcoded
// in app/resources/_components/AddResourceDialog.tsx (TYPE_OPTIONS) — confirmed
// identical. They are the exact, case-sensitive option names of the Resources DB
// `Type` select; they must match Notion verbatim or the page create silently
// drops the value.
//
// Optional follow-up: refactor AddResourceDialog.tsx to import from here instead
// of its local TYPE_OPTIONS (not done in this change to keep scope tight).

export const RESOURCE_TYPES = ["Note", "Reference", "Link", "Template", "Other"] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];
