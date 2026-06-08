// Single source of truth for every internal page path and every API endpoint
// used by the Business Hub frontend. Never hardcode a route string anywhere
// else — import from here.

const projectBlocks = (pageId: string) =>
  `/api/projects/blocks?pageId=${encodeURIComponent(pageId)}`;

const timeblockConfirm = (id: string) =>
  `/api/digest/timeblocks/${encodeURIComponent(id)}/confirm`;
const timeblockDismiss = (id: string) =>
  `/api/digest/timeblocks/${encodeURIComponent(id)}/dismiss`;

const calendarEvent = (id: string) => `/api/calendar/events/${encodeURIComponent(id)}`;

const clientDetail = (zohoId: string) =>
  `/api/clients/${encodeURIComponent(zohoId)}`;
const clientGenerateTasks = (zohoId: string) =>
  `/api/clients/${encodeURIComponent(zohoId)}/generate-tasks`;
const clientNotionPatch = (zohoId: string) =>
  `/api/clients/${encodeURIComponent(zohoId)}/notion`;
const clientTemplates = (zohoId: string) =>
  `/api/clients/${encodeURIComponent(zohoId)}/templates`;

const areasBlocks = (id: string) => `/api/areas/${encodeURIComponent(id)}/blocks`;
const areasUpdate = (id: string) => `/api/areas/${encodeURIComponent(id)}/update`;

export const ROUTES = {
  pages: {
    home: "/",
    inbox: "/inbox",
    projects: "/projects",
    digest: "/digest",
    calendar: "/calendar",
    clients: "/clients",
    areas: "/areas",
    areasManage: "/areas/manage",
    areasReview: "/areas/review",
    resources: "/resources",
    freizeit: "/freizeit",
    calls: "/calls",
    profile: "/profile",
    capture: "/capture",
    login: "/login",
    googleConnected: "/settings/google-connected",
    googleError: "/settings/google-error",
  },
  api: {
    projects: {
      update: "/api/projects/update",
      create: "/api/projects/create",
      blocks: projectBlocks,
      options: "/api/projects/options",
      suggest: "/api/projects/suggest",
    },
    digest: {
      daily: "/api/digest/daily",
      dailyForce: "/api/digest/daily?force=true",
      timeblocks: "/api/digest/timeblocks",
      timeblockConfirm,
      timeblockDismiss,
    },
    calendar: {
      events: "/api/calendar/events",
      event: calendarEvent,
    },
    clients: {
      list: "/api/clients",
      detail: clientDetail,
      generateTasks: clientGenerateTasks,
      notionPatch: clientNotionPatch,
      templates: clientTemplates,
    },
    areas: {
      list: "/api/areas",
      blocks: areasBlocks,
      update: areasUpdate,
      focus: "/api/areas/focus",
      // Versioning workflow (manage surface). `manage` lists ALL versions
      // (incl. archived); `version` bumps to a new version; `archive` flags
      // old versions Archived=true.
      manage: "/api/areas/manage",
      version: "/api/areas/version",
      archive: "/api/areas/archive",
      // Native Areas Review wizard. `reviewDiff` computes the per-area state +
      // questions; `reviewDraft` calls Anthropic to draft the new version.
      reviewDiff: "/api/areas/review/diff",
      reviewDraft: "/api/areas/review/draft",
      // Manual "new projects" panel in the review step — creates Projects-DB
      // pages in the area's department (independent of the draft/version flow).
      reviewProjects: "/api/areas/review/projects",
      // AI pre-fill for the new-projects panel: suggests one next milestone + 3-6
      // next-phase projects from the area state + roadmap.md (read-only).
      reviewSuggest: "/api/areas/review/suggest",
    },
    resources: {
      list: "/api/resources",
      create: "/api/resources/create",
      options: "/api/resources/options",
      blocks: (id: string) => `/api/resources/${encodeURIComponent(id)}/blocks`,
      archive: (id: string) => `/api/resources/${encodeURIComponent(id)}/archive`,
    },
    freizeit: {
      list: "/api/freizeit",
      create: "/api/freizeit/create",
      item: (id: string) => `/api/freizeit/${encodeURIComponent(id)}`,
      blocks: (id: string) => `/api/freizeit/${encodeURIComponent(id)}/blocks`,
    },
    google: {
      connect: "/api/google/connect",
      disconnect: "/api/google/disconnect",
      status: "/api/google/status",
      callback: "/api/auth/callback/google",
    },
    profile: {
      status: "/api/profile/status",
      settings: "/api/profile/settings",
      calendars: "/api/profile/calendars",
      taskTypes: "/api/profile/task-types",
    },
    archive: {
      sweep: "/api/archive/sweep",
    },
    roadmap: {
      draft: "/api/roadmap/draft",
      apply: "/api/roadmap/apply",
    },
    calls: {
      create: "/api/calls/create",
      mine: "/api/calls/mine",
      list: "/api/calls/list",
    },
    auth: {
      login: "/api/auth/login",
    },
    inbox: {
      create: "/api/inbox/create",
      list: "/api/inbox/list",
      suggest: "/api/inbox/suggest",
      process: "/api/inbox/process",
    },
  },
} as const;
