import "server-only";
import { listActiveProjects, listAreas } from "@/lib/notion";
import { AreasView } from "./_components/AreasView";

// Live data on every render — Areas DB is small (currently 8 rows) so a fresh
// fetch is fine. Matches /projects' force-dynamic posture.
export const dynamic = "force-dynamic";

export default async function AreasPage() {
  if (!process.env.NOTION_AREAS_DB_ID) {
    return <AreasView areas={[]} projectCounts={{}} overdueCounts={{}} notConfigured />;
  }

  const [areas, projects] = await Promise.all([listAreas(), listActiveProjects()]);

  const projectCounts: Record<string, number> = {};
  const overdueCounts: Record<string, number> = {};
  for (const a of areas) {
    projectCounts[a.name] = 0;
    overdueCounts[a.name] = 0;
  }
  // listActiveProjects() already filters to Active, so no status check here.
  // A project's Department value is matched against the Area DB name — the two
  // taxonomies share the same eight labels (Fulfillment, Marketing, …).
  const now = new Date();
  for (const p of projects) {
    if (!p.department) continue;
    projectCounts[p.department] = (projectCounts[p.department] ?? 0) + 1;
    if (p.dueDate && new Date(p.dueDate) < now) {
      overdueCounts[p.department] = (overdueCounts[p.department] ?? 0) + 1;
    }
  }

  return (
    <AreasView areas={areas} projectCounts={projectCounts} overdueCounts={overdueCounts} />
  );
}
