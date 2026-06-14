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
const clientNotionPatch = (zohoId: string) =>
  `/api/clients/${encodeURIComponent(zohoId)}/notion`;
const clientTemplates = (zohoId: string) =>
  `/api/clients/${encodeURIComponent(zohoId)}/templates`;

const areasBlocks = (id: string) => `/api/areas/${encodeURIComponent(id)}/blocks`;
const areasUpdate = (id: string) => `/api/areas/${encodeURIComponent(id)}/update`;

const einnahmenClient = (zohoId: string) =>
  `/api/einnahmen/client/${encodeURIComponent(zohoId)}`;

export const ROUTES = {
  pages: {
    home: "/",
    inbox: "/inbox",
    projects: "/projects",
    development: "/development",
    digest: "/digest",
    calendar: "/calendar",
    clients: "/clients",
    einnahmen: "/einnahmen",
    fulfillment: "/fulfillment",
    areas: "/areas",
    areasManage: "/areas/manage",
    areasReview: "/areas/review",
    resources: "/resources",
    freizeit: "/freizeit",
    buecher: "/buecher",
    journal: "/journal",
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
    development: {
      list: "/api/development",
    },
    // Einnahmen — read-only revenue grid (Phase 1). `grid` returns the 12-month
    // grid across all joined clients; `client(zohoId)` returns one client's 12
    // cells + payment history.
    einnahmen: {
      grid: "/api/einnahmen",
      client: einnahmenClient,
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
      notionPatch: clientNotionPatch,
      templates: clientTemplates,
    },
    // Fulfillment — monthly checkbox grid over all clients. `list` reads a
    // month's rows joined with the Clients DB; `generate` creates missing rows
    // for the month; `item` patches a single stage checkbox.
    fulfillment: {
      list: "/api/fulfillment",
      generate: "/api/fulfillment/generate",
      item: (id: string) => `/api/fulfillment/${encodeURIComponent(id)}`,
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
    buecher: {
      list: "/api/buecher",
      create: "/api/buecher/create",
      item: (id: string) => `/api/buecher/${encodeURIComponent(id)}`,
      blocks: (id: string) => `/api/buecher/${encodeURIComponent(id)}/blocks`,
    },
    // Weekly Journal — read-only. One endpoint returns both weeks + wins.
    journal: {
      list: "/api/journal",
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
      // Google-login fallback (separate from the calendar OAuth at
      // google.callback): own start/callback endpoints, own redirect URI
      // (GOOGLE_LOGIN_REDIRECT_URI), scopes openid email profile, no token
      // persistence.
      googleStart: "/api/auth/google/start",
      googleCallback: "/api/auth/google/callback",
    },
    inbox: {
      create: "/api/inbox/create",
      list: "/api/inbox/list",
      suggest: "/api/inbox/suggest",
      process: "/api/inbox/process",
    },
  },
} as const;
