# Business Hub

Internal Next.js application that acts as Markus's primary operating dashboard — a full hub on top of Notion, Google Calendar, and Zoho Books. Read this file in full at the start of every session.

## Project Overview

Business Hub is a solo internal tool for Markus to run his business from one place. It is a tab-based hub with edit-capable surfaces — Markus reads, edits, and acts on his content from inside Business Hub, not by jumping between Notion, Google Calendar, and Zoho.

Single user: Markus. Non-technical founder. No multi-user, no auth flows beyond personal OAuth, no public surface.

**Primary goal:** meet deadlines, maintain overview, and work on what matters with clarity — without being overwhelmed.

What Business Hub IS:
- A full hub with 6 tabs: Projects, AI Digest, Calendar, Clients, Areas, Resources
- An edit-capable frontend on top of Notion + Google Calendar + Zoho Books
- An AI digest that reads everything and tells Markus what to do today and this week

What Business Hub is NOT:
- Not a replacement for Notion as the data layer. Notion still owns the schema and the data.
- Not a CRM, not a billing system. Zoho owns billing.
- Not a multi-user product. Solo app.
- Not a vanity-metrics dashboard.

## Standard Prompt Constraints

Every Claude Code prompt for Business Hub should apply the constraints below. To keep prompts short, prompts can simply state "Apply the standard constraints listed in CLAUDE.md" rather than repeating them. The constraints live here so they update centrally — a change here propagates to all future prompts.

### Always

- Specify exact columns in all Supabase queries. Never `select('*')`.
- All secrets stay server-side. Never expose API keys, refresh tokens, or service-role keys to the client.
- Use existing constants files (`constants/tables.ts`, `constants/models.ts`, `constants/translations.ts`, `constants/areas.ts`, `constants/priorities.ts`, `constants/routes.ts`). Create them if missing. Never hardcode table names, model IDs, route paths, areas, priorities, or user-facing strings inline.
- New i18n strings require both `de` and `en` entries. Single-language entries are a bug.
- Every migration goes in `supabase/migrations/` with a corresponding `MIGRATION_LOG.md` entry (date, filename, what, why). Do not run migrations — surface the file path for Markus to run manually.
- Migrations are additive. No drops, no destructive schema changes without explicit confirmation.
- All work happens on the `dev` branch. Never push directly to `main`.
- Prefer proven libraries over custom code for solved problems (table rendering, drag-and-drop, calendar grids, OAuth flows, date math). Flag the choice.
- Optimistic UI updates for write-heavy surfaces. Reconcile on error with toast + revert.
- Use shadcn primitives where available before installing alternatives.
- CSS through theme tokens (`var(--*)` or Tailwind utilities that map to them). No hardcoded hex except where explicitly scoped (e.g. the amber OKLCH for Medium priority on the Projects Calendar).
- Keep component files under ~400 lines. Extract sub-components when they grow beyond that.
- Run `npm run build` before declaring the task complete.
- Touch only the files listed in the prompt's `<files>` section. Surface unexpected scope creep before acting on it.

### Never

- Do not push to `main` directly.
- Do not introduce dependencies beyond what is listed in the prompt's `<files>` section or explicitly named in the prompt's `<task>` section.
- Do not run destructive migrations or `git` operations beyond the standard `add / commit / push origin dev` flow.
- Do not modify unrelated tabs or features.
- Do not introduce form state libraries (react-hook-form, formik) unless the task specifically requires complex validation.
- Do not auto-detect or change locale defaults.
- Do not add telemetry, analytics, or external logging.

### CLAUDE.md edit policy

CLAUDE.md is the authoritative spec for Business Hub. Edits to it during a feature prompt follow a two-tier policy:

**Tier 1 — auto-edit OK when relevant to the task:**
- Current Repo Status (mark new features as built, update "Not yet built" list)
- Tab specs (when implementation surfaces a detail worth documenting)
- PARA Data Model tables (when a property type or edit surface changes)
- Additive entries to existing lists: env vars, dependencies, Authoritative Documentation Sources, view libraries

**Tier 2 — must surface in the final report and wait for explicit confirmation in a follow-up prompt:**
- Critical Version Warnings (Notion, Zoho, Google, Anthropic — these protect against silent failures)
- Integration Setup code snippets
- Capability Priority Order
- Deferred Features list
- Workflow Rules
- Start-of-Session Checklist
- UI/Design palette + typography

**Always:**
- Every CLAUDE.md change, Tier 1 or Tier 2, gets explicitly listed in the final summary with a line per change. No silent edits.
- Preserve existing phrasing where not changed. Do not soften warnings, do not "polish" prose, do not consolidate.
- If a change feels like it belongs to Tier 2 but is also genuinely necessary for the task to make sense, do the edit AND surface it prominently in the final report so Markus can review.

## Architecture & Data Flow

Each external system owns one slice of truth. The app never duplicates that truth into its own database.

