import "server-only";
import { EinnahmenView } from "./_components/EinnahmenView";
import { getEinnahmenGrid } from "@/lib/einnahmen";
import { getUserSettings } from "@/lib/settings";
import { todayInTz } from "@/lib/tz";

// Einnahmen tab — read-only revenue grid (clients × 12 months). The data is
// year-dependent and switched client-side, so the page only resolves the initial
// (current) year + month in the user's timezone, gates on the Notion Clients DB +
// Zoho env vars, and renders the first year server-side; the client view fetches
// other years via GET /api/einnahmen. Force-dynamic so we don't statically
// prerender a settings/Notion/Zoho call. Same notConfigured posture as
// app/fulfillment/page.tsx.
export const dynamic = "force-dynamic";

function isConfigured(): boolean {
  return Boolean(
    process.env.NOTION_CLIENTS_DB_ID &&
      process.env.ZOHO_REFRESH_TOKEN &&
      process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_ORG_ID,
  );
}

export default async function EinnahmenPage() {
  if (!isConfigured()) {
    return (
      <EinnahmenView
        initialGrid={null}
        initialYear={0}
        currentYear={0}
        currentMonthIndex={-1}
        notConfigured
      />
    );
  }

  const { timezone } = await getUserSettings();
  const today = todayInTz(timezone); // "YYYY-MM-DD" in the user's zone
  const currentYear = Number(today.slice(0, 4));
  const currentMonthIndex = Number(today.slice(5, 7)) - 1; // 0..11

  // Render the current year server-side for instant first paint. A failure here
  // degrades to a null grid (client view shows the error/empty state) rather than
  // crashing the route.
  let initialGrid = null;
  try {
    initialGrid = await getEinnahmenGrid(currentYear);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("einnahmen_initial_grid_failed", err);
  }

  return (
    <EinnahmenView
      initialGrid={initialGrid}
      initialYear={currentYear}
      currentYear={currentYear}
      currentMonthIndex={currentMonthIndex}
    />
  );
}
