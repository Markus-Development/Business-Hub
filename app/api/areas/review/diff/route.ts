import { NextResponse } from "next/server";
import { listAreas, listProjectsForReview, type ReviewProject } from "@/lib/notion-areas";
import { questionsForArea, type ReviewQuestion } from "@/constants/areas-review";

export const runtime = "nodejs";

const normalize = (name: string) => name.replace(/ \(v\d+\)$/, "").trim();

export type ReviewProjectRef = {
  id: string;
  url: string;
  name: string;
  status: string | null;
  createdTime: string;
};

export type AreaReviewState = {
  base: string;
  area: { id: string; url: string; name: string; status: string | null; created: string };
  doneProjects: ReviewProjectRef[];
  newProjects: ReviewProjectRef[];
  ongoingProjects: ReviewProjectRef[];
  questions: ReviewQuestion[];
  skippable: boolean;
};

export type AreaReviewDiffResponse = {
  ok: true;
  areas: AreaReviewState[];
};

const toRef = (p: ReviewProject): ReviewProjectRef => ({
  id: p.id,
  url: p.url,
  name: p.name,
  status: p.status,
  createdTime: p.createdTime,
});

// POST /api/areas/review/diff
// Reads every LIVE area (Archived=false) + all projects grouped by Department,
// and for each area computes done / new / ongoing project sets plus the review
// questions. Areas with no movement (0 done, 0 new) are flagged skippable.
export async function POST() {
  if (!process.env.NOTION_AREAS_DB_ID || !process.env.NOTION_PROJECTS_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  try {
    const [allAreas, projects] = await Promise.all([listAreas(), listProjectsForReview()]);
    const liveAreas = allAreas.filter((a) => !a.archived);

    // Group projects by Department (the only area↔project link).
    const byDept = new Map<string, ReviewProject[]>();
    for (const p of projects) {
      if (!p.department) continue;
      const list = byDept.get(p.department);
      if (list) list.push(p);
      else byDept.set(p.department, [p]);
    }

    const areas: AreaReviewState[] = liveAreas.map((a) => {
      const base = normalize(a.name);
      const deptProjects = byDept.get(base) ?? [];
      const areaCreated = a.created;

      const doneProjects = deptProjects.filter((p) => p.status === "Done").map(toRef);
      const notDone = deptProjects.filter((p) => p.status !== "Done");
      // New = created after the live area page OR flagged Created by = AI.
      const newProjects = notDone
        .filter((p) => (areaCreated && p.createdTime > areaCreated) || p.createdBy === "AI")
        .map(toRef);
      const newIds = new Set(newProjects.map((p) => p.id));
      const ongoingProjects = notDone.filter((p) => !newIds.has(p.id)).map(toRef);

      return {
        base,
        area: { id: a.id, url: a.url, name: a.name, status: a.status, created: a.created },
        doneProjects,
        newProjects,
        ongoingProjects,
        questions: questionsForArea(base),
        skippable: doneProjects.length === 0 && newProjects.length === 0,
      };
    });

    // Areas with movement first, then alphabetical — keeps the wizard's early
    // steps on the areas that actually need attention.
    areas.sort((x, y) => {
      if (x.skippable !== y.skippable) return x.skippable ? 1 : -1;
      return x.base.localeCompare(y.base);
    });

    return NextResponse.json({ ok: true, areas } satisfies AreaReviewDiffResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