- **Notion** — source of truth for content. Projects DB, Inbox DB, Areas, Resources, Archives (PARA).
- **Google Calendar** — source of truth for time. All time blocks and events live here.
- **Zoho Books** — source of truth for billing. Read-only from Business Hub (invoices, customers, payments).
- **Supabase** — app-internal state ONLY. Briefing history, time-block suggestion queue, short-lived cached API responses, user settings, audit logs. Never a second source of truth for content, time, or billing.
- **Anthropic API** — decision-making layer. Briefings (Sonnet), classifications (Haiku), suggestions.

### Read/write rules

- Read fresh from the source of truth, or cache for a short, explicit TTL (seconds to minutes, not hours) in Supabase. Cache rows must have an `expires_at` column.
- Writes go back to the source of truth, not to a Supabase mirror. Example: a confirmed time block is written to Google Calendar, not stored as the canonical record in Supabase.
- Supabase rows that reference Notion entities store the Notion ID and timestamp of last sync — never the content itself beyond what is strictly needed for an action queue (e.g., title for display, status for filter).
- Optimistic UI updates are acceptable and encouraged for write-heavy surfaces (Kanban drag-drop, inline edits). Reconcile against the source of truth on success/failure.
- Conflict policy for the solo-user case: last-write-wins. Markus is the only writer; concurrent-edit conflicts are rare and acceptable.
- If a feature seems to need a mirror table, stop and propose the alternative (live fetch, short cache, or webhook-driven sync log) before building it.

## Tab-by-Tab Specification

