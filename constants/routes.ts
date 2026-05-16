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

export const ROUTES = {
  pages: {
    home: "/",
    projects: "/projects",
    digest: "/digest",
    calendar: "/calendar",
    clients: "/clients",
    areas: "/areas",
    resources: "/resources",
    profile: "/profile",
    googleConnected: "/settings/google-connected",
    googleError: "/settings/google-error",
  },
  api: {
    projects: {
      update: "/api/projects/update",
      create: "/api/projects/create",
      blocks: projectBlocks,
      options: "/api/projects/options",
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
  },
} as const;
