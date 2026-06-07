import "server-only";
import { CallsView } from "./_components/CallsView";

// Tab 7 (Calls). Server shell only — all data fetching happens client-side
// (POST /api/calls/mine to analyse + write, GET /api/calls/list for the recent
// list). Force-dynamic so nothing is statically prerendered.
export const dynamic = "force-dynamic";

export default function CallsPage() {
  return <CallsView />;
}
