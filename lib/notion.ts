import "server-only";
import { Client } from "@notionhq/client";
import type { Priority, Status } from "@/constants/priorities";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Lightweight health check — verifies the token by calling users.me().
export async function pingNotion(): Promise<{ name: string | null }> {
  const me = (await notion.users.me({})) as unknown as { name?: string | null };
  return { name: me.name ?? null };
}

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
function asUrl(prop: any): string | null {
  if (!prop || prop.type !== "url") return null;
  const v = prop.url;
  return typeof v === "string" && v.length > 0 ? v : null;
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
export async function getPageBlocks(pageId: string): Promise<NotionBlock[]> {
  const top = await fetchBlockChildren(pageId);
  for (const block of top) {
    if (block.has_children) {
      block.children = await fetchBlockChildren(block.id);
    }
  }
  return top;
}

export type SelectOption = { id: string; name: string; color: string | null };

// Fetches the Projects data-source schema and returns the options of a `select` or `status`
// property. For `status` props the API exposes options nested under `groups[].options`; we
// flatten across groups so callers don't need to care about grouping.
// Returns `null` when the property is absent OR is neither `select` nor `status`. The caller
// surfaces a helpful empty state in that case (e.g. Settings UI asks Markus to add it).
export async function fetchSelectOptions(propertyName: string): Promise<SelectOption[] | null> {
  const dataSourceId = await getProjectsDataSourceId();
  const ds = (await notion.dataSources.retrieve({
    data_source_id: dataSourceId,
  })) as unknown as {
    properties?: Record<
      string,
      {
        type: string;
        select?: { options?: SelectOption[] };
        status?: {
          options?: SelectOption[];
          groups?: { name: string; option_ids: string[] }[];
        };
      }
    >;
  };
  const prop = ds.properties?.[propertyName];
  if (!prop) return null;
  if (prop.type === "select") return prop.select?.options ?? [];
  if (prop.type === "status") {
    // Notion exposes the full option list at status.options (each carrying its own color).
    // groups[].option_ids only references them — we don't need the grouping for badge colour.
    return prop.status?.options ?? [];
  }
  return null;
}

// ===== Clients DB ==========================================================
// The Clients DB is created manually by Markus in Notion (see CLAUDE.md PARA
// section). NOTION_CLIENTS_DB_ID must be set in .env.local. Missing env or
// missing properties fail loudly at runtime — preferable to silent empty results.

export type NotionClient = {
  pageId: string;
  url: string;
  name: string;
  zohoContactId: string;
  industry: string | null;
  employees: number | null;
  monthlyRevenue: number | null;
  callNotesLink: string | null;
  clientDatabaseLink: string | null;
  dashboardLink: string | null;
};

export type ClientUpdateField =
  | "Industry"
  | "Employees"
  | "Monthly Revenue"
  | "Call Notes Link"
  | "Client Database Link"
  | "Dashboard Link";

let clientsDataSourceId: string | null = null;

async function getClientsDataSourceId(): Promise<string> {
  if (clientsDataSourceId) return clientsDataSourceId;
  const dbId = process.env.NOTION_CLIENTS_DB_ID;
  if (!dbId) throw new Error("NOTION_CLIENTS_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) throw new Error("Clients DB has no data_sources — is the integration shared with the database?");
  clientsDataSourceId = ds.id;
  return ds.id;
}

function toClient(page: any): NotionClient {
  const p = page.properties as Record<string, unknown>;
  return {
    pageId: page.id,
    url: page.url,
    name: asTitle(requireProp(p, "Name")),
    zohoContactId: asRichText(requireProp(p, "Zoho Contact ID")).trim(),
    industry: asSelect(requireProp(p, "Industry")),
    employees: asNumber(requireProp(p, "Employees")),
    monthlyRevenue: asNumber(requireProp(p, "Monthly Revenue")),
    callNotesLink: asUrl(requireProp(p, "Call Notes Link")),
    clientDatabaseLink: asUrl(requireProp(p, "Client Database Link")),
    dashboardLink: asUrl(requireProp(p, "Dashboard Link")),
  };
}

export async function listNotionClients(): Promise<NotionClient[]> {
  const dataSourceId = await getClientsDataSourceId();
  const clients: NotionClient[] = [];
  let startCursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: startCursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        clients.push(toClient(page));
      }
    }
    startCursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
  } while (startCursor);
  return clients;
}

// Same block tree shape as Projects. Re-exported under a Client-named alias so callers
// signal intent at the call site; the implementation is the shared getPageBlocks helper.
export async function getClientPageBlocks(pageId: string): Promise<NotionBlock[]> {
  return getPageBlocks(pageId);
}

function buildClientPropertyBody(
  field: ClientUpdateField,
  value: unknown,
): Record<string, any> {
  switch (field) {
    case "Industry":
      if (value !== null && typeof value !== "string") {
        throw new Error("Industry value must be string or null");
      }
      return { Industry: { type: "select", select: value ? { name: value } : null } };
    case "Employees":
      if (value !== null && typeof value !== "number") {
        throw new Error("Employees value must be number or null");
      }
      return { Employees: { type: "number", number: value as number | null } };
    case "Monthly Revenue":
      if (value !== null && typeof value !== "number") {
        throw new Error("Monthly Revenue value must be number or null");
      }
      return { "Monthly Revenue": { type: "number", number: value as number | null } };
    case "Call Notes Link":
    case "Client Database Link":
    case "Dashboard Link": {
      if (value !== null && typeof value !== "string") {
        throw new Error(`${field} value must be string or null`);
      }
      const url = typeof value === "string" && value.length > 0 ? value : null;
      return { [field]: { type: "url", url } };
    }
  }
}

