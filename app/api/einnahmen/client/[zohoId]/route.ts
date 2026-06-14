import { NextResponse } from "next/server";
import { getEinnahmenClientDetail } from "@/lib/einnahmen";
import { getUserSettings } from "@/lib/settings";
import { todayInTz } from "@/lib/tz";

export const runtime = "nodejs";

function isConfigured(): boolean {
  return Boolean(
    process.env.NOTION_CLIENTS_DB_ID &&
      process.env.ZOHO_REFRESH_TOKEN &&
      process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_ORG_ID,
  );
}

async function resolveYear(raw: string | null): Promise<number> {
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100) return parsed;
  const settings = await getUserSettings();
  return Number(todayInTz(settings.timezone).slice(0, 4));
}

export async function GET(req: Request, ctx: { params: Promise<{ zohoId: string }> }) {
  if (!isConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const { zohoId } = await ctx.params;
  if (typeof zohoId !== "string" || zohoId.length === 0) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }
  try {
    const year = await resolveYear(new URL(req.url).searchParams.get("year"));
    const detail = await getEinnahmenClientDetail(zohoId, year);
    if (!detail) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, detail });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("einnahmen_client_failed", err);
    return NextResponse.json({ ok: false, error: "detail_failed" }, { status: 500 });
  }
}
