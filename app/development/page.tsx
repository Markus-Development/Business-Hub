import "server-only";
import { listDevelopmentProjects } from "@/lib/notion";
import { DevelopmentView } from "./_components/DevelopmentView";

// Tab 10 (Development). Server-side fetch of Department=Development projects from
// the Projects DB. Same posture as app/resources/page.tsx — degrade to a
// notConfigured / error state rather than crashing. Force-dynamic so we don't
// try to statically prerender a Notion call at build time.
export const dynamic = "force-dynamic";

export default async function DevelopmentPage() {
  if (!process.env.NOTION_PROJECTS_DB_ID) {
    return <DevelopmentView projects={[]} notConfigured />;
  }
  try {
    const projects = await listDevelopmentProjects();
    return <DevelopmentView projects={projects} />;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("development_list_failed", err);
    return <DevelopmentView projects={[]} error />;
  }
}
