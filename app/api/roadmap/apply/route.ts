import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { Client } from "@notionhq/client";
import { archiveProjectPage } from "@/lib/notion";

export const runtime = "nodejs";

// Own Notion client for the apply-time status re-verification — lib/notion.ts
// keeps its client module-private and exposes no retrieve-page helper. The
// archive writes still go through the Phase 2 `archiveProjectPage`, unchanged.
const notion = new Client({ auth: process.env.NOTION_TOKEN });

type Body = { proposedRoadmap?: unknown; approvedProjectIds?: unknown };
type NamedId = { pageId: string; name: string };

function titleOf(page: any): string {
  const nameProp = page?.properties?.Name;
  if (nameProp?.type === "title") {
    const text = (nameProp.title ?? []).map((r: any) => r.plain_text).join("");
    return text || "(untitled)";
  }
  return "(untitled)";
}

export async function POST(req: Request) {
  // 1. Validate body shape.
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const { proposedRoadmap, approvedProjectIds } = body;
  if (typeof proposedRoadmap !== "string" || proposedRoadmap.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "invalid_proposedRoadmap" }, { status: 400 });
  }
  if (
    !Array.isArray(approvedProjectIds) ||
    !approvedProjectIds.every((id) => typeof id === "string")
  ) {
    return NextResponse.json({ ok: false, error: "invalid_approvedProjectIds" }, { status: 400 });
  }

  try {
    // 2. Re-verify each approved project is STILL Status="Done" (and not
    //    already trashed) at apply-time — the status may have changed since the
    //    draft was generated. Anything else is skipped, never archived.
    const verified: NamedId[] = [];
    const skipped: { pageId: string; name: string; reason: string }[] = [];
    for (const pageId of approvedProjectIds) {
      try {
        const page = (await notion.pages.retrieve({ page_id: pageId })) as any;
        const name = titleOf(page);
        const status = page?.properties?.Status?.status?.name ?? null;
        if (page?.in_trash) {
          skipped.push({ pageId, name, reason: "already archived (page is in Notion trash)" });
        } else if (status !== "Done") {
          skipped.push({
            pageId,
            name,
            reason: `status changed since draft (now: ${status ?? "unknown"})`,
          });
        } else {
          verified.push({ pageId, name });
        }
      } catch (err) {
        skipped.push({
          pageId,
          name: pageId,
          reason: err instanceof Error ? err.message : "retrieve_failed",
        });
      }
    }

    // 3. Write roadmap.md FIRST. The roadmap update is the primary intent of
    //    this action; archiving is secondary. Writing the file before the
    //    archive loop means a downstream archive failure cannot lose the
    //    roadmap edit — and the Phase 3 sweep (/api/archive/sweep) recovers any
    //    project that was verified-Done but failed to archive here.
    fs.writeFileSync(path.join(process.cwd(), "roadmap.md"), proposedRoadmap, "utf-8");

    // 4. Archive the verified subset serially, reason "Completed".
    const processed: { pageId: string; name: string; archiveId: string }[] = [];
    const errors: { pageId: string; name: string; error: string }[] = [];
    for (const { pageId, name } of verified) {
      try {
        const { archiveId } = await archiveProjectPage(pageId, { reason: "Completed" });
        processed.push({ pageId, name, archiveId });
      } catch (err) {
        errors.push({
          pageId,
          name,
          error: err instanceof Error ? err.message : "archive_failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      roadmapWritten: true,
      archived: { processed, errors, skipped },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error("roadmap_apply_failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
