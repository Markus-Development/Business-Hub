import "server-only";
import { InboxView } from "./_components/InboxView";

// Tab 8 (Inbox triage). Server shell only — all data fetching happens
// client-side (GET /api/inbox/list, POST /api/inbox/suggest + /process).
// Force-dynamic so nothing is statically prerendered. Gates on
// NOTION_INBOX_DB_ID so a missing env shows the not-configured state, no crash.
export const dynamic = "force-dynamic";

export default function InboxPage() {
  const notConfigured = !process.env.NOTION_INBOX_DB_ID;
  return <InboxView notConfigured={notConfigured} />;
}
