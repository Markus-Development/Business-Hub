import { isGoogleConnected } from "@/lib/google";
import { listActiveProjects } from "@/lib/notion";
import { CalendarView } from "./_components/CalendarView";
import "./calendar.css";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const connected = await isGoogleConnected();
  // Fetch Active projects server-side so the dialog's project dropdown is populated
  // on first paint. If Google is not connected the page won't render the dialog,
  // but we still pass projects (cheap) to keep the markup branchless.
  const projects = await listActiveProjects();
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));
  return <CalendarView connected={connected} projectOptions={projectOptions} />;
}
