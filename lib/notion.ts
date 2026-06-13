import "server-only";
import { Client } from "@notionhq/client";
import type { Priority, Status } from "@/constants/priorities";
import {
  DEFAULT_REASON_PROJECT,
  DEFAULT_REASON_RESOURCE,
  type ReasonArchived,
} from "@/constants/archive";
import type {
  CallType,
  EngagementLevel,
  ObjectionTag,
  Outcome,
} from "@/constants/call-notes";
import type { InboxType } from "@/constants/inbox";
import { PROJECT_VIEW_STATUSES } from "@/constants/project-views";
import { mapWeek, mapErfolg, type JournalWeek, type Erfolg } from "@/lib/journal";

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
  department: string | null;
  priority: Priority | null;
  outcome: string;
  nextAction: string;
  dueDate: string | null;
  estimatedMinutes: number | null;
  client: string;
  createdAt: string;
  // Development-tab metadata (Projects DB `Product` / `Dev Type` selects).
  // Read defensively (not via requireProp) so the field is purely additive —
  // existing helpers keep working and a page without the property maps to null.
  product: string | null;
  devType: string | null;
};

export type ProjectDraft = {
  name: string;
  status: Status;
  department: string;
  priority: Priority;
  dueDate: string | null;
  nextAction: string;
  // Development-tab metadata (Projects DB `Product` / `Dev Type` selects).
  // Optional + additive: only written when a non-null/non-empty value is given,
  // so existing callers (Projects tab, generate-tasks) are unaffected.
  product?: string | null;
  devType?: string | null;
};

export type UpdateField =
  | "Status"
  | "Priority"
  | "Name"
  | "Department"
  | "Due Date"
  | "Next Action";

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
function asCheckbox(prop: any): boolean {
  if (!prop || prop.type !== "checkbox") return false;
  return prop.checkbox === true;
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
    department: asSelect(requireProp(p, "Department")),
    priority: asSelect(requireProp(p, "Priority")) as Priority | null,
    outcome: asRichText(requireProp(p, "Outcome")),
    nextAction: asRichText(requireProp(p, "Next Action")),
    dueDate: asDate(requireProp(p, "Due Date")),
    estimatedMinutes: asNumber(requireProp(p, "Estimated Minutes")),
    client: asRichText(requireProp(p, "Client")),
    createdAt: page.created_time ?? "",
    // Additive — read without requireProp so a page missing the property maps to
    // null instead of throwing (keeps every existing helper working).
    product: asSelect(p["Product"]),
    devType: asSelect(p["Dev Type"]),
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

// Loads every project whose Status is referenced by one of the named list-views
// (PROJECT_VIEWS) — the union of Active / In Progress / Later / Backlog / On Hold
// / Waiting / Done. Same projection/mapping as `listActiveProjects`; the Projects
// tab then filters this superset down per the active view client-side.
// `listActiveProjects` is deliberately left untouched (shared by Calendar / Areas
// / Digest, which only want Active).
export async function listProjectsForViews(): Promise<Project[]> {
  const dataSourceId = await getProjectsDataSourceId();
  const projects: Project[] = [];
  let startCursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        or: PROJECT_VIEW_STATUSES.map((status) => ({
          property: "Status",
          status: { equals: status },
        })),
      },
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

// Loads every project flagged as dev work (Department select = "Development"),
// across all statuses, for the Development tab. Same projection/mapping as
// `listActiveProjects` (toProject reads only the named properties — incl. the
// additive `Product` / `Dev Type` selects). Department is a `select` property,
// so the filter uses `select.equals` (not `status.equals`).
export async function listDevelopmentProjects(): Promise<Project[]> {
  const dataSourceId = await getProjectsDataSourceId();
  const projects: Project[] = [];
  let startCursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "Department", select: { equals: "Development" } },
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

// A Project plus the page's `last_edited_time` metadata. Same property-column
// projection as `listActiveProjects`; the extra metadata field is consumed by
// the roadmap-draft route's Sonnet prompt.
export type ProjectByStatus = Project & { lastEditedTime: string };

// Like `listActiveProjects` but parameterised on the Status value (instead of
// hardcoding "Active"). Used by /api/roadmap/draft with "Done".
export async function listProjectsByStatus(status: string): Promise<ProjectByStatus[]> {
  const dataSourceId = await getProjectsDataSourceId();
  const projects: ProjectByStatus[] = [];
  let startCursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "Status", status: { equals: status } },
      page_size: 100,
      start_cursor: startCursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        projects.push({ ...toProject(page), lastEditedTime: page.last_edited_time ?? "" });
      }
    }
    startCursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
  } while (startCursor);
  return projects;
}

