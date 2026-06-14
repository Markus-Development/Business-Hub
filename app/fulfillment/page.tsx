import "server-only";
import { FulfillmentView } from "./_components/FulfillmentView";
import { getUserSettings } from "@/lib/settings";
import { todayInTz } from "@/lib/tz";

// Fulfillment tab — monthly checkbox grid over all clients. The data is
// month-dependent and switched client-side, so the page only resolves the
// initial (current) month in the user's timezone + gates on the env var; the
// client view fetches each month via GET /api/fulfillment. Force-dynamic so we
// don't statically prerender a settings/Notion call at build time. Same
// notConfigured posture as app/buecher/page.tsx.
export const dynamic = "force-dynamic";

export default async function FulfillmentPage() {
  if (!process.env.NOTION_FULFILLMENT_DB_ID) {
    return <FulfillmentView initialMonth="" notConfigured />;
  }
  const { timezone } = await getUserSettings();
  const initialMonth = todayInTz(timezone).slice(0, 7); // "YYYY-MM"
  return <FulfillmentView initialMonth={initialMonth} />;
}
