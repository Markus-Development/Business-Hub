import { NextResponse } from "next/server";
import { listActiveProjects, listAreas, type NotionArea } from "@/lib/notion";

export const runtime = "nodejs";

export type AreasListResponse = {
  areas: NotionArea[];
  projectCounts: Record<string, number>;
};

export async function GET() {
  if (!process.env.NOTION_AREAS_DB_ID) {
    return NextResponse.json({ error: "areas_not_configured" }, { status: 503 });
  }

  try {
    const [areas, projects] = await Promise.all([
      listAreas(),
      listActiveProjects(),
    ]);

    // Derive active-project counts by grouping in JS — one Notion query, not
    // one-per-area. Empty/null area values are silently skipped.
    const projectCounts: Record<string, number> = {};
    for (const a of areas) projectCounts[a.name] = 0;
    for (const p of projects) {
      if (!p.area) continue;
      projectCounts[p.area] = (projectCounts[p.area] ?? 0) + 1;
    }

    return NextResponse.json({ areas, projectCounts } satisfies AreasListResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