// Build a single property body keyed by Notion property name.
// Status is `status` type, Name is `title`, Next Action / Client / Outcome are `rich_text`,
// Department / Priority are `select`, Due Date is `date` (nullable).
function buildPropertyBody(field: UpdateField, value: string | null): Record<string, any> {
  switch (field) {
    case "Status":
      return { Status: { type: "status", status: value ? { name: value } : null } };
    case "Priority":
      return { Priority: { type: "select", select: value ? { name: value } : null } };
    case "Department":
      return { Department: { type: "select", select: value ? { name: value } : null } };
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
  monthlyFee: number | null;
  person: string | null;
  // Maps to the Notion property literally named "Status" on the Clients DB
  // (verified via scripts/inspect-clients-db.mjs). Field renamed in TS to
  // avoid collision with the Project status terminology used elsewhere.
  clientStatus: string | null;
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
    monthlyFee: asNumber(requireProp(p, "Monthly Fee")),
    person: asRichText(requireProp(p, "Person")) || null,
    clientStatus: asSelect(requireProp(p, "Status")),
    // These three are `rich_text` in Notion (verified via the Clients DB
    // schema), not `url` properties — the link is stored as plain text inside
    // the rich_text content. asUrl() would always return null here.
    callNotesLink: asRichText(requireProp(p, "Call Notes Link")) || null,
    clientDatabaseLink: asRichText(requireProp(p, "Client Database Link")) || null,
    dashboardLink: asRichText(requireProp(p, "Dashboard Link")) || null,
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
  department: string;
  priority: Priority;
  dueDate: string | null;
}): Promise<Project> {
  const dataSourceId = await getProjectsDataSourceId();
  const properties = {
    ...buildPropertyBody("Name", input.name),
    ...buildPropertyBody("Status", input.status),
    ...buildPropertyBody("Department", input.department),
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
  category: string | null;
  status: string | null;
  standard: string;
  currentMilestone: string;
  milestoneDueDate: string | null;
  nextSteps: string;
  nextFocus: string;
  goal: string;
  healthMetric: string;
  notionUrl: string;
  archived: boolean;
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
    // `Kategorie` is read defensively (direct access, like `Archived`) so an
    // unconfigured DB doesn't throw — null when the select is absent/empty.
    category: asSelect(p["Kategorie"]),
    status: asSelect(requireProp(p, "Status")),
    standard: asRichText(requireProp(p, "Standard")),
    currentMilestone: asRichText(requireProp(p, "Current Milestone")),
    milestoneDueDate: asDate(requireProp(p, "Milestone Due Date")),
    nextSteps: asRichText(requireProp(p, "Next Steps")),
    nextFocus: asRichText(requireProp(p, "Next Focus")),
    goal: asRichText(requireProp(p, "Goal")),
    healthMetric: asRichText(requireProp(p, "Health Metric")),
    notionUrl: page.url,
    archived: asCheckbox(p["Archived"]),
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
  return areas.filter((a) => !a.archived);
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
    ...buildPropertyBody("Department", draft.department),
    ...buildPropertyBody("Priority", draft.priority),
    ...buildPropertyBody("Due Date", draft.dueDate),
    ...buildPropertyBody("Next Action", draft.nextAction),
    // Additive Development-tab selects — only set when present, mirroring the
    // Department `select` write shape. A page without them simply omits them.
    ...(draft.product
      ? { Product: { type: "select", select: { name: draft.product } } }
      : {}),
    ...(draft.devType
      ? { "Dev Type": { type: "select", select: { name: draft.devType } } }
      : {}),
  };
  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: properties as any,
  })) as any;
  return toProject(page);
}

// ===== Resources DB ========================================================
// Tab 6's source of truth. NOTION_RESOURCES_DB_ID must be set; missing env
// surfaces a clear error rather than failing silently. The `Confidence`
// property's actual type in Notion isn't pinned down (could be select / number
// / formula), so the extractor below tries each shape defensively.

export type NotionResource = {
  id: string;
  name: string;
  area: string | null;
  type: string | null;
  status: string | null;
  confidence: string | null;
  source: string | null;
  summary: string | null;
  tags: string[];
  lastReviewed: string | null;
  created: string;
  notionUrl: string;
};

export type ResourceDraft = {
  name: string;
  area: string | null;
  type: string | null;
  body: string;
};

let resourcesDataSourceId: string | null = null;

async function getResourcesDataSourceId(): Promise<string> {
  if (resourcesDataSourceId) return resourcesDataSourceId;
  const dbId = process.env.NOTION_RESOURCES_DB_ID;
  if (!dbId) throw new Error("NOTION_RESOURCES_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) throw new Error("Resources DB has no data_sources — is the integration shared with the database?");
  resourcesDataSourceId = ds.id;
  return ds.id;
}

function asMultiSelect(prop: any): string[] {
  if (!prop || prop.type !== "multi_select") return [];
  return (prop.multi_select ?? []).map((o: { name: string }) => o.name);
}

// Confidence's type isn't fixed in the Notion schema. Probe each plausible
// shape and stringify whatever non-null value we find; return null otherwise.
function asConfidence(prop: any): string | null {
  if (!prop) return null;
  try {
    if (prop.type === "select") return prop.select?.name ?? null;
    if (prop.type === "number") return prop.number != null ? String(prop.number) : null;
    if (prop.type === "rich_text") return asRichText(prop) || null;
    if (prop.type === "formula") {
      const f = prop.formula;
      if (!f) return null;
      if (f.type === "string") return f.string ?? null;
      if (f.type === "number") return f.number != null ? String(f.number) : null;
      if (f.type === "boolean") return f.boolean === true ? "true" : f.boolean === false ? "false" : null;
    }
  } catch {
    return null;
  }
  return null;
}

function toResource(page: any): NotionResource {
  const p = page.properties as Record<string, unknown>;
  // We don't use `requireProp` here — the Resources DB may be authored loosely
  // and a missing property shouldn't crash the whole list query. Each safe
  // extractor below tolerates `undefined` and returns its empty default.
  const get = (n: string) => p[n] as any;
  return {
    id: page.id,
    name: asTitle(get("Name")),
    area: asSelect(get("Area")),
    type: asSelect(get("Type")),
    status: asSelect(get("Status")),
    confidence: asConfidence(get("Confidence")),
    source: asUrl(get("Source")),
    summary: asRichText(get("Summary")) || null,
    tags: asMultiSelect(get("Tags")),
    lastReviewed: asDate(get("Last Reviewed")),
    created: page.created_time ?? "",
    notionUrl: page.url,
  };
}

export async function listResources(): Promise<NotionResource[]> {
  const dataSourceId = await getResourcesDataSourceId();
  const resources: NotionResource[] = [];
  let startCursor: string | undefined = undefined;
  // Cap at 200 to avoid runaway pagination on an unexpectedly large DB.
  for (let pageCount = 0; pageCount < 2; pageCount++) {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [{ property: "Name", direction: "ascending" }],
      page_size: 100,
      start_cursor: startCursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        resources.push(toResource(page));
      }
    }
    if (!resp.has_more) break;
    startCursor = resp.next_cursor ?? undefined;
    if (!startCursor) break;
  }
  return resources;
}

