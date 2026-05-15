import "server-only";
import { Client } from "@notionhq/client";
import type { Priority, Status } from "@/constants/priorities";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

export type Project = {
  id: string;
  url: string;
  name: string;
  status: Status | null;
  area: string | null;
  priority: Priority | null;
  outcome: string;
  nextAction: string;
  dueDate: string | null;
  estimatedMinutes: number | null;
  client: string;
  createdAt: string;
};

export type ProjectDraft = {
  name: string;
  status: Status;
  area: string;
  priority: Priority;
  dueDate: string | null;
  nextAction: string;
};

export type UpdateField = "Status" | "Priority" | "Name" | "Area" | "Due Date" | "Next Action";

let projectsDataSourceId: string | null = null;

async function getProjectsDataSourceId(): Promise<string> {
  if (projectsDataSourceId) return projectsDataSourceId;
  const dbId = process.env.NOTION_PROJECTS_DB_ID;
  if (!dbId) throw new Error("NOTION_PROJECTS_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) throw new Error("Projects DB has no data_sources — is the integration shared with the database?");
  projectsDataSourceId = ds.id;
  return ds.id;
}

function requireProp(props: Record<string, unknown>, name: string): any {
  if (!(name in props)) {
    throw new Error(
      `Notion property "${name}" missing on Projects page — does the DB schema match CLAUDE.md? Stop and verify.`,
    );
  }
  return props[name];
}

function asTitle(prop: any): string {
  if (!prop || prop.type !== "title") return "";
  return prop.title?.[0]?.plain_text ?? "";
}
function asSelect(prop: any): string | null {
  if (!prop || prop.type !== "select") return null;
  return prop.select?.name ?? null;
}
function asStatus(prop: any): string | null {
  if (!prop || prop.type !== "status") return null;
  return prop.status?.name ?? null;
}
function asRichText(prop: any): string {
  if (!prop || prop.type !== "rich_text") return "";
  return (prop.rich_text ?? []).map((r: any) => r.plain_text).join("");
}
function asDate(prop: any): string | null {
  if (!prop || prop.type !== "date") return null;
  return prop.date?.start ?? null;
}
function asNumber(prop: any): number | null {
  if (!prop || prop.type !== "number") return null;
  return prop.number ?? null;
}

function toProject(page: any): Project {
  const p = page.properties as Record<string, unknown>;
  return {
    id: page.id,
    url: page.url,
    name: asTitle(requireProp(p, "Name")),
    status: asStatus(requireProp(p, "Status")) as Status | null,
    area: asSelect(requireProp(p, "Area")),
    priority: asSelect(requireProp(p, "Priority")) as Priority | null,
    outcome: asRichText(requireProp(p, "Outcome")),
    nextAction: asRichText(requireProp(p, "Next Action")),
    dueDate: asDate(requireProp(p, "Due Date")),
    estimatedMinutes: asNumber(requireProp(p, "Estimated Minutes")),
    client: asRichText(requireProp(p, "Client")),
    createdAt: page.created_time ?? "",
  };
}

export async function listActiveProjects(): Promise<Project[]> {
  const dataSourceId = await getProjectsDataSourceId();
  const projects: Project[] = [];
  let startCursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "Status", status: { equals: "Active" } },
      page_size: 100,
      start_cursor: startCursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        projects.push(toProject(page));
      }
    }
    startCursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
  } while (startCursor);
  return projects;
}

// Build a single property body keyed by Notion property name.
// Status is `status` type, Name is `title`, Next Action / Client / Outcome are `rich_text`,
// Area / Priority are `select`, Due Date is `date` (nullable).
function buildPropertyBody(field: UpdateField, value: string | null): Record<string, any> {
  switch (field) {
    case "Status":
      return { Status: { type: "status", status: value ? { name: value } : null } };
    case "Priority":
      return { Priority: { type: "select", select: value ? { name: value } : null } };
    case "Area":
      return { Area: { type: "select", select: value ? { name: value } : null } };
    case "Name":
      return { Name: { type: "title", title: [{ type: "text", text: { content: value ?? "" } }] } };
    case "Next Action":
      return {
        "Next Action": {
          type: "rich_text",
          rich_text: value ? [{ type: "text", text: { content: value } }] : [],
        },
      };
    case "Due Date":
      return { "Due Date": { type: "date", date: value ? { start: value } : null } };
  }
}

export async function updateProjectField(
  pageId: string,
  field: UpdateField,
  value: string | null,
): Promise<void> {
  const properties = buildPropertyBody(field, value);
  await notion.pages.update({ page_id: pageId, properties: properties as any });
}

export type NotionAnnotations = {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: string;
};

export type NotionRichText = {
  plain_text: string;
  href?: string | null;
  annotations: NotionAnnotations;
};

export type NotionBlock = {
  id: string;
  type: string;
  has_children: boolean;
  // Type-specific block data carrying the raw Notion shape (e.g. `rich_text`, `checked`, `language`, `icon`).
  data: any;
  // Populated for top-level blocks only — one level deep. Depth-2 children are intentionally omitted.
  children?: NotionBlock[];
};

async function fetchBlockChildren(blockId: string): Promise<NotionBlock[]> {
  const out: NotionBlock[] = [];
  let cursor: string | undefined = undefined;
  do {
    const resp: any = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    } as any);
    for (const b of resp.results ?? []) {
      if (!b || !b.type) continue;
      out.push({
        id: b.id,
        type: b.type,
        has_children: b.has_children ?? false,
        data: b[b.type] ?? {},
      });
    }
    cursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
  } while (cursor);
  return out;
}

// Fetches the page body block tree, one level of nesting. Live API call on every drawer open.
// TODO: cache by (pageId, page.last_edited_time) in Supabase if drawer-open latency becomes noticeable.
export async function getPageBlocks(pageId: string): Promise<NotionBlock[]> {
  const top = await fetchBlockChildren(pageId);
  for (const block of top) {
    if (block.has_children) {
      block.children = await fetchBlockChildren(block.id);
    }
  }
  return top;
}

export async function createProject(draft: ProjectDraft): Promise<Project> {
  const dataSourceId = await getProjectsDataSourceId();
  const properties = {
    ...buildPropertyBody("Name", draft.name),
    ...buildPropertyBody("Status", draft.status),
    ...buildPropertyBody("Area", draft.area),
    ...buildPropertyBody("Priority", draft.priority),
    ...buildPropertyBody("Due Date", draft.dueDate),
    ...buildPropertyBody("Next Action", draft.nextAction),
  };
  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: properties as any,
  })) as any;
  return toProject(page);
}
