// Notion Inbox DB `Type` select options. The Inbox DB already exists in Notion
// (NOTION_INBOX_DB_ID); these are the exact, case-sensitive option names of its
// `Type` select property — they must match Notion verbatim or the page create
// silently drops the value. Quick Capture writes one of these on every entry.

export const INBOX_TYPES = ["Task", "Idea", "Reference", "Someday"] as const;

export type InboxType = (typeof INBOX_TYPES)[number];