The hub is organized as 6 tabs. Build them in the order listed in [Capability Priority Order](#capability-priority-order).

### Tab 1: Projects (PARA Projects DB)

A curated view of all Notion Projects, with three view modes Markus toggles between:

- **Table view** — sortable columns (Name, Status, Area, Priority, Due Date, Next Action). Filterable by Status, Area, Priority. Inline edit for Status, Area, Priority, Due Date, and Next Action. Clicking the Name cell opens the detail drawer (Name is edited there, not in the row). Built on TanStack Table.
- **Kanban view** — three columns grouped by Status (Active / On Hold / Done). Drag-and-drop between columns writes the new Status to Notion. Each card shows a Priority indicator (small colored dot + label). Clicking the card body opens the detail drawer; the grip handle remains the drag activator. Built on dnd-kit.
- **Calendar view** — deadline view: projects rendered on their Due Date. Projects without a Due Date appear in a sidebar "no deadline" list. Clicking an event or a sidebar item opens the detail drawer. Drag-to-reschedule is supported: dragging an event to a different day writes the new Due Date to Notion (date-to-date only; no resize, no sidebar-to-calendar). Built on FullCalendar React + the `@fullcalendar/interaction` plugin.

All three views read from the same Notion Projects DB. View toggle is a segmented control in the tab header. Selected view persists in localStorage. The Status/Area/Priority filters live at the tab level and apply to all three views.

**Detail drawer** — clicking a project in any view opens a right-anchored drawer (shadcn `<Sheet>`, 720px) that is the primary detail surface. The top zone is a compact metadata list (icon + narrow label column + value): Name (large editable heading), Status, Area, Priority, Due Date, Next Action, Estimated Minutes, Client, Outcome (read-only), Created. The bottom zone displays the Notion **page body** read-only, fetched live via `notion.blocks.children.list` and rendered through a custom block renderer (no rich-text library). Editing the page body still happens in Notion via the drawer's "Open in Notion" link.

An **"Add Project" button** in the tab header opens a modal (shadcn `<Dialog>`) to create a new project; the new page is written to the Notion Projects DB and appears immediately in the current view (subject to active filters).

### Tab 2: AI Digest

Claude reads Markus's Active Projects, Areas, today's calendar, and open invoices, and produces:

- **Daily digest** — a short briefing: what to focus on today, what's overdue, what to defer. Generated on demand or cached for the day in Supabase `briefings` table.
- **Weekly plan** — a 5-day plan based on current Active projects, deadlines, and estimated minutes. Generated on demand. Markus can regenerate.
- **Time-block suggestions** — proposed Google Calendar blocks for today. Each suggestion has a one-click "Confirm" that writes the event to Google Calendar.

Model usage: Sonnet for digest and weekly plan (reasoning required). Haiku for any classification subtasks. Model IDs imported from `constants/models.js`.

### Tab 3: Calendar

Mirror of Google Calendar with full edit capability:

- Day, week, and month views.
- Create new events (with project assignment via a dropdown of Active projects).
- Edit existing events (time, title, description).
- Delete events with confirmation.
- Time-block suggestions from the AI Digest appear here as "pending" until confirmed.

Built on FullCalendar React (same library as the Projects calendar view — single dependency).

### Tab 4: Clients

A per-client overview, with the client list sourced from Zoho Books contacts (filtered to active customers with at least one invoice in the last 12 months — exact filter TBD when building).

For each client:
- Total turnover (lifetime), current due, overdue invoices — pulled from Zoho.
- Link to their EasyFinance dashboard (external URL — Business Hub does not embed EasyFinance).
- Status of this month's tasks (e.g. Book a Call, Get Transactions, Prepare Call, Call Done) — these are Notion Projects scoped to the client via the Projects DB `Client` property.
- WhatsApp message templates (copy-to-clipboard, not embedded UI).

Read-only on Zoho side. Project status updates write back to Notion.

### Tab 5: Areas (PARA Areas)

Bird's-eye view of ongoing Areas of work (Marketing, Fulfillment, Development, Sales, Accounting, Operations, Content, Personal). Each Area card shows:

- Current milestone (1 line, editable inline)
- Next 1–2 steps (editable inline)
- Count of Active projects in the Area (links to Projects tab filtered by Area)

Source: a new Notion `Areas` DB (or Area metadata on the existing Projects DB — TBD when building). This may require a small Notion schema addition.

### Tab 6: Resources (PARA Resources + Archive)

Read + write access to Notion Resources and Archive databases:

- Browse Resources and Archive items.
- Add new notes (creates a page in Resources with title + body).
- Search across both.

No editing of existing notes inside Business Hub — clicking an existing note opens it in Notion. The "add note" flow is one-way create.

## Tech Stack

Framework:
- **Next.js 16.2.6** (App Router) + **React 19.2.4** + **TypeScript 5**
- **Tailwind CSS 4** (PostCSS plugin `@tailwindcss/postcss`) — Tailwind v4 uses `@import "tailwindcss"` in CSS, not a `tailwind.config.js`
- **shadcn/ui** (`shadcn` ^4.7.0) with the **Nova preset** — built on `radix-ui` ^1.4.3, `lucide-react` ^1.16.0 icons, and Geist fonts. Theme tokens via CSS variables in [app/globals.css](app/globals.css). Base color: neutral.
- Utility libs: `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `next-themes`, `sonner`

View libraries (installed when first used; add new ones the same way):
- **TanStack Table** (`@tanstack/react-table` ^8.21.3) — Projects table view
- **dnd-kit** (`@dnd-kit/core` ^6.3.1, `@dnd-kit/sortable` ^10.0.0) — Projects Kanban drag-and-drop
- **FullCalendar React** (`@fullcalendar/react` + `@fullcalendar/core` + `@fullcalendar/daygrid` + `@fullcalendar/interaction`, all ^6.1.20) — Projects deadline view (+ Tab 3 Calendar mirror). `interaction` plugin is required for drag-to-reschedule.

SDKs:
- `@notionhq/client` ^5.21.0 — PARA reads/writes
- `@anthropic-ai/sdk` ^0.96.0 — decision layer
- `@supabase/supabase-js` ^2.105.4 — app-internal state
- `googleapis` ^171.4.0 — Google Calendar OAuth + events
- `axios` ^1.16.1 — Zoho Books REST calls (no official JS SDK)

Use server components and route handlers for anything that touches a secret. Never expose `NOTION_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ZOHO_*`, or Google client secrets to the client.

## Capability Priority Order

Build in this order. Each tab must be functional (read + the writes specified above) before moving to the next.

1. **Projects** — foundation. Everything else references project data.
2. **AI Digest** — highest leverage. Needs Projects to be working first.
3. **Calendar** — execution surface for time blocks suggested by the AI Digest.
4. **Clients** — self-contained; adds Zoho Books integration.
5. **Areas** — derived view over Projects; cheaper to build after Projects is solid.
6. **Resources** — lowest daily-use surface; defer.

When a session starts and the user asks "what's next", default to whatever is the highest unfinished item in this list.

## Deferred Features

Off-limits until Markus asks for them by name. Do not suggest as "nice to have", do not pre-build scaffolding, do not mention in TODOs.

- Multi-user / client portal — solo app for now.
- Embedded WhatsApp Web UI — fragile, copy-to-clipboard templates only.
- Recurring task engine for invoices — defer.
- Specialized sub-agents per business area — revisit after two weeks of v1 usage.
- Mobile-optimized layouts — desktop-first, mobile is a v2 concern.
- Notification system (email, push, in-app) — Markus checks the hub manually.
- Editing existing Resources/Archive notes inside Business Hub — open in Notion instead.
- Two-way EasyFinance integration — Business Hub and EasyFinance stay separate codebases and separate data. Business Hub only links out to EasyFinance URLs.

## Coding Conventions

### Constants files

Every value below lives in a constants file. Never hardcode a table name, route, model ID, area name, priority, or user-facing string anywhere else in the codebase.

Files are created with `.ts` extension (TypeScript project) when a feature first needs them. Do not pre-scaffold empty placeholder files.

- `constants/tables.ts` — **CREATED.** Every Supabase table name. Currently exports `TABLES.GOOGLE_OAUTH_TOKENS`. Imported by every Supabase query.
- `constants/routes.ts` — **NOT YET CREATED.** Every app route (both internal page paths and external API endpoints).
- `constants/models.ts` — **NOT YET CREATED.** Anthropic model IDs. Model upgrades must be a one-line change here.
- `constants/translations.ts` — **CREATED.** DE/EN i18n strings. Every user-facing string lives here, with both `de` and `en` entries. No exceptions.
- `constants/areas.ts` — **CREATED.** Fulfillment, Accounting, Marketing, Sales, Development, Operations, Content, Personal + `Area` type.
- `constants/priorities.ts` — **CREATED.** High / Medium / Low + `Priority` type; Active / On Hold / Done + `Status` type.

### Supabase

- Always specify the exact columns in `.select()`. **Never** use `select('*')`. Listing columns documents intent and prevents accidental payload bloat.
- Every migration goes in `supabase/migrations/` and gets a corresponding entry in `supabase/migrations/MIGRATION_LOG.md` with: date, what changed, why. No entry, no merge.
- **Never** drop, wipe, or remove a column or table without first listing the data that would be lost and getting explicit confirmation. This is non-negotiable, even for "obviously empty" tables.

### i18n

All UI strings flow through `constants/translations.js`. Each key has both `de` and `en` entries. If a string is added in one language only, that is a bug.

**Default locale: German (`de`).** A small toggle button in the top nav switches between DE and EN. Selected locale persists in localStorage so it survives reloads. The toggle exists primarily so Asher (English-speaking advisor) can read the UI when needed — it is not a multi-language product feature.

Implementation: lightweight. A `useLocale()` hook reading/writing localStorage, a `t(key)` helper that resolves against the current locale, and a `<LocaleToggle />` component in the top nav. No `next-intl` library — overkill for two locales and one user.

### Prompt structure

When Markus writes prompts to Claude Code, he uses XML tags: `<context>`, `<task>`, `<constraints>`, `<do_not>`, `<files>`, `<success_criteria>`. Read all of them before acting. Treat `<do_not>` as hard limits, not suggestions.

### Branch workflow

- Default branch for work: `dev`.
- **Never** push directly to `main`. `main` is updated only via merge from `dev` after Markus has reviewed.
- Feature work can branch off `dev` and merge back into `dev`.

## Workflow Rules

### Push back

Behave like a senior engineer reviewing a peer. If the premise of a request is flawed, say so and propose a better path with reasoning. No yes-man behavior. "That will work, but here is why X is better" is preferred over silent compliance.

### Flag expensive prompts

Before executing a prompt that touches many files, reads large files end-to-end, or has broad scope, name it as expensive and propose a narrower version. Examples: "this will read 40+ files — want me to scope to the briefing module first?", "this prompt rewrites all i18n at once — safer to do it per page".

### Prefer proven libraries

Before writing custom code for a solved problem (date math, OAuth flows, table rendering, drag-and-drop, calendar grids, form validation), check for an established library or the idiomatic shadcn/ui primitive. Recommend it proactively. Custom code is for the parts that are actually unique to Business Hub.

Specifically: do not build a custom table, custom Kanban, or custom calendar grid. Use TanStack Table, dnd-kit, and FullCalendar respectively.

### Performance and cost

Flag unnecessary DB round-trips, slow page loads, and token waste. Specific examples:
- Refetching the same Notion page inside a loop — batch or cache.
- Sending full project bodies to Claude when a title + status is enough — trim.
- Re-running a briefing prompt that has not changed inputs — read from `briefings` table.
- Page body fetched live on drawer open. Future: cache by `pageId + last_edited_time` in Supabase if drawer-open latency becomes noticeable.

When in doubt, propose the cheaper option and let Markus pick.

## Integration Setup

These are reference snippets. No integration code has been written yet. Files will live under `lib/` (e.g. `lib/notion.ts`, `lib/zoho.ts`, `lib/anthropic.ts`, `lib/supabase-server.ts`).

All snippets assume the env vars listed in [Environment Variables](#environment-variables).

### Notion

```ts
import { Client } from "@notionhq/client";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

// 2025-09-03+: queries run against a data_source_id, not a database_id.
// Discover the data source by retrieving the database first — works for both
// single- and multi-source databases (take the first entry for single-source).
async function firstDataSourceId(databaseId: string) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  return (db as any).data_sources[0].id as string;
}