// Same block tree shape as Projects/Areas. Thin alias over `getPageBlocks` so
// the Resources drawer's call site signals intent.
export async function getResourcePageBlocks(pageId: string): Promise<NotionBlock[]> {
  return getPageBlocks(pageId);
}

// Mirror of `fetchSelectOptions` but against the RESOURCES data source (its own
// cached `resourcesDataSourceId`). The Resources DB has its own Area taxonomy,
// distinct from the Projects departments — /api/resources/options uses this so
// the Add-Note dialog offers the correct option set. Returns `null` when the
// property is absent or is neither `select` nor `status`.
export async function fetchResourceSelectOptions(
  propertyName: string,
): Promise<SelectOption[] | null> {
  const dataSourceId = await getResourcesDataSourceId();
  const ds = (await notion.dataSources.retrieve({
    data_source_id: dataSourceId,
  })) as unknown as {
    properties?: Record<
      string,
      {
        type: string;
        select?: { options?: SelectOption[] };
        status?: { options?: SelectOption[] };
      }
    >;
  };
  const prop = ds.properties?.[propertyName];
  if (!prop) return null;
  if (prop.type === "select") return prop.select?.options ?? [];
  if (prop.type === "status") return prop.status?.options ?? [];
  return null;
}

export async function createResource(draft: ResourceDraft): Promise<NotionResource> {
  const dataSourceId = await getResourcesDataSourceId();
  const properties: Record<string, any> = {
    Name: { type: "title", title: [{ type: "text", text: { content: draft.name } }] },
  };
  if (draft.area) {
    properties.Area = { type: "select", select: { name: draft.area } };
  }
  if (draft.type) {
    properties.Type = { type: "select", select: { name: draft.type } };
  }
  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: properties as any,
  })) as any;
  if (draft.body && draft.body.trim()) {
    await appendTextBlocks(page.id, draft.body);
  }
  return toResource(page);
}

/**
 * Append free-form text to a Notion page as paragraph blocks. Each line of
 * text becomes one paragraph block; empty lines become empty paragraphs
 * (preserving the user's spacing intent). No-ops silently when text is blank.
 *
 * Notion's append API caps `children` at 100 per call, so longer inputs are
 * split into successive batched appends in order.
 */
export async function appendTextBlocks(pageId: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const lines = trimmed.split("\n");
  const children = lines.map((line) => ({
    type: "paragraph" as const,
    paragraph: {
      rich_text: line
        ? [{ type: "text" as const, text: { content: line } }]
        : [],
    },
  }));
  for (let i = 0; i < children.length; i += 100) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: children.slice(i, i + 100),
    });
  }
}

// ===== Archive DB ==========================================================
// Phase 2 archive automation. NOTION_ARCHIVES_DB_ID must be set. Archiving a
// Project or Resource creates a metadata-only entry in the Archive DB and then
// moves the source page to Notion's trash. The Archive DB schema is owned by
// Phase 1 — these helpers only write data, never edit the schema.

let archivesDataSourceId: string | null = null;

async function getArchivesDataSourceId(): Promise<string> {
  if (archivesDataSourceId) return archivesDataSourceId;
  const dbId = process.env.NOTION_ARCHIVES_DB_ID;
  if (!dbId) throw new Error("NOTION_ARCHIVES_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) throw new Error("Archive DB has no data_sources — is the integration shared with the database?");
  archivesDataSourceId = ds.id;
  return ds.id;
}

// One archived item, mapped to the Archive DB columns. `Department` applies to
// archived Projects; `Area` / `Source` / `Summary` / `Tags` apply to archived
// Resources. `OriginalCreated` is the source page's `created_time`.
export type ArchivePayload = {
  Name: string;
  Origin: string;
  ReasonArchived: ReasonArchived;
  Type: string;
  Department?: string;
  Area?: string;
  Source?: string;
  Summary?: string;
  Tags?: string[];
  OriginalCreated: string | null;
};

export type ArchiveResult = { archiveId: string; sourceArchived: boolean };

// Creates a metadata-only entry in the Archive DB. `Archived Date` is today
// (UTC). Optional fields are written only when present.
// TODO: v1 metadata-only — body blocks not copied; source page retains body in
// Notion trash (30-day retention). Revisit when block-copy ships.
export async function createArchiveEntry(payload: ArchivePayload): Promise<string> {
  const dataSourceId = await getArchivesDataSourceId();
  const archivedDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

  const properties: Record<string, any> = {
    Name: { type: "title", title: [{ type: "text", text: { content: payload.Name } }] },
    Origin: { type: "select", select: { name: payload.Origin } },
    "Reason Archived": { type: "select", select: { name: payload.ReasonArchived } },
    "Archived Date": { type: "date", date: { start: archivedDate } },
    "Original Created": {
      type: "date",
      date: payload.OriginalCreated ? { start: payload.OriginalCreated } : null,
    },
  };
  if (payload.Type) {
    properties.Type = { type: "select", select: { name: payload.Type } };
  }
  if (payload.Department) {
    properties.Department = { type: "select", select: { name: payload.Department } };
  }
  if (payload.Area) {
    properties.Area = { type: "select", select: { name: payload.Area } };
  }
  if (payload.Source) {
    properties.Source = { type: "url", url: payload.Source };
  }
  if (payload.Summary) {
    properties.Summary = {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: payload.Summary } }],
    };
  }
  if (payload.Tags && payload.Tags.length > 0) {
    properties.Tags = {
      type: "multi_select",
      multi_select: payload.Tags.map((name) => ({ name })),
    };
  }

  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: properties as any,
  })) as any;
  return page.id as string;
}

