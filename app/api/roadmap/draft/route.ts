import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { createTwoFilesPatch } from "diff";
import { listProjectsByStatus } from "@/lib/notion";
import { roadmapDraft, extractText } from "@/lib/anthropic";
import { REASONS_ARCHIVED } from "@/constants/archive";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "You are the maintainer of Markus's business roadmap. Your job is to update " +
  "roadmap.md to reflect completed projects as historical accomplishments and " +
  "revise next-step recommendations accordingly. RULES: (a) Preserve existing " +
  "structure, headings, and sections unrelated to the Done projects. (b) Do not " +
  "invent projects, dates, deadlines, or facts. (c) For each Done project decide " +
  "whether it should be archived and pick a reason from [Completed, Cancelled, " +
  "Outdated, Replaced, No longer relevant]; default to Completed. (d) Return " +
  "STRICT JSON ONLY, no prose, no markdown fences, with shape: { proposed_roadmap: " +
  "'<full updated roadmap.md content as one string>', projects_to_archive: " +
  "[{ pageId, name, reason }], summary: '<1-2 sentence change description>' }.";

type DraftJson = {
  proposed_roadmap?: unknown;
  projects_to_archive?: unknown;
  summary?: unknown;
};

type ProjectToArchive = { pageId: string; name: string; reason: string };

// Defensive JSON parse: direct JSON.parse first, then fall back to slicing the
// first {...} block if the model wrapped the JSON in prose despite the prompt.
function parseDraftJson(text: string): DraftJson | null {
  const tryParse = (s: string): DraftJson | null => {
    try {
      const obj = JSON.parse(s);
      return obj && typeof obj === "object" ? (obj as DraftJson) : null;
    } catch {
      return null;
    }
  };
  const direct = tryParse(text);
  if (direct) return direct;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return tryParse(text.slice(start, end + 1));
  return null;
}

export async function POST() {
  try {
    // 1. Read roadmap.md. 500 (not auto-create) when missing.
    const roadmapPath = path.join(process.cwd(), "roadmap.md");
    let roadmapContent: string;
    try {
      roadmapContent = fs.readFileSync(roadmapPath, "utf-8");
    } catch {
      return NextResponse.json(
        { ok: false, error: "roadmap_not_found: roadmap.md is missing at the repo root." },
        { status: 500 },
      );
    }

    // 2. Done projects. Empty -> explicit no-op response.
    const doneProjects = await listProjectsByStatus("Done");
    if (doneProjects.length === 0) {
      return NextResponse.json({ ok: true, draft: null, reason: "no_done_projects" });
    }

    // 3. Build the Sonnet prompt.
    const projectsForPrompt = doneProjects.map((p) => ({
      pageId: p.id,
      name: p.name,
      department: p.department,
      outcome: p.outcome,
      created_time: p.createdAt,
      last_edited_time: p.lastEditedTime,
    }));
    const userContent =
      `CURRENT ROADMAP:\n\n${roadmapContent}\n\n---\n\n` +
      `DONE PROJECTS:\n\n${JSON.stringify(projectsForPrompt, null, 2)}`;

    // 4. Call Sonnet + defensive parse.
    const response = await roadmapDraft(SYSTEM_PROMPT, userContent);
    const raw = extractText(response);
    const parsed = parseDraftJson(raw);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, error: "parse_failed", raw },
        { status: 502 },
      );
    }

    // 5. Validate shape.
    const proposedRoadmap = parsed.proposed_roadmap;
    if (typeof proposedRoadmap !== "string" || proposedRoadmap.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "invalid_proposed_roadmap", raw },
        { status: 502 },
      );
    }
    const summary = typeof parsed.summary === "string" ? parsed.summary : "";

    const warnings: string[] = [];
    const doneById = new Map(doneProjects.map((p) => [p.id, p]));
    const rawList = parsed.projects_to_archive;
    if (rawList !== undefined && !Array.isArray(rawList)) {
      warnings.push("projects_to_archive was not an array — treated as empty.");
    }
    const projectsToArchive: ProjectToArchive[] = [];
    for (const entry of Array.isArray(rawList) ? rawList : []) {
      const item = entry as { pageId?: unknown; name?: unknown; reason?: unknown };
      const pageId = item?.pageId;
      // Every pageId MUST be one of the Done projects from step 2 — drop and warn otherwise.
      if (typeof pageId !== "string" || !doneById.has(pageId)) {
        warnings.push(
          `Dropped an archive recommendation for an unknown project id "${String(pageId)}".`,
        );
        continue;
      }
      const known = doneById.get(pageId)!;
      const rawReason = item?.reason;
      let reason = "Completed";
      if (
        typeof rawReason === "string" &&
        (REASONS_ARCHIVED as readonly string[]).includes(rawReason)
      ) {
        reason = rawReason;
      } else {
        warnings.push(`Invalid reason for "${known.name}" — defaulted to "Completed".`);
      }
      projectsToArchive.push({ pageId, name: known.name, reason });
    }

    // 6. Server-side unified diff for the preview.
    const diff = createTwoFilesPatch("roadmap.md", "roadmap.md", roadmapContent, proposedRoadmap);

    // 7. Done.
    return NextResponse.json({
      ok: true,
      draft: { proposedRoadmap, projectsToArchive, summary, diff, warnings },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error("roadmap_draft_failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