export async function listActiveProjects() {
  const dataSourceId = await firstDataSourceId(process.env.NOTION_PROJECTS_DB_ID!);
  return notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: { property: "Status", select: { equals: "Active" } },
    sorts: [{ property: "Priority", direction: "ascending" }],
  });
}

export async function addToInbox(name: string) {
  return notion.pages.create({
    parent: { database_id: process.env.NOTION_INBOX_DB_ID! },
    properties: {
      Name: { title: [{ text: { content: name } }] },
      Processed: { checkbox: false },
    },
  });
}
```

Gotchas: the integration must be shared with each database in Notion's UI or queries return empty. Database IDs are the 32-char hex without dashes from the database URL.

### Google Calendar

```ts
import { google } from "googleapis";

export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export async function listToday(auth: any) {
  const calendar = google.calendar({ version: "v3", auth });
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return calendar.events.list({
    calendarId: "primary",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
}

export async function createBlock(auth: any, summary: string, start: Date, end: Date) {
  const calendar = google.calendar({ version: "v3", auth });
  return calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });
}
```

Gotchas: refresh tokens are issued only on the first consent with `access_type=offline` and `prompt=consent`. Store the refresh token in Supabase, not in env, once obtained — env-based tokens make multi-device sign-in painful even for a solo user.

### Zoho Books

```ts
import axios from "axios";