export async function updateClientField(
  pageId: string,
  field: ClientUpdateField,
  value: unknown,
): Promise<void> {
  const properties = buildClientPropertyBody(field, value);
  await notion.pages.update({ page_id: pageId, properties: properties as any });
}

// ===== Projects scoped to a client =========================================

// Filters the Projects DB to rows whose `Client` rich_text contains `clientName`.
// Lightweight join used by the Clients tab — both for "this month's tasks" display
// and for the generate-tasks idempotency check.
export async function listProjectsByClient(clientName: string): Promise<Project[]> {
  if (clientName.trim().length === 0) return [];
  const dataSourceId = await getProjectsDataSourceId();
  const projects: Project[] = [];
  let startCursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "Client", rich_text: { contains: clientName } },
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

// Creates a Project page in the Notion Projects DB with arbitrary client + due date.
// Wider input surface than `createProject` (which is fed by the Projects tab dialog
// and never sets `Client`). Used by the Clients tab to spawn this-month tasks.
export async function createClientProject(input: {
  name: string;
  client: string;
  status: Status;
  area: string;
  priority: Priority;
  dueDate: string | null;
}): Promise<Project> {
  const dataSourceId = await getProjectsDataSourceId();
  const properties = {
    ...buildPropertyBody("Name", input.name),
    ...buildPropertyBody("Status", input.status),
    ...buildPropertyBody("Area", input.area),
    ...buildPropertyBody("Priority", input.priority),
    ...buildPropertyBody("Due Date", input.dueDate),
    Client: {
      type: "rich_text",
      rich_text: input.client
        ? [{ type: "text", text: { content: input.client } }]
        : [],
    },
  };
  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: properties as any,
  })) as any;
  return toProject(page);
}

// ===== Areas DB ============================================================
// The Areas DB is created via scripts/create-areas-db.mjs and seeded from
// /roadmap.md. NOTION_AREAS_DB_ID must be set in .env.local. Status is a
// `select` property (NOT `status` like the Projects DB) — filter and update
// shapes differ accordingly.

export type NotionArea = {
  id: string;
  name: string;
  status: string | null;
  standard: string;
  currentMilestone: string;
  milestoneDueDate: string | null;
  nextSteps: string;
  nextFocus: string;
  goal: string;
  healthMetric: string;
  notionUrl: string;
};

export type AreaUpdateField =
  | "Current Milestone"
  | "Next Steps"
  | "Next Focus"
  | "Goal"
  | "Status";

let areasDataSourceId: string | null = null;

async function getAreasDataSourceId(): Promise<string> {
  if (areasDataSourceId) return areasDataSourceId;
  const dbId = process.env.NOTION_AREAS_DB_ID;
  if (!dbId) throw new Error("NOTION_AREAS_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) throw new Error("Areas DB has no data_sources — is the integration shared with the database?");
  areasDataSourceId = ds.id;
  return ds.id;
}

function toArea(page: any): NotionArea {
  const p = page.properties as Record<string, unknown>;
  return {
    id: page.id,
    name: asTitle(requireProp(p, "Name")),
    status: asSelect(requireProp(p, "Status")),
    standard: asRichText(requireProp(p, "Standard")),
    currentMilestone: asRichText(requireProp(p, "Current Milestone")),
    milestoneDueDate: asDate(requireProp(p, "Milestone Due Date")),
    nextSteps: asRichText(requireProp(p, "Next Steps")),
    nextFocus: asRichText(requireProp(p, "Next Focus")),
    goal: asRichText(requireProp(p, "Goal")),
    healthMetric: asRichText(requireProp(p, "Health Metric")),
    notionUrl: page.url,
  };
}

export async function listAreas(): Promise<NotionArea[]> {
  const dataSourceId = await getAreasDataSourceId();
  const areas: NotionArea[] = [];
  let startCursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
      start_cursor: startCursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        areas.push(toArea(page));
      }
    }
    startCursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
  } while (startCursor);
  return areas;
}

// Status is `select` on the Areas DB (not `status` like Projects). Rich-text
// fields write an empty array when value is "" so Notion clears the value.
function buildAreaPropertyBody(field: AreaUpdateField, value: string): Record<string, any> {
  switch (field) {
    case "Status":
      return { Status: { type: "select", select: value ? { name: value } : null } };
    case "Current Milestone":
    case "Next Steps":
    case "Next Focus":
    case "Goal":
      return {
        [field]: {
          type: "rich_text",
          rich_text: value ? [{ type: "text", text: { content: value } }] : [],
        },
      };
    default: {
      const exhaustive: never = field;
      throw new Error(`Unrecognised area field: ${String(exhaustive)}`);
    }
  }
}

export async function updateAreaField(
  pageId: string,
  field: AreaUpdateField,
  value: string,
): Promise<void> {
  const properties = buildAreaPropertyBody(field, value);
  await notion.pages.update({ page_id: pageId, properties: properties as any });
}

// Same block tree shape as Projects/Clients. Re-exported under an Area-named
// alias so callers signal intent at the call site.
export async function getAreaPageBlocks(pageId: string): Promise<NotionBlock[]> {
  return getPageBlocks(pageId);
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