// Partial-failure handler: the Archive entry exists but trashing the source
// page failed. Per spec we do NOT roll back (the new Archive entry is kept) —
// log both ids and throw so the caller can surface a 502.
function throwSourceTrashFailed(
  kind: string,
  archiveId: string,
  sourcePageId: string,
  err: unknown,
): never {
  // eslint-disable-next-line no-console
  console.error(
    `[archive] ${kind}: Archive entry created but the source page could NOT be ` +
      `trashed. archiveId=${archiveId} sourcePageId=${sourcePageId}`,
    err,
  );
  throw new Error(
    `source_trash_failed: Archive entry ${archiveId} was created, but the source ` +
      `page ${sourcePageId} could not be moved to trash. No rollback performed — ` +
      `retry trashing the source in Notion, or remove the Archive entry manually.`,
  );
}

// Archives a Project: copies metadata into the Archive DB, then trashes the
// source page. Reads only the source properties it maps (Name, Department).
export async function archiveProjectPage(
  pageId: string,
  opts?: { reason?: ReasonArchived },
): Promise<ArchiveResult> {
  const page = (await notion.pages.retrieve({ page_id: pageId })) as any;
  const props = (page.properties ?? {}) as Record<string, unknown>;

  const payload: ArchivePayload = {
    Name: asTitle(props.Name),
    Origin: "Project",
    ReasonArchived: opts?.reason ?? DEFAULT_REASON_PROJECT,
    Type: "Project",
    Department: asSelect(props.Department) ?? undefined,
    Area: undefined,
    Source: undefined,
    Summary: undefined,
    Tags: undefined,
    OriginalCreated: page.created_time ?? null,
  };

  const archiveId = await createArchiveEntry(payload);
  try {
    await notion.pages.update({ page_id: pageId, in_trash: true });
  } catch (err) {
    throwSourceTrashFailed("archiveProjectPage", archiveId, pageId, err);
  }
  return { archiveId, sourceArchived: true };
}

// Archives a Resource: copies metadata into the Archive DB, then trashes the
// source page. Reads only the source properties it maps (Name, Type, Area,
// Source, Summary, Tags).
export async function archiveResourcePage(
  pageId: string,
  opts?: { reason?: ReasonArchived },
): Promise<ArchiveResult> {
  const page = (await notion.pages.retrieve({ page_id: pageId })) as any;
  const props = (page.properties ?? {}) as Record<string, unknown>;

  const payload: ArchivePayload = {
    Name: asTitle(props.Name),
    Origin: "Resource",
    ReasonArchived: opts?.reason ?? DEFAULT_REASON_RESOURCE,
    Type: asSelect(props.Type) ?? "",
    Department: undefined,
    Area: asSelect(props.Area) ?? undefined,
    Source: asUrl(props.Source) ?? undefined,
    Summary: asRichText(props.Summary) || undefined,
    Tags: asMultiSelect(props.Tags),
    OriginalCreated: page.created_time ?? null,
  };

  const archiveId = await createArchiveEntry(payload);
  try {
    await notion.pages.update({ page_id: pageId, in_trash: true });
  } catch (err) {
    throwSourceTrashFailed("archiveResourcePage", archiveId, pageId, err);
  }
  return { archiveId, sourceArchived: true };
}

// ===== Call Notes DB =======================================================
// The Call Notes DB is created manually by Markus in Notion (the integration
// does not create databases). NOTION_CALL_NOTES_DB_ID must be set in
// .env.local. Pages are written by /api/calls/create, which is called by the
// external "Call Miner" Cowork skill — Business Hub owns the schema mapping.

let callNotesDataSourceId: string | null = null;

async function getCallNotesDataSourceId(): Promise<string> {
  if (callNotesDataSourceId) return callNotesDataSourceId;
  const dbId = process.env.NOTION_CALL_NOTES_DB_ID;
  if (!dbId) throw new Error("call_notes_not_configured");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) throw new Error("Call Notes DB has no data_sources — is the integration shared with the database?");
  callNotesDataSourceId = ds.id;
  return ds.id;
}

export type CallNoteDraft = {
  name: string;
  callType: CallType;
  date: string; // YYYY-MM-DD
  clientNotionPageId?: string | null;
  duration?: number | null;
  outcome?: Outcome | null;
  engagement?: EngagementLevel | null;
  objectionsCount?: number | null;
  objectionsTags?: ObjectionTag[];
  body?: string;
};