const ACCOUNTS = "https://accounts.zoho.com"; // ZOHO_REGION=us
const API = "https://www.zohoapis.com/books/v3";

export async function zohoAccessToken() {
  const { data } = await axios.post(`${ACCOUNTS}/oauth/v2/token`, null, {
    params: {
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    },
  });
  return data.access_token as string;
}

export async function listInvoices() {
  const token = await zohoAccessToken();
  const { data } = await axios.get(`${API}/invoices`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    params: { organization_id: process.env.ZOHO_ORG_ID },
  });
  return data.invoices;
}
```

Gotchas: the access token expires after ~1 hour. Cache it in Supabase with `expires_at` rather than refreshing on every call. The `organization_id` query parameter is required on every request — the v3 docs treat it as a parameter, not a header, so the `X-com-zoho-books-organizationid` header is unnecessary. Region matters: `accounts.zoho.com` and `zohoapis.com` are correct for US; EU uses `.eu` suffixes.

### Anthropic

```ts
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/constants/models";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function briefing(prompt: string) {
  return anthropic.messages.create({
    model: MODELS.BRIEFING, // claude-sonnet-4-6 — daily briefing, reasoning
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });
}

export async function classify(text: string) {
  return anthropic.messages.create({
    model: MODELS.CLASSIFY, // claude-haiku-4-5-20251001 — fast, cheap
    max_tokens: 256,
    messages: [{ role: "user", content: text }],
  });
}
```

Gotchas: model IDs change. They live in `constants/models.js` so an upgrade is a one-line edit. Use Sonnet for briefings and anything that needs judgment; use Haiku for classification, routing, and short structured outputs.

### Supabase (server)

```ts
import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// Example query — note explicit column list, never select('*').
export async function recentBriefings() {
  const db = supabaseServer();
  return db
    .from("briefings")
    .select("id, created_at, summary, model")
    .order("created_at", { ascending: false })
    .limit(7);
}
```

Gotchas: the service role key bypasses RLS — only use it in server code (route handlers, server components, server actions). The anon key is fine to expose to the client but is not used much in this app since there is no end-user-facing auth.

## Environment Variables

Stored in `.env.local`. Never commit. The example file `.env.local.example` lists the keys without values.

```
# Notion — PARA vault
NOTION_TOKEN=                 # internal integration token, shared with each DB
NOTION_PROJECTS_DB_ID=        # 32-char hex of the Projects database
NOTION_INBOX_DB_ID=           # 32-char hex of the Inbox database
NOTION_AREAS_DB_ID=           # 32-char hex of the Areas database (added when Tab 5 builds)
NOTION_RESOURCES_DB_ID=       # 32-char hex of the Resources database (added when Tab 6 builds)

# Google Calendar — OAuth2 web app credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=          # e.g. http://localhost:3000/api/auth/callback/google

# Zoho Books — self-service refresh-token flow
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=
ZOHO_REFRESH_TOKEN=
ZOHO_ORG_ID=                  # numeric Zoho Books organization ID
ZOHO_REGION=us                # us | eu | in | au — controls accounts.* domain

# Supabase — app-internal state
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server-only, bypasses RLS

