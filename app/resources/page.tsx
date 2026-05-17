import "server-only";
import { listResources } from "@/lib/notion";
import { ResourcesView } from "./_components/ResourcesView";

// Tab 6 (Resources). Server-side fetch keeps the cards available on first paint;
// writes go through /api/resources/create. Force-dynamic so we don't try to
// statically prerender a Notion call at build time.
export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  if (!process.env.NOTION_RESOURCES_DB_ID) {
    return <ResourcesView resources={[]} notConfigured />;
  }
  try {
    const resources = await listResources();
    return <ResourcesView resources={resources} />;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("resources_list_failed", err);
    return <ResourcesView resources={[]} error />;
  }
}