// Creates a page in the Call Notes DB. Only the fields present on the draft are
// written. `body`, when non-empty, is appended as paragraph blocks after the
// page is created — an append failure is non-fatal (logged, not thrown).
export async function createCallNote(
  draft: CallNoteDraft,
): Promise<{ id: string; url: string }> {
  if (!process.env.NOTION_CALL_NOTES_DB_ID) {
    throw new Error("call_notes_not_configured");
  }
  const dataSourceId = await getCallNotesDataSourceId();

  const properties: Record<string, any> = {
    Name: { type: "title", title: [{ type: "text", text: { content: draft.name } }] },
    "Call Type": { type: "select", select: { name: draft.callType } },
    Date: { type: "date", date: { start: draft.date } },
  };
  if (draft.clientNotionPageId) {
    properties.Client = {
      type: "relation",
      relation: [{ id: draft.clientNotionPageId }],
    };
  }
  if (draft.duration != null) {
    properties.Duration = { type: "number", number: draft.duration };
  }
  if (draft.outcome) {
    properties.Outcome = { type: "select", select: { name: draft.outcome } };
  }
  if (draft.engagement) {
    properties.Engagement = { type: "select", select: { name: draft.engagement } };
  }
  if (draft.objectionsCount != null) {
    properties["Objections Count"] = { type: "number", number: draft.objectionsCount };
  }
  if (draft.objectionsTags && draft.objectionsTags.length > 0) {
    properties["Objections Tags"] = {
      type: "multi_select",
      multi_select: draft.objectionsTags.map((name) => ({ name })),
    };
  }

  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: properties as any,
  })) as any;

  // Non-fatal: the page exists even if the block append fails.
  if (draft.body && draft.body.trim()) {
    await appendTextBlocks(page.id, draft.body).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("append_blocks_failed", err);
    });
  }

  return { id: page.id as string, url: page.url as string };
}

export type CallNoteSummary = {
  id: string;
  name: string;
  callType: string | null;
  date: string | null;
  outcome: string | null;
  notionUrl: string;
};

// Lists the most recent Call Notes (default 25), most-recent Date first. Same
// data_source_id cache + dataSources.query pattern as listResources. Projects
// only the fields the Calls tab list needs. Throws `call_notes_not_configured`
// when NOTION_CALL_NOTES_DB_ID is unset (via getCallNotesDataSourceId).
export async function listCallNotes(limit = 25): Promise<CallNoteSummary[]> {
  const dataSourceId = await getCallNotesDataSourceId();
  const resp: any = await notion.dataSources.query({
    data_source_id: dataSourceId,
    sorts: [{ property: "Date", direction: "descending" }],
    page_size: limit,
  } as any);
  const notes: CallNoteSummary[] = [];
  for (const page of resp.results ?? []) {
    if (page && page.object === "page" && "properties" in page) {
      const p = page.properties as Record<string, unknown>;
      notes.push({
        id: page.id,
        name: asTitle(p["Name"] as any),
        callType: asSelect(p["Call Type"] as any),
        date: asDate(p["Date"] as any),
        outcome: asSelect(p["Outcome"] as any),
        notionUrl: page.url,
      });
    }
  }
  return notes;
}

// -- Inbox (Quick Capture) ---------------------------------------------------

let inboxDataSourceId: string | null = null;

async function getInboxDataSourceId(): Promise<string> {
  if (inboxDataSourceId) return inboxDataSourceId;
  const dbId = process.env.NOTION_INBOX_DB_ID;
  if (!dbId) throw new Error("NOTION_INBOX_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) throw new Error("Inbox DB has no data_sources — is the integration shared with the database?");
  inboxDataSourceId = ds.id;
  return ds.id;
}

/**
 * Quick Capture: create a raw entry in the Notion Inbox DB. Sets Name (title),
 * Type (select) and Processed (checkbox=false). `Routed To` is intentionally
 * left empty — triage happens later in Notion. Mirrors the data_source_id
 * create pattern used by createResource/createProject (Notion 2025-09-03+).
 */
export async function addToInbox(
  name: string,
  type: InboxType,
): Promise<{ id: string; url: string }> {
  const dataSourceId = await getInboxDataSourceId();
  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: {
      Name: { type: "title", title: [{ type: "text", text: { content: name } }] },
      Type: { type: "select", select: { name: type } },
      Processed: { type: "checkbox", checkbox: false },
    } as any,
  })) as any;
  return { id: page.id as string, url: page.url as string };
}

// One unprocessed Inbox entry. Most of the captured content lives in `name`
// (the title) as a long free-text string; body blocks are usually empty but may
// exist (the triage suggest route fetches them separately via getPageBlocks).
export type InboxEntry = {
  id: string;
  name: string;
  type: string | null;
  createdTime: string;
};

// Lists unprocessed Inbox entries (Processed=false), oldest-first (FIFO) by the
// `Captured At` created_time property. Reuses the lazily-cached
// inboxDataSourceId already used by addToInbox.
export async function listInboxEntries(): Promise<InboxEntry[]> {
  const dataSourceId = await getInboxDataSourceId();
  const entries: InboxEntry[] = [];
  let startCursor: string | undefined = undefined;
  do {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: "Processed", checkbox: { equals: false } },
      // Sort by the page's system created_time (FIFO). The Inbox DB has no
      // "Captured At" property — capture time is page.created_time.
      sorts: [{ timestamp: "created_time", direction: "ascending" }],
      page_size: 100,
      start_cursor: startCursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        const p = page.properties as Record<string, unknown>;
        entries.push({
          id: page.id,
          name: asTitle(p["Name"] as any),
          type: asSelect(p["Type"] as any),
          createdTime: page.created_time ?? "",
        });
      }
    }
    startCursor = resp.has_more ? resp.next_cursor ?? undefined : undefined;
  } while (startCursor);
  return entries;
}

// Updates an Inbox entry's triage fields. Only the provided properties are
// written: Processed (checkbox), Routed To (rich_text), Type (select). Used
// after routing an entry to a Project / Resource, or marking it Someday.
export async function updateInboxEntry(
  pageId: string,
  patch: { processed?: boolean; routedTo?: string; type?: string },
): Promise<void> {
  const properties: Record<string, any> = {};
  if (patch.processed !== undefined) {
    properties.Processed = { type: "checkbox", checkbox: patch.processed };
  }
  if (patch.routedTo !== undefined) {
    properties["Routed To"] = {
      type: "rich_text",
      rich_text: patch.routedTo
        ? [{ type: "text", text: { content: patch.routedTo } }]
        : [],
    };
  }
  if (patch.type !== undefined) {
    properties.Type = { type: "select", select: patch.type ? { name: patch.type } : null };
  }
  await notion.pages.update({ page_id: pageId, properties: properties as any });
}

