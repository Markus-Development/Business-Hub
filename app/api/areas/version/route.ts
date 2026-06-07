import { NextResponse } from "next/server";
import {
  AREA_STATUSES,
  archiveAreaPage,
  archiveProject,
  createAreaVersion,
  type AreaVersionProps,
} from "@/lib/notion-areas";

export const runtime = "nodejs";

type Body = {
  newVersionName?: unknown;
  previousVersionUrl?: unknown;
  properties?: unknown;
  body?: unknown;
  archiveProjectUrls?: unknown;
};

// POST /api/areas/version
// Atomic-ish version bump:
//   (1) create the new Area version (Archived=false). On failure → 500, and
//       NOTHING is archived.
//   (2) archive the previous version page (Archived=true) — non-fatal.
//   (3) archive each related project (Status=Archived) — non-fatal.
// Failures in (2)/(3) are collected into warnings[] so the new version still
// "lands" even if cleanup partially fails.
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { newVersionName, previousVersionUrl, properties, body: pageBody, archiveProjectUrls } =
    body;

  // --- validation ---
  if (typeof newVersionName !== "string" || newVersionName.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "missing_new_version_name" }, { status: 400 });
  }

  const props = (
    properties && typeof properties === "object" ? properties : {}
  ) as AreaVersionProps;

  if (props.status !== undefined && props.status !== null) {
    if (
      typeof props.status !== "string" ||
      !(AREA_STATUSES as readonly string[]).includes(props.status)
    ) {
      return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }
  }

  if (pageBody !== undefined && pageBody !== null && typeof pageBody !== "string") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (
    archiveProjectUrls !== undefined &&
    archiveProjectUrls !== null &&
    !Array.isArray(archiveProjectUrls)
  ) {
    return NextResponse.json({ ok: false, error: "invalid_archive_project_urls" }, { status: 400 });
  }

  if (!process.env.NOTION_AREAS_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  // --- (1) create the new version (hard-fail) ---
  let created: { id: string; url: string };
  try {
    created = await createAreaVersion(
      newVersionName.trim(),
      props,
      typeof pageBody === "string" ? pageBody : undefined,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error("area_version_create_failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const warnings: string[] = [];

  // --- (2) archive previous version (non-fatal) ---
  if (typeof previousVersionUrl === "string" && previousVersionUrl.trim().length > 0) {
    try {
      await archiveAreaPage(previousVersionUrl.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      warnings.push(`archive_previous_failed: ${previousVersionUrl} (${message})`);
    }
  }

  // --- (3) archive related projects (non-fatal, per-item) ---
  if (Array.isArray(archiveProjectUrls)) {
    for (const url of archiveProjectUrls) {
      if (typeof url !== "string" || url.trim().length === 0) {
        warnings.push("archive_project_skipped: empty url");
        continue;
      }
      try {
        await archiveProject(url.trim());
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown_error";
        warnings.push(`archive_project_failed: ${url} (${message})`);
      }
    }
  }

  return NextResponse.json({ ok: true, id: created.id, url: created.url, warnings });
}