# Anthropic — decision layer
ANTHROPIC_API_KEY=
```

## PARA Data Model in Notion

Notion is the source of truth. These property names are exact and case-sensitive — the Notion API will silently return empty results if a property name is misspelled.

### Projects DB

| Property | Type | Notes | Edited from Business Hub? |
| --- | --- | --- | --- |
| Name | title | Project name | Yes — drawer (opens from any view) |
| Status | status | `Active` / `On Hold` / `Done` — Notion `status` type (not `select`), uses `status: { equals: ... }` filter shape | Yes — Table inline, Kanban drag-drop, drawer |
| Area | select | One of the values in `constants/areas.js` | Yes — Table inline, drawer |
| Priority | select | `High` / `Medium` / `Low` | Yes — Table inline, drawer |
| Outcome | rich_text | One-line definition of done | Read-only display in drawer; edit body in Notion |
| Next Action | rich_text | The very next physical action | Yes — Table inline, drawer |
| Due Date | date | Optional | Yes — Table inline, drawer |
| Estimated Minutes | number | Used by the time-block planner | No (display only in drawer) |
| Client | rich_text | Optional, free text — links project to Zoho client | No (display only in drawer) |
| Created | (page metadata) | Read from `page.created_time` on the Notion page object, not a DB property | n/a |

### Inbox DB

| Property | Type | Notes |
| --- | --- | --- |
| Name | title | Raw capture text |
| Captured At | created_time | Auto |
| Type | select | `Task` / `Idea` / `Reference` / `Someday` — set by Claude during classification |
| Routed To | rich_text | Target Area / Project / Resource — set by Claude |
| Processed | checkbox | Defaults false; Markus flips to true after review |

### Areas DB (created when Tab 5 builds)

To be defined when Tab 5 is built. Likely properties: Name (title), Current Milestone (rich_text), Next Steps (rich_text), Status (select: Active / Paused).

### Resources DB (created when Tab 6 builds)

Existing in Notion already. Schema TBD when Tab 6 is built.

If a new property is needed, it gets added in Notion first, then mirrored in the relevant constants file, then used in code. Never invent a property in code that does not exist in Notion.

## UI / Design

Stack: Tailwind v4 + shadcn/ui (Nova preset, base color `neutral`, icons `lucide`). No design system rewrites. shadcn components are copied in via the CLI and customized in place.

Aesthetic: refined-minimal SaaS, not maximalist. Generous whitespace, single accent color, no decorative gradients, no glassmorphism.

Colors: the shadcn theme tokens in [app/globals.css](app/globals.css) are the source of truth. Reference colors through CSS variables (`var(--primary)`, `var(--background)`, etc.) or Tailwind utilities that map to them (`bg-primary`, `text-foreground`). Do not hardcode hex values in components.

Intended palette direction (apply by tuning the CSS variables, not by hardcoding):
- Primary blue: ~`#2f6fe5`
- Ink (text, dark surfaces): ~`#0a1733`
- Light background: ~`#fafbfd`
- Borders / muted: low-saturation neutrals derived from the above

Typography (installed by the Nova preset):
- Sans (body + headings): **Geist Sans** — exposed via `--font-sans`
- Mono (code, timestamps, numerics): **Geist Mono** — exposed via `--font-geist-mono`

Icons: **lucide-react**. This is the project's icon library — use it instead of inline SVGs or other icon packs.

Load fonts via `next/font` so they are self-hosted and preloaded. Avoid Google Fonts CDN links at runtime.

### Layout

- Top nav: app title, tab switcher (6 tabs), locale toggle (DE/EN), user avatar (placeholder — solo app).
- Tab content fills the rest of the viewport. No left sidebar (would compete with the tab nav).
- Desktop-first. Min viewport: 1280px wide. Mobile is a v2 concern.

## Authoritative Documentation Sources

> Before writing or modifying code that calls Notion, Google Calendar, Zoho Books, or the Anthropic API, fetch the relevant documentation URL first using WebFetch. Do not rely on training data for API shapes, endpoint names, parameter names, or SDK method signatures. These APIs evolve faster than training data — assume memory is outdated. If WebFetch is unavailable, ask the user to paste the relevant doc snippet before proceeding.

### Critical Version Warnings

These are the silent-failure traps. Read them before touching the matching integration.

- **Notion API uses version 2025-09-03 or later.** Queries now use `data_source_id`, NOT `database_id`. The `@notionhq/client` SDK defaults to `2025-09-03`. If you generate code using `databases.query()` with a database ID directly, it will fail when databases have multiple data sources. Use `dataSources.query()` instead. Read the upgrade guide before writing any Notion query code.
- **Zoho Books account is on .com (US data center).** Base URL: `https://www.zohoapis.com/books/v3`. Accounts URL: `https://accounts.zoho.com`. NEVER use `.eu`, `.in`, or other regional domains.
- **Zoho Books requires `organization_id` on every request.** The org ID is `884932949`. Omitting it returns "Organization not found" regardless of token validity. This is the single most common silent failure.
- **Zoho access tokens expire in 1 hour.** Refresh tokens are permanent. Cache the access token in Supabase (or memory), refresh ~5 min before expiry. Max 10 access token generations per refresh token per 10 minutes — cache aggressively.
- **Zoho rate limit:** 100 req/min/org, 1000 req/day on free plan. HTTP 429 on breach with no Retry-After header. Implement exponential backoff.
- **Google Calendar API: v3.** Do not use older versions.
- **Anthropic SDK:** always import model name from `constants/models.js`. Never hardcode model strings — model versions change.

### Claude Code & Anthropic

- Claude Code best practices: https://code.claude.com/docs/en/best-practices
- Claude Code in large codebases: https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start
- Claude Code memory + CLAUDE.md: https://code.claude.com/docs/en/memory
- Anthropic prompt engineering: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Anthropic API messages reference: https://docs.claude.com/en/api/messages
- Anthropic TypeScript SDK: https://github.com/anthropics/anthropic-sdk-typescript
- Anthropic models + pricing: https://docs.claude.com/en/docs/about-claude/models

### Notion API

