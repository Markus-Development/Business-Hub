import { listActiveProjects } from "@/lib/notion";
import { ProjectsClient } from "./_components/ProjectsClient";

// Server component fetch: data is available on first paint, no client-side loading state needed.
// Mutations go through /api/projects/update; optimistic UI in the client wrapper keeps things responsive.
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listActiveProjects();
  return <ProjectsClient projects={projects} />;
}