// ===== Freizeit DB =========================================================
// Leisure tracker (Filme, Serien, Videospiele). NOTION_FREIZEIT_DB_ID must be
// set; a missing env surfaces a clear error rather than failing silently.
// Mirrors the Resources DB lazy-cache + data_source_id create pattern.

export type NotionFreizeitItem = {
  id: string;
  name: string;
  category: string | null;
  status: string | null;
  doneDate: string | null;
  link: string | null;
  note: string | null;
  cover: string | null;
  createdTime: string;
  notionUrl: string;
};

export type FreizeitDraft = {
  name: string;
  category?: string | null;
  link?: string | null;
  note?: string | null;
  cover?: string | null;
  body?: string;
};

export type FreizeitUpdateField = "Status" | "Erledigt am" | "Link" | "Notiz" | "Cover";

let freizeitDataSourceId: string | null = null;

async function getFreizeitDataSourceId(): Promise<string> {
  if (freizeitDataSourceId) return freizeitDataSourceId;
  const dbId = process.env.NOTION_FREIZEIT_DB_ID;
  if (!dbId) throw new Error("NOTION_FREIZEIT_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) {
    throw new Error(
      "Freizeit DB has no data_sources — is the integration shared with the database?",
    );
  }
  freizeitDataSourceId = ds.id;
  return ds.id;
}

function toFreizeitItem(page: any): NotionFreizeitItem {
  const p = page.properties as Record<string, unknown>;
  const get = (n: string) => p[n] as any;
  return {
    id: page.id,
    name: asTitle(get("Name")),
    category: asSelect(get("Kategorie")),
    status: asSelect(get("Status")),
    doneDate: asDate(get("Erledigt am")),
    link: asUrl(get("Link")),
    note: asRichText(get("Notiz")) || null,
    // "Cover" is an optional url property added by the cover-art layer; absent on
    // pre-backfill items, so asUrl defensively returns null.
    cover: asUrl(get("Cover")),
    createdTime: page.created_time ?? "",
    notionUrl: page.url,
  };
}

export async function listFreizeit(): Promise<NotionFreizeitItem[]> {
  const dataSourceId = await getFreizeitDataSourceId();
  const items: NotionFreizeitItem[] = [];
  let startCursor: string | undefined = undefined;
  // Cap at 200 (2 pages) to avoid runaway pagination on an unexpectedly large DB.
  for (let pageCount = 0; pageCount < 2; pageCount++) {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 100,
      start_cursor: startCursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        items.push(toFreizeitItem(page));
      }
    }
    if (!resp.has_more) break;
    startCursor = resp.next_cursor ?? undefined;
    if (!startCursor) break;
  }
  return items;
}

export async function createFreizeitItem(draft: FreizeitDraft): Promise<NotionFreizeitItem> {
  const dataSourceId = await getFreizeitDataSourceId();
  const properties: Record<string, any> = {
    Name: { type: "title", title: [{ type: "text", text: { content: draft.name } }] },
    // New items default to "Offen".
    Status: { type: "select", select: { name: "Offen" } },
  };
  if (draft.category) {
    properties.Kategorie = { type: "select", select: { name: draft.category } };
  }
  if (draft.link) {
    properties.Link = { type: "url", url: draft.link };
  }
  if (draft.note) {
    properties.Notiz = {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: draft.note } }],
    };
  }
  if (draft.cover) {
    properties.Cover = { type: "url", url: draft.cover };
  }
  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: properties as any,
  })) as any;
  if (draft.body && draft.body.trim()) {
    // Non-fatal — same posture as createResource: a body-append failure should
    // not lose the created item.
    await appendTextBlocks(page.id, draft.body).catch((err) => {
      console.warn("[freizeit] append_blocks_failed", err);
    });
  }
  return toFreizeitItem(page);
}

// Patch a subset of the editable Freizeit fields. `Status` writes as select,
// `Erledigt am` as date (null clears it), `Link` as url, `Notiz` as rich_text.
// The "done date" tracker logic (set on Erledigt, clear on un-done) lives in the
// PATCH route, which passes the resolved doneDate value here.
export async function updateFreizeitItem(
  pageId: string,
  patch: {
    status?: string;
    doneDate?: string | null;
    link?: string | null;
    note?: string | null;
    cover?: string | null;
  },
): Promise<void> {
  const properties: Record<string, any> = {};
  if (patch.status !== undefined) {
    properties.Status = { type: "select", select: patch.status ? { name: patch.status } : null };
  }
  if (patch.doneDate !== undefined) {
    properties["Erledigt am"] = {
      type: "date",
      date: patch.doneDate ? { start: patch.doneDate } : null,
    };
  }
  if (patch.link !== undefined) {
    properties.Link = { type: "url", url: patch.link ? patch.link : null };
  }
  if (patch.note !== undefined) {
    properties.Notiz = {
      type: "rich_text",
      rich_text: patch.note ? [{ type: "text", text: { content: patch.note } }] : [],
    };
  }
  if (patch.cover !== undefined) {
    properties.Cover = { type: "url", url: patch.cover ? patch.cover : null };
  }
  await notion.pages.update({ page_id: pageId, properties: properties as any });
}

