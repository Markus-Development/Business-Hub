import "server-only";
import { ReviewWizard } from "./_components/ReviewWizard";

// The wizard fetches its own data (POST /api/areas/review/diff) on mount, so the
// shell only gates on the env vars it needs.
export const dynamic = "force-dynamic";

export default function AreasReviewPage() {
  const configured = Boolean(
    process.env.NOTION_AREAS_DB_ID && process.env.NOTION_PROJECTS_DB_ID,
  );
  return <ReviewWizard notConfigured={!configured} />;
}
