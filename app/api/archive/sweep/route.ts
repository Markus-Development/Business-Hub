// TODO (pre-deploy): this route is intentionally UNAUTHENTICATED for the
// current solo, single-user, local setup — a same-origin POST from the Profile
// "Run archive sweep" button is sufficient. Before deploying Business Hub to a
// public host, validate a CRON_SECRET bearer token here
// (`Authorization: Bearer <CRON_SECRET>`) so the sweep cannot be triggered
// anonymously and so the future cron job (Phase 4) can authenticate.
import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { archiveProjectPage, archiveResourcePage } from "@/lib/notion";

export const runtime = "nodejs";

// Notion sustains ~3 req/sec and each archive helper makes ~3 calls. Only space
// items out when the batch is big enough to risk a 429.
const DELAY_MS = 200;
const DELAY_THRESHOLD = 5;

// Own Notion client: lib/notion.ts keeps its client module-private and exposes
// no "query by status" helper, so the sweep does its own filtered queries here.
// The archive *writes* still go through the Phase 2 lib helpers, unchanged.
const notion = new Client({ auth: process.env.NOTION_TOKEN });

type ArchivedPage = { id: string; name: string };
type Processed = { pageId: string; name: string; archiveId: string };
type Errored = { pageId: string; name: string; error: string };
type CategoryResult = { processed: Processed[]; errors: Errored[] };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function firstDataSourceId(dbId: string | undefined, label: string): Promise<string> {
  if (!dbId) throw new Error(`${label} DB id is not set`);
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) throw new Error(`${label} DB has no data_sources — is the integration shared with it?`);
  return ds.id;
}

function titleOf(page: any): string {
  const nameProp = page?.properties?.Name;
  if (nameProp?.type === "title") {
    const text = (nameProp.title ?? []).map((r: any) => r.plain_text).join("");
    return text || "(untitled)";
  }
  return "(untitled)";
}

// Queries a data source for pages whose Status equals "Archived". The Projects
// DB Status is a `status`-type property; the Resources DB Status is `select` —
// hence the filterKind switch. Only the page id + title are read (no bodies).
async function queryArchived(
  dataSourceId: string,
  filterKind: "status" | "select",
): Promise<ArchivedPage[]> {
  const statusFilter =
    filterKind === "status"
      ? { property: "Status", status: { equals: "Archived" } }
      : { property: "Status", select: { equals: "Archived" } };

  const pages: ArchivedPage[] = [];
  let cursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: statusFilter,
      page_size: 100,
      start_cursor: cursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        pages.push({ id: page.id, name: titleOf(page) });
      }
    }
    cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
  } while (cursor);
  return pages;
}

// POST /api/archive/sweep — archives every Projects/Resources page left at
// Status="Archived" by a direct Notion edit (outside Business Hub). Items are
// processed SERIALLY; one failure is recorded and the sweep continues.
export async function POST() {
  try {
    const projectsDsId = await firstDataSourceId(process.env.NOTION_PROJECTS_DB_ID, "Projects");
    const resourcesDsId = await firstDataSourceId(process.env.NOTION_RESOURCES_DB_ID, "Resources");

    const archivedProjects = await queryArchived(projectsDsId, "status");
    const archivedResources = await queryArchived(resourcesDsId, "select");

    const delayMs =
      archivedProjects.length + archivedResources.length > DELAY_THRESHOLD ? DELAY_MS : 0;

    const projects: CategoryResult = { processed: [], errors: [] };
    for (const page of archivedProjects) {
      try {
        const { archiveId } = await archiveProjectPage(page.id);
        projects.processed.push({ pageId: page.id, name: page.name, archiveId });
      } catch (err) {
        projects.errors.push({
          pageId: page.id,
          name: page.name,
          error: err instanceof Error ? err.message : "archive_failed",
        });
      }
      if (delayMs) await sleep(delayMs);
    }

    const resources: CategoryResult = { processed: [], errors: [] };
    for (const page of archivedResources) {
      try {
        const { archiveId } = await archiveResourcePage(page.id);
        resources.processed.push({ pageId: page.id, name: page.name, archiveId });
      } catch (err) {
        resources.errors.push({
          pageId: page.id,
          name: page.name,
          error: err instanceof Error ? err.message : "archive_failed",
        });
      }
      if (delayMs) await sleep(delayMs);
    }

    return NextResponse.json({ ok: true, projects, resources });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error("archive_sweep_failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
