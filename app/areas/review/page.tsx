import "server-only";
import { Suspense } from "react";
import { ReviewWizard } from "./_components/ReviewWizard";

// The wizard fetches its own data (POST /api/areas/review/diff) on mount, so the
// shell only gates on the env vars it needs.
export const dynamic = "force-dynamic";

export default function AreasReviewPage() {
  const configured = Boolean(
    process.env.NOTION_AREAS_DB_ID && process.env.NOTION_PROJECTS_DB_ID,
  );
  // Suspense boundary is required by Next.js when a descendant client component
  // calls useSearchParams — ReviewWizard reads `?area=` for single-area mode.
  return (
    <Suspense fallback={null}>
      <ReviewWizard notConfigured={!configured} />
    </Suspense>
  );
}
