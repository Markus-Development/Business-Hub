import { NextResponse } from "next/server";
import { getEinnahmenGrid } from "@/lib/einnahmen";
import { getUserSettings } from "@/lib/settings";
import { todayInTz } from "@/lib/tz";

export const runtime = "nodejs";

// True only when the Notion Clients DB + all four Zoho env vars are present.
function isConfigured(): boolean {
  return Boolean(
    process.env.NOTION_CLIENTS_DB_ID &&
      process.env.ZOHO_REFRESH_TOKEN &&
      process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_ORG_ID,
  );
}

// Validated year, defaulting to the current year in the user's timezone.
async function resolveYear(raw: string | null): Promise<number> {
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100) return parsed;
  const settings = await getUserSettings();
  return Number(todayInTz(settings.timezone).slice(0, 4));
}

export async function GET(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  try {
    const year = await resolveYear(new URL(req.url).searchParams.get("year"));
    const grid = await getEinnahmenGrid(year);
    return NextResponse.json({ ok: true, grid });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("einnahmen_grid_failed", err);
    return NextResponse.json({ ok: false, error: "grid_failed" }, { status: 500 });
  }
}