- Reference home: https://developers.notion.com/reference/intro
- Getting started: https://developers.notion.com/docs/getting-started
- Upgrade guide 2025-09-03 (data sources — READ FIRST): https://developers.notion.com/docs/upgrade-guide-2025-09-03
- Upgrade guide 2026-03-11 (latest): https://developers.notion.com/docs/upgrade-guide-2026-03-11
- JS SDK repo: https://github.com/makenotion/notion-sdk-js
- Retrieve a block's children (page body fetch): https://developers.notion.com/reference/retrieve-a-block-children
- Full doc index for fetching: https://developers.notion.com/llms.txt

### Google Calendar API (v3)

- API reference: https://developers.google.com/workspace/calendar/api/v3/reference
- Events resource: https://developers.google.com/workspace/calendar/api/v3/reference/events
- Events.insert: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Events.list: https://developers.google.com/workspace/calendar/api/v3/reference/events/list
- Freebusy.query (for finding free slots): https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- OAuth 2.0 web server flow: https://developers.google.com/identity/protocols/oauth2/web-server
- Node.js client (googleapis): https://github.com/googleapis/google-api-nodejs-client

### Zoho Books API (v3)

- Introduction: https://www.zoho.com/books/api/v3/introduction/
- OAuth flow: https://www.zoho.com/books/api/v3/oauth/
- Invoices endpoints: https://www.zoho.com/books/api/v3/invoices/
- Contacts endpoints: https://www.zoho.com/books/api/v3/contacts/
- Organizations endpoint: https://www.zoho.com/books/api/v3/organizations/

### Supabase

- JS client reference: https://supabase.com/docs/reference/javascript/introduction
- Next.js server-side auth: https://supabase.com/docs/guides/auth/server-side/nextjs
- CLI + migrations: https://supabase.com/docs/guides/cli
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security

### View libraries (added when relevant tab is built)

- TanStack Table: https://tanstack.com/table/latest/docs/introduction
- dnd-kit: https://docs.dndkit.com/
- FullCalendar React: https://fullcalendar.io/docs/react

### Stack (Next.js + shadcn/ui)

- Next.js docs: https://nextjs.org/docs
- Next.js App Router: https://nextjs.org/docs/app
- shadcn/ui: https://ui.shadcn.com/docs
- Tailwind: https://tailwindcss.com/docs

### Other (likely needed later)

- WhatsApp wa.me deep linking (no API, URL params only): https://faq.whatsapp.com/5913398998301
- GitHub REST API: https://docs.github.com/en/rest

### When to Fetch

> Fetch when: writing a new integration call, debugging an unexpected API error, generating example code with method names, or upgrading a library. Do NOT fetch for: trivial parameter tweaks where the signature is already verified, refactoring local code with no API surface change, styling, or generic Next.js/Tailwind patterns.

## Current Repo Status

Snapshot of what actually exists in the repo. Treat this as the single source of truth for "where are we right now" — update it as state changes.

**Bootstrap date:** 2026-05-15

