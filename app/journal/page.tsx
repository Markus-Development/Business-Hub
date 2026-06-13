import "server-only";
import { listJournalWeeks, listErfolge } from "@/lib/notion";
import { JournalView } from "./_components/JournalView";

// Weekly Journal (read-only). Server-side fetch of both source DBs, same posture
// as app/development/page.tsx — degrade to a notConfigured / error state rather
// than crashing. Force-dynamic so we don't statically prerender Notion calls.
export const dynamic = "force-dynamic";

export default async function JournalPage() {
  if (!process.env.NOTION_WEEKLY_JOURNAL_DB_ID || !process.env.NOTION_ERFOLGE_DB_ID) {
    return <JournalView weeks={[]} erfolge={[]} notConfigured />;
  }
  try {
    const [weeks, erfolge] = await Promise.all([listJournalWeeks(), listErfolge()]);
    return <JournalView weeks={weeks} erfolge={erfolge} />;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("journal_list_failed", err);
    return <JournalView weeks={[]} erfolge={[]} error />;
  }
}