// Ensure the "Cover" (url) property exists on the Freizeit data source. Additive
// and idempotent — if the property already exists, the update is a no-op (Notion
// preserves an existing property when you re-send it with the same type). Used by
// the cover-backfill script so it can run against a DB created before the
// cover-art layer existed.
export async function ensureFreizeitCoverProperty(): Promise<void> {
  const dataSourceId = await getFreizeitDataSourceId();
  const ds = (await notion.dataSources.retrieve({ data_source_id: dataSourceId })) as any;
  const props = (ds.properties ?? {}) as Record<string, { type?: string }>;
  if (props.Cover && props.Cover.type === "url") return; // already present, nothing to do
  await notion.dataSources.update({
    data_source_id: dataSourceId,
    properties: { Cover: { url: {} } },
  } as any);
}

// Same block tree shape as Projects/Resources. Thin alias over getPageBlocks so
// the Freizeit drawer call site signals intent.
export async function getFreizeitPageBlocks(pageId: string): Promise<NotionBlock[]> {
  return getPageBlocks(pageId);
}

// ===== Bücher DB ===========================================================
// Personal library tracker (Buchtitel, Autor, Lese-Status, Tags). NOTION_BUCHER_DB_ID
// must be set; a missing env surfaces a clear error rather than failing silently.
// Mirrors the Freizeit DB lazy-cache + data_source_id create pattern.

export type NotionBuch = {
  id: string;
  name: string;
  author: string | null;
  status: string | null;
  tags: string[];
  startDate: string | null;
  endDate: string | null;
  link: string | null;
  note: string | null;
  cover: string | null;
  createdTime: string;
  notionUrl: string;
};

export type BuchDraft = {
  name: string;
  author?: string | null;
  tags?: string[] | null;
  link?: string | null;
  note?: string | null;
  cover?: string | null;
  body?: string;
};

export type BuchUpdateField =
  | "Status"
  | "Startdatum"
  | "Enddatum"
  | "Link"
  | "Notiz"
  | "Cover";

let bucherDataSourceId: string | null = null;

async function getBucherDataSourceId(): Promise<string> {
  if (bucherDataSourceId) return bucherDataSourceId;
  const dbId = process.env.NOTION_BUCHER_DB_ID;
  if (!dbId) throw new Error("NOTION_BUCHER_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) {
    throw new Error(
      "Bücher DB has no data_sources — is the integration shared with the database?",
    );
  }
  bucherDataSourceId = ds.id;
  return ds.id;
}

function toBuch(page: any): NotionBuch {
  const p = page.properties as Record<string, unknown>;
  const get = (n: string) => p[n] as any;
  return {
    id: page.id,
    name: asTitle(get("Name")),
    author: asRichText(get("Autor")) || null,
    status: asSelect(get("Status")),
    tags: asMultiSelect(get("Tags")),
    startDate: asDate(get("Startdatum")),
    endDate: asDate(get("Enddatum")),
    link: asUrl(get("Link")),
    note: asRichText(get("Notiz")) || null,
    // "Cover" is an optional url property added by the cover-art layer; absent on
    // pre-resolve items, so asUrl defensively returns null.
    cover: asUrl(get("Cover")),
    createdTime: page.created_time ?? "",
    notionUrl: page.url,
  };
}

export async function listBuecher(): Promise<NotionBuch[]> {
  const dataSourceId = await getBucherDataSourceId();
  const items: NotionBuch[] = [];
  let startCursor: string | undefined = undefined;
  // Cap at 200 (2 pages) to avoid runaway pagination on an unexpectedly large DB.
  for (let pageCount = 0; pageCount < 2; pageCount++) {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 100,
      start_cursor: startCursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        items.push(toBuch(page));
      }
    }
    if (!resp.has_more) break;
    startCursor = resp.next_cursor ?? undefined;
    if (!startCursor) break;
  }
  return items;
}

// Retrieve a single Bücher page as a NotionBuch. Used by the PATCH route's
// "stamp date only if currently empty" logic — additive, mirrors the toBuch
// projection used by listBuecher.
export async function getBuch(pageId: string): Promise<NotionBuch> {
  const page = (await notion.pages.retrieve({ page_id: pageId })) as any;
  return toBuch(page);
}

export async function createBuch(draft: BuchDraft): Promise<NotionBuch> {
  const dataSourceId = await getBucherDataSourceId();
  const properties: Record<string, any> = {
    Name: { type: "title", title: [{ type: "text", text: { content: draft.name } }] },
    // New books default to "Demnächst".
    Status: { type: "select", select: { name: "Demnächst" } },
  };
  if (draft.author) {
    properties.Autor = {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: draft.author } }],
    };
  }
  if (draft.tags && draft.tags.length > 0) {
    properties.Tags = {
      type: "multi_select",
      multi_select: draft.tags.map((name) => ({ name })),
    };
  }
  if (draft.link) {
    properties.Link = { type: "url", url: draft.link };
  }
  if (draft.note) {
    properties.Notiz = {
      type: "rich_text",
      rich_text: [{ type: "text", text: { content: draft.note } }],
    };
  }
  if (draft.cover) {
    properties.Cover = { type: "url", url: draft.cover };
  }
  const page = (await notion.pages.create({
    parent: { type: "data_source_id", data_source_id: dataSourceId } as any,
    properties: properties as any,
  })) as any;
  if (draft.body && draft.body.trim()) {
    // Non-fatal — same posture as createFreizeitItem: a body-append failure
    // should not lose the created item.
    await appendTextBlocks(page.id, draft.body).catch((err) => {
      console.warn("[buecher] append_blocks_failed", err);
    });
  }
  return toBuch(page);
}

