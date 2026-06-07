import { NextResponse } from "next/server";
import { listAreas, type AreaSummary } from "@/lib/notion-areas";

export const runtime = "nodejs";

export type AreasManageResponse = {
  ok: true;
  areas: AreaSummary[];
};

// GET /api/areas/manage
// Lists EVERY Area page (including archived ones — the manage surface greys
// them out). This is intentionally separate from GET /api/areas, which filters
// archived rows out and adds project counts for the Areas tab. Sort order:
// live (non-archived) first, then most-recently-created first.
export async function GET() {
  if (!process.env.NOTION_AREAS_DB_ID) {
    return NextResponse.json({ ok: false, error: "areas_not_configured" }, { status: 503 });
  }

  try {
    const areas = await listAreas();
    areas.sort((a, b) => {
      if (a.archived !== b.archived) return a.archived ? 1 : -1;
      return b.created.localeCompare(a.created);
    });
    return NextResponse.json({ ok: true, areas } satisfies AreasManageResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
