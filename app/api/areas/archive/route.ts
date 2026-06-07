import { NextResponse } from "next/server";
import { archiveAreaPage } from "@/lib/notion-areas";

export const runtime = "nodejs";

type Body = {
  url?: unknown;
  urls?: unknown;
};

// POST /api/areas/archive
// Body: { url } or { urls: [] }. Sets Archived=true on each Areas-DB page.
// Per-item failures are collected — the route never fails the whole batch on a
// single bad url. Returns { ok, archived: [], failed: [] }.
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const urls: string[] = [];
  if (typeof body.url === "string" && body.url.trim().length > 0) urls.push(body.url.trim());
  if (Array.isArray(body.urls)) {
    for (const u of body.urls) {
      if (typeof u === "string" && u.trim().length > 0) urls.push(u.trim());
    }
  }

  if (urls.length === 0) {
    return NextResponse.json({ ok: false, error: "no_urls" }, { status: 400 });
  }

  if (!process.env.NOTION_AREAS_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const archived: string[] = [];
  const failed: { url: string; error: string }[] = [];

  for (const url of urls) {
    try {
      await archiveAreaPage(url);
      archived.push(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      failed.push({ url, error: message });
    }
  }

  return NextResponse.json({ ok: true, archived, failed });
}
