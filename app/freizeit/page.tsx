import "server-only";
import { listFreizeit } from "@/lib/notion";
import { FreizeitView } from "./_components/FreizeitView";

// Tab 8 (Freizeit). Server-side fetch keeps the list available on first paint;
// writes go through /api/freizeit/*. Force-dynamic so we don't try to statically
// prerender a Notion call at build time. Same posture as app/resources/page.tsx.
export const dynamic = "force-dynamic";

export default async function FreizeitPage() {
  if (!process.env.NOTION_FREIZEIT_DB_ID) {
    return <FreizeitView items={[]} notConfigured />;
  }
  try {
    const items = await listFreizeit();
    return <FreizeitView items={items} />;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("freizeit_list_failed", err);
    return <FreizeitView items={[]} error />;
  }
}
