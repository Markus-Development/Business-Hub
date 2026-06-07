import "server-only";
import { Client } from "@notionhq/client";

// Shared helpers for the Areas versioning workflow (create new version,
// archive old versions, archive related projects).
//
// The base `notion` Client in lib/notion.ts is module-private, so — exactly as
// the archive-sweep route already does for its status queries — we instantiate a
// second client against the SAME `NOTION_TOKEN`. This is not a second auth: it
// reuses the existing integration token, just a separate client instance scoped
// to this workflow. The integration must be shared with BOTH the Areas DB and
// the Projects DB in Notion's UI or these calls return empty / 404.
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// ---------------------------------------------------------------------------
// Page-id extraction
// ---------------------------------------------------------------------------

// Pulls the 32-char hex page id out of a Notion URL or a raw id and returns it
// dashed (8-4-4-4-12). Notion URLs end with the page id, so when several hex
// runs are present we take the LAST one. Query strings (?pvs=…) are ignored.
export function extractPageId(urlOrId: string): string {
  const compact = String(urlOrId).split("?")[0].replace(/-/g, "");
  const matches = compact.match(/[0-9a-fA-F]{32}/g);
  if (!matches || matches.length === 0) {
    throw new Error(`no_page_id_in:${urlOrId}`);
  }
  const id = matches[matches.length - 1].toLowerCase();
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(
    16,
    20,
  )}-${id.slice(20)}`;
}

// ---------------------------------------------------------------------------
// Data-source resolution (Notion 2025-09-03+: create/query run against a
// data_source_id, not a database_id). Cached per module load.
// ---------------------------------------------------------------------------

let areasDataSourceId: string | null = null;

async function getAreasDataSourceId(): Promise<string> {
  if (areasDataSourceId) return areasDataSourceId;
  const dbId = process.env.NOTION_AREAS_DB_ID;
  if (!dbId) throw new Error("NOTION_AREAS_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) {
    throw new Error(
      "Areas DB has no data_sources — is the integration shared with the database?",
    );
  }
  areasDataSourceId = ds.id;
  return ds.id;
}

// ---------------------------------------------------------------------------
// Minimal Markdown → Notion blocks converter
// ---------------------------------------------------------------------------
// The repo's only existing converter (`appendTextBlocks` in lib/notion.ts) is
// paragraph-only — it does not handle headings or bullets. Per the task we add
// a minimal one here: "## " → heading_2, "- " → bulleted_list_item, everything
// else → paragraph. children are capped at 100 (Notion's per-create limit).

const rt = (content: string) => [{ type: "text" as const, text: { content } }];

type NotionBlockInput = Record<string, unknown>;

function markdownToBlocks(markdown: string): NotionBlockInput[] {
  const trimmed = (markdown ?? "").trim();
  if (!trimmed) return [];
  const blocks: NotionBlockInput[] = [];
  for (const raw of trimmed.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading_2", heading_2: { rich_text: rt(line.slice(3)) } });
    } else if (line.startsWith("- ")) {
      blocks.push({
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: rt(line.slice(2)) },
      });
    } else {
      blocks.push({ type: "paragraph", paragraph: { rich_text: line ? rt(line) : [] } });
    }
  }
  return blocks.slice(0, 100);
}

// ---------------------------------------------------------------------------
// Area version properties
// ---------------------------------------------------------------------------

export type AreaVersionProps = {
  status?: string;
  goal?: string;
  standard?: string;
  healthMetric?: string;
  currentMilestone?: string;
  nextFocus?: string;
  nextSteps?: string;
  milestoneDueDate?: string | null;
};

export const AREA_STATUSES = ["Active", "Needs Attention", "Paused"] as const;
export type AreaStatus = (typeof AREA_STATUSES)[number];

// Maps the camelCase props payload onto the Notion rich_text property names.
const RICH_TEXT_FIELDS: Record<string, keyof AreaVersionProps> = {
  Goal: "goal",
  Standard: "standard",
  "Health Metric": "healthMetric",
  "Current Milestone": "currentMilestone",
  "Next Focus": "nextFocus",
  "Next Steps": "nextSteps",
};

function buildAreaProperties(name: string, props: AreaVersionProps): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    Name: { title: rt(name) },
    Archived: { checkbox: false },
  };
  if (props.status) {
    properties.Status = { select: { name: props.status } };
  }
  for (const [notionName, key] of Object.entries(RICH_TEXT_FIELDS)) {
    const value = props[key];
    if (value !== undefined) {
      properties[notionName] = {
        rich_text: value ? rt(String(value)) : [],
      };
    }
  }
  if (props.milestoneDueDate) {
    properties["Milestone Due Date"] = { date: { start: props.milestoneDueDate } };
  }
  return properties;
}

// Creates a brand-new Area version page (Archived=false) with the given
// properties and an optional Markdown body. Returns the new page id + url.
export async function createAreaVersion(
  name: string,
  props: AreaVersionProps,
  bodyMarkdown?: string,
): Promise<{ id: string; url: string }> {
  const dataSourceId = await getAreasDataSourceId();
  const properties = buildAreaProperties(name, props);
  const children = markdownToBlocks(bodyMarkdown ?? "");

  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: properties as any,
    ...(children.length ? { children: children as any } : {}),
  })) as any;

  return { id: page.id, url: page.url as string };
}

// Sets Archived=true on an Areas-DB page. Accepts a URL or a raw id.
export async function archiveAreaPage(urlOrId: string): Promise<string> {
  const pageId = extractPageId(urlOrId);
  await notion.pages.update({
    page_id: pageId,
    properties: { Archived: { checkbox: true } } as any,
  });
  return pageId;
}

// Sets the Projects-DB Status (a `status` property) to "Archived". Accepts a
// URL or a raw id. Note: this writes the status directly via the Notion API —
// it does NOT route through /api/projects/update (which would trigger the full
// archive-to-Archive-DB flow). The Phase-3 sweep will reconcile these later.
export async function archiveProject(urlOrId: string): Promise<string> {
  const pageId = extractPageId(urlOrId);
  await notion.pages.update({
    page_id: pageId,
    properties: { Status: { status: { name: "Archived" } } } as any,
  });
  return pageId;
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export type AreaSummary = {
  id: string;
  url: string;
  name: string;
  status: string | null;
  archived: boolean;
  created: string;
};

function titleText(prop: any): string {
  const parts = prop?.title ?? [];
  return parts.map((p: any) => p?.plain_text ?? "").join("").trim();
}

function selectName(prop: any): string | null {
  return prop?.select?.name ?? null;
}

// ---------------------------------------------------------------------------
// Projects (for the Areas Review diff)
// ---------------------------------------------------------------------------
// The Projects↔Area link is purely the Department select (no relation). We read
// the custom `Created by` select too — its "AI" option flags AI-created projects.

let projectsDataSourceId: string | null = null;

async function getProjectsDataSourceId(): Promise<string> {
  if (projectsDataSourceId) return projectsDataSourceId;
  const dbId = process.env.NOTION_PROJECTS_DB_ID;
  if (!dbId) throw new Error("NOTION_PROJECTS_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) {
    throw new Error(
      "Projects DB has no data_sources — is the integration shared with the database?",
    );
  }
  projectsDataSourceId = ds.id;
  return ds.id;
}

export type ReviewProject = {
  id: string;
  url: string;
  name: string;
  status: string | null;
  department: string | null;
  createdTime: string;
  createdBy: string | null;
};

function statusName(prop: any): string | null {
  return prop?.status?.name ?? null;
}

// Lists EVERY project (all statuses) with the fields the review diff needs.
export async function listProjectsForReview(): Promise<ReviewProject[]> {
  const dataSourceId = await getProjectsDataSourceId();
  const out: ReviewProject[] = [];
  let cursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (!page || page.object !== "page" || !("properties" in page)) continue;
      const p = page.properties as Record<string, any>;
      out.push({
        id: page.id,
        url: page.url,
        name: titleText(p.Name),
        status: statusName(p.Status),
        department: selectName(p.Department),
        createdTime: page.created_time ?? "",
        createdBy: selectName(p["Created by"]),
      });
    }
    cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
  } while (cursor);
  return out;
}

// Paginates the full Areas DB. Unlike lib/notion.ts's `listAreas()`, this
// INCLUDES archived rows — the manage surface needs to show them (greyed out).
export async function listAreas(): Promise<AreaSummary[]> {
  const dataSourceId = await getAreasDataSourceId();
  const out: AreaSummary[] = [];
  let cursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (!page || page.object !== "page" || !("properties" in page)) continue;
      const p = page.properties as Record<string, any>;
      out.push({
        id: page.id,
        url: page.url,
        name: titleText(p.Name),
        status: selectName(p.Status),
        archived: Boolean(p.Archived?.checkbox),
        created: page.created_time,
      });
    }
    cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
  } while (cursor);
  return out;
}
