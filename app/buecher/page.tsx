import "server-only";
import { listBuecher } from "@/lib/notion";
import { BuecherView } from "./_components/BuecherView";

// Tab 9 (Bücher). Server-side fetch keeps the list available on first paint;
// writes go through /api/buecher/*. Force-dynamic so we don't try to statically
// prerender a Notion call at build time. Same posture as app/freizeit/page.tsx.
export const dynamic = "force-dynamic";

export default async function BuecherPage() {
  if (!process.env.NOTION_BUCHER_DB_ID) {
    return <BuecherView items={[]} notConfigured />;
  }
  try {
    const items = await listBuecher();
    return <BuecherView items={items} />;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("buecher_list_failed", err);
    return <BuecherView items={[]} error />;
  }
}
