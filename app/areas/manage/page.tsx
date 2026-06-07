import "server-only";
import { ManageView } from "./_components/ManageView";

// Client component does the data fetching on mount (GET /api/areas/manage), so
// this shell just gates on the env var and mounts it.
export const dynamic = "force-dynamic";

export default function AreasManagePage() {
  return <ManageView notConfigured={!process.env.NOTION_AREAS_DB_ID} />;
}