// Patch a subset of the editable Bücher fields. `Status` writes as select,
// `Startdatum`/`Enddatum` as date (null clears them), `Link` as url, `Notiz` as
// rich_text, `Cover` as url. The "reading-date" tracker logic (set on
// Aktuell/Gelesen only when empty) lives in the PATCH route, which passes the
// resolved startDate/endDate values here.
export async function updateBuch(
  pageId: string,
  patch: {
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
    link?: string | null;
    note?: string | null;
    cover?: string | null;
  },
): Promise<void> {
  const properties: Record<string, any> = {};
  if (patch.status !== undefined) {
    properties.Status = { type: "select", select: patch.status ? { name: patch.status } : null };
  }
  if (patch.startDate !== undefined) {
    properties.Startdatum = {
      type: "date",
      date: patch.startDate ? { start: patch.startDate } : null,
    };
  }
  if (patch.endDate !== undefined) {
    properties.Enddatum = {
      type: "date",
      date: patch.endDate ? { start: patch.endDate } : null,
    };
  }
  if (patch.link !== undefined) {
    properties.Link = { type: "url", url: patch.link ? patch.link : null };
  }
  if (patch.note !== undefined) {
    properties.Notiz = {
      type: "rich_text",
      rich_text: patch.note ? [{ type: "text", text: { content: patch.note } }] : [],
    };
  }
  if (patch.cover !== undefined) {
    properties.Cover = { type: "url", url: patch.cover ? patch.cover : null };
  }
  await notion.pages.update({ page_id: pageId, properties: properties as any });
}

// Ensure the "Cover" (url) property exists on the Bücher data source. Additive
// and idempotent — if the property already exists, the update is a no-op (Notion
// preserves an existing property when you re-send it with the same type).
export async function ensureBuchCoverProperty(): Promise<void> {
  const dataSourceId = await getBucherDataSourceId();
  const ds = (await notion.dataSources.retrieve({ data_source_id: dataSourceId })) as any;
  const props = (ds.properties ?? {}) as Record<string, { type?: string }>;
  if (props.Cover && props.Cover.type === "url") return; // already present, nothing to do
  await notion.dataSources.update({
    data_source_id: dataSourceId,
    properties: { Cover: { url: {} } },
  } as any);
}

// Same block tree shape as Projects/Resources. Thin alias over getPageBlocks so
// the Bücher drawer call site signals intent.
export async function getBuchPageBlocks(pageId: string): Promise<NotionBlock[]> {
  return getPageBlocks(pageId);
}

// ===========================================================================
// Weekly Journal (read-only Tab) — two source DBs:
//   • Weekly Journal (NOTION_WEEKLY_JOURNAL_DB_ID) — one row per ISO week.
//   • Erfolge        (NOTION_ERFOLGE_DB_ID)        — one row per win.
// The Erfolge "Woche" relation points back at a Weekly-Journal page id.
//
// READ-ONLY: there are no create/update helpers here — capture stays in Notion.
// The pure mappers (mapWeek / mapErfolg) + all DTO types live in lib/journal.ts
// so they can be unit-tested without the server-only Notion client. These
// functions only do the data_source query + pagination, then map each page.
// Mirrors the listFreizeit / listBuecher resolver pattern.
// ===========================================================================

let journalWeeksDataSourceId: string | null = null;

async function getJournalWeeksDataSourceId(): Promise<string> {
  if (journalWeeksDataSourceId) return journalWeeksDataSourceId;
  const dbId = process.env.NOTION_WEEKLY_JOURNAL_DB_ID;
  if (!dbId) throw new Error("NOTION_WEEKLY_JOURNAL_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) {
    throw new Error(
      "Weekly Journal DB has no data_sources — is the integration shared with the database?",
    );
  }
  journalWeeksDataSourceId = ds.id;
  return ds.id;
}

let erfolgeDataSourceId: string | null = null;

async function getErfolgeDataSourceId(): Promise<string> {
  if (erfolgeDataSourceId) return erfolgeDataSourceId;
  const dbId = process.env.NOTION_ERFOLGE_DB_ID;
  if (!dbId) throw new Error("NOTION_ERFOLGE_DB_ID is not set");
  const db = (await notion.databases.retrieve({ database_id: dbId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) {
    throw new Error(
      "Erfolge DB has no data_sources — is the integration shared with the database?",
    );
  }
  erfolgeDataSourceId = ds.id;
  return ds.id;
}

// All Weekly-Journal rows, newest week first (by "Woche (Start)"). Mapped via the
// pure mapWeek().
export async function listJournalWeeks(): Promise<JournalWeek[]> {
  const dataSourceId = await getJournalWeeksDataSourceId();
  const weeks: JournalWeek[] = [];
  let startCursor: string | undefined = undefined;
  // Cap at 5 pages (500 rows) — far above the expected one-row-per-week volume.
  for (let pageCount = 0; pageCount < 5; pageCount++) {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [{ property: "Woche (Start)", direction: "descending" }],
      page_size: 100,
      start_cursor: startCursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        weeks.push(mapWeek(page));
      }
    }
    if (!resp.has_more) break;
    startCursor = resp.next_cursor ?? undefined;
    if (!startCursor) break;
  }
  return weeks;
}

// All Erfolge (wins), each carrying its Weekly-Journal relation id(s). Mapped via
// the pure mapErfolg().
export async function listErfolge(): Promise<Erfolg[]> {
  const dataSourceId = await getErfolgeDataSourceId();
  const items: Erfolg[] = [];
  let startCursor: string | undefined = undefined;
  // Cap at 10 pages (1000 wins) — generous headroom for a multi-year history.
  for (let pageCount = 0; pageCount < 10; pageCount++) {
    const resp: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: startCursor,
    } as any);
    for (const page of resp.results ?? []) {
      if (page && page.object === "page" && "properties" in page) {
        items.push(mapErfolg(page));
      }
    }
    if (!resp.has_more) break;
    startCursor = resp.next_cursor ?? undefined;
    if (!startCursor) break;
  }
  return items;
}
