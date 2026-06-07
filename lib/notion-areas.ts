import "server-only";
import { Client } from "@notionhq/client";
import { PRIORITIES, STATUSES } from "@/constants/priorities";

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
// dashed (8-4-4-4-12). Notion URLs always END with the page id, so we anchor the
// match to the end of the string (/[0-9a-fA-F]{32}$/) after stripping the query
// (?pvs=…) / hash (#block) / trailing slashes and removing dashes.
//
// Off-by-N fix: stripping dashes can FUSE a hex-like slug tail onto the real id,
// producing a single >32-char hex run — e.g. ".../Accounting-v3-<id>" -> "…v3<id>"
// or ".../…-Juni-2026-<id>" -> "…2026<id>". A first-match /[0-9a-fA-F]{32}/ then
// starts N chars too early and returns a corrupted, left-shifted UUID. Anchoring
// to the end takes the LAST 32 hex chars, which are always the true page id.
export function extractPageId(urlOrId: string): string {
  const compact = String(urlOrId)
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "")
    .replace(/-/g, "");
  const match = compact.match(/[0-9a-fA-F]{32}$/);
  if (!match) {
    throw new Error(`no_page_id_in:${urlOrId}`);
  }
  const id = match[0].toLowerCase();
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
  // Current values surfaced so the review wizard can show + pre-fill them.
  currentMilestone: string | null;
  milestoneDueDate: string | null;
  healthMetric: string | null;
};

function titleText(prop: any): string {
  const parts = prop?.title ?? [];
  return parts.map((p: any) => p?.plain_text ?? "").join("").trim();
}

function selectName(prop: any): string | null {
  return prop?.select?.name ?? null;
}

function richTextText(prop: any): string | null {
  const parts = prop?.rich_text ?? [];
  const text = parts.map((p: any) => p?.plain_text ?? "").join("").trim();
  return text || null;
}

function dateStart(prop: any): string | null {
  return prop?.date?.start ?? null;
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

// Creates a new Projects-DB page from the review wizard's manual "new projects"
// panel. Defaults: Status="Active", Priority="Medium" (both from
// constants/priorities.ts), Department=<area base>. Due Date is set only when a
// dueDate (YYYY-MM-DD) is supplied. No assumptions about other properties.
const PROJECT_DEFAULT_STATUS = STATUSES[0]; // "Active"
const PROJECT_DEFAULT_PRIORITY = PRIORITIES[1]; // "Medium"

export async function createAreaProject(input: {
  name: string;
  department: string;
  dueDate?: string | null;
}): Promise<{ id: string; url: string }> {
  const dataSourceId = await getProjectsDataSourceId();
  const properties: Record<string, unknown> = {
    Name: { title: rt(input.name) },
    Status: { status: { name: PROJECT_DEFAULT_STATUS } },
    Priority: { select: { name: PROJECT_DEFAULT_PRIORITY } },
    Department: { select: { name: input.department } },
  };
  if (input.dueDate) {
    properties["Due Date"] = { date: { start: input.dueDate } };
  }
  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: properties as any,
  })) as any;
  return { id: page.id, url: page.url as string };
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
        currentMilestone: richTextText(p["Current Milestone"]),
        milestoneDueDate: dateStart(p["Milestone Due Date"]),
        healthMetric: richTextText(p["Health Metric"]),
      });
    }
    cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
  } while (cursor);
  return out;
}