**Stack & scaffold:**
- Next.js 16.2.6 (App Router) + React 19.2.4 + TypeScript 5 + Tailwind v4 (PostCSS plugin, no `tailwind.config.js`).
- shadcn/ui with the **Nova preset** (`style: "radix-nova"`, `baseColor: "neutral"`, `iconLibrary: "lucide"`). Components in [components/ui/](components/ui/): `badge`, `button`, `card`, `dialog`, `input`, `select`, `separator`, `sheet`, `sonner`, `tabs`.
- Fonts: Geist Sans + Geist Mono via `next/font/google` (variables `--font-geist-sans` / `--font-geist-mono`, aliased to `--font-sans` / `--font-mono` in [app/globals.css](app/globals.css) `:root` so Tailwind v4's default `--font-sans: var(--font-sans)` self-reference is bypassed).
- Palette (blue/white/ink) tuned in [app/globals.css](app/globals.css) via OKLCH tokens on `:root`. Dark mode block exists but no `next-themes` provider mounted — light only at runtime.

**Dependencies installed:**
- SDKs: `@notionhq/client` ^5.21.0, `@anthropic-ai/sdk` ^0.96.0, `@supabase/supabase-js` ^2.105.4, `googleapis` ^171.4.0, `axios` ^1.16.1.
- View libs: `@tanstack/react-table` ^8.21.3, `@dnd-kit/core` ^6.3.1, `@dnd-kit/sortable` ^10.0.0, `@fullcalendar/{react,core,daygrid,interaction}` all ^6.1.20.
- Utility libs: `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `next-themes` (only used by `components/ui/sonner.tsx`; no `ThemeProvider`), `sonner`, `radix-ui`, `lucide-react` ^1.16.0.

**Secrets & external systems:**
- `.env.local` populated with Notion, Google, Zoho, Supabase, Anthropic secrets (not committed).
- PARA structure in Notion with Projects + Inbox databases (IDs in `.env.local`).
- Supabase project provisioned; `supabase/migrations/` directory exists with first migration (`20260515120000_google_oauth_tokens.sql`) and `MIGRATION_LOG.md`. **Migration must be run manually by Markus** (Supabase Dashboard SQL editor or `supabase db push`).

**App layout & i18n:**
- Top nav with 6-tab switcher (`Projects`/`Digest`/`Calendar`/`Clients`/`Areas`/`Resources`) + DE/EN `LocaleToggle` (DE default, persisted as `bh.locale` in localStorage) + Google "Connect" affordance (visible only when not connected).
- All UI strings in [constants/translations.ts](constants/translations.ts).

**Library files (server-only marked with `import "server-only"`):**
- [lib/notion.ts](lib/notion.ts) — `listActiveProjects`, `updateProjectField` (6 fields: Status, Priority, Name, Area, Due Date, Next Action), `createProject`, `getPageBlocks` (one-level child recursion). Exports `Project`, `ProjectDraft`, `UpdateField`, `NotionBlock`, `NotionRichText`, `NotionAnnotations` types.
- [lib/supabase-server.ts](lib/supabase-server.ts) — `supabaseServer()` factory using service role key.
- [lib/google.ts](lib/google.ts) — `getOAuthClient`, `getAuthUrl`, `exchangeCodeForTokens`, `getAccessToken` (auto-refresh within 5 min of expiry), `getAuthorizedCalendarClient`, `isGoogleConnected`, `disconnectGoogle`. Tokens persisted to `google_oauth_tokens` (`user_key='markus'`).
- [lib/i18n.tsx](lib/i18n.tsx) — `LocaleProvider`, `useLocale`, `useT`, `t` helper.

**Route handlers (all server, never return tokens to client):**
- `/api/projects/update`, `/api/projects/create`, `/api/projects/blocks` — Notion updates / page creation / page-body fetch.
- `/api/google/connect` — 302 to Google consent URL (scope: `auth/calendar`, `access_type=offline`, `prompt=consent`).
- `/api/auth/callback/google` — OAuth callback; exchanges code, persists tokens, redirects to `/settings/google-connected` (or `/settings/google-error?reason=…`).
- `/api/google/status` — `{ connected: boolean }`. Returns `false` if the table doesn't exist yet (pre-migration safety).

**Pages:**
- `/` redirects to `/projects`.
- `/projects` — Tab 1, fully built (see below).
- `/digest`, `/calendar`, `/clients`, `/areas`, `/resources` — placeholder "coming soon" pages.
- `/settings/google-connected`, `/settings/google-error` — OAuth flow landings.

**Tab 1 (Projects) — complete:**
- Three view modes — Table (TanStack), Kanban (dnd-kit, grouped by Status, drag-drop writes Status; Priority shown as pill), Calendar (FullCalendar `dayGridMonth` + `interaction` plugin, drag-to-reschedule writes Due Date).
- View toggle top-left, persisted in `bh.projects.view` localStorage.
- Status / Area / Priority filters at tab level — apply to all three views.
- Inline edit in Table for Status, Area, Priority, Due Date, Next Action; Name edit happens in drawer.
- Detail drawer (shadcn Sheet, 720px): compact metadata zone with editable Name heading + 9 metadata rows; read-only Notion page body rendered by [app/projects/_components/PageBodyRenderer.tsx](app/projects/_components/PageBodyRenderer.tsx) (paragraph, heading_1/2/3, bulleted/numbered list with one-level children, to_do, quote, callout, code, divider, toggle; bold/italic/strikethrough/code/link rich-text; loading/empty/error states).
- Add Project dialog (shadcn Dialog) — Name + Area required validation; defaults: Status=Active, Priority=Medium.
- Optimistic UI on all writes with sonner toast + revert on failure.

**Google OAuth — scaffolded, not yet exercised:**
- Code path works end-to-end on paper. Awaiting (a) Markus running the migration, (b) Markus clicking "Connect Google" in the top nav once to grant consent.
- After that, `getAccessToken()` / `getAuthorizedCalendarClient()` are ready for Tab 2 and Tab 3.

**Not yet built:**
- Tabs 2–6 (AI Digest, Calendar mirror, Clients, Areas, Resources) — placeholders only.
- `constants/routes.ts`, `constants/models.ts` (created when first feature needs them).
- Integration libs: `lib/anthropic.ts`, `lib/zoho.ts`.
- Supabase tables beyond `google_oauth_tokens` (and that table only after Markus runs the migration).
- Any agents or sub-agents.
- Notion Areas and Resources DBs (added when Tabs 5 and 6 build).
- RLS on `google_oauth_tokens` (currently relying on service-role-only access).

**Next planned step:** Tab 2 — AI Digest. Will create `constants/models.ts` + `lib/anthropic.ts` and the `briefings` Supabase table (second migration).

## Start-of-Session Checklist

Run this every session before touching code:

1. Read this CLAUDE.md in full.
2. Check the current branch. It should be `dev`. If it is `main`, switch before making changes.
3. Confirm where the requested work sits in the [Capability Priority Order](#capability-priority-order). If it does not appear there, ask before building.
4. If the task looks large or expensive (many files, broad rewrites, full-codebase reads), propose a narrower scope first and wait for confirmation.
5. Check `supabase/migrations/MIGRATION_LOG.md` if the task touches the database.
