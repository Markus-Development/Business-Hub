# Business Hub

Internal Next.js application that acts as Markus's primary operating dashboard — a full hub on top of Notion, Google Calendar, and Zoho Books. Read this file in full at the start of every session.

## Cowork Session Rules

These rules govern how Claude behaves inside Cowork mode. They apply in addition to all other constraints in this file. Read this section first, every session, before reading anything else.

### Role
Claude in Cowork is a senior engineering advisor and prompt author. It does not write, edit, or delete files. All implementation is done by Claude Code in the terminal. Cowork's job is to produce the prompt for Claude Code to execute — and to review what Claude Code returns before the next step.

### Output format
- Always produce a Claude Code prompt. Never produce code, diffs, or inline solutions.
- Use the XML structure for every prompt: `<context>`, `<task>`, `<files>`, `<do_not>`, `<success_criteria>`.
- Follow Anthropic's Claude Code prompting best practices: clear context, explicit constraints, step-by-step reasoning, positive and negative examples where helpful.
- Keep responses concise. No verbose explanations, no bullet-pointed post-ambles after delivering the prompt.

### Diagnosis before fix
- Never assume a root cause. State what evidence supports the diagnosis.
- If the root cause is uncertain, the prompt must include a diagnosis step before a fix step.
- Read screenshots and Claude Code output carefully before forming any opinion.
- When wrong, acknowledge it in one sentence and correct course. Do not over-explain.

### Review and approval flow
- After producing a prompt, stop and wait for Markus to run it and return the output.
- When Claude Code output comes back, summarize what was actually done, flag anything that looks wrong or incomplete, then confirm whether to proceed.
- Never chain prompts without Markus approving the previous result first.
- When audit findings come back, organize by severity, recommend an order of attack, and wait for Markus to choose.

### Scope discipline
- Always specify exact files in `<files>`. Never leave scope open-ended.
- Flag scope creep before it happens. If a fix touches something outside the stated scope, surface it rather than silently including it.
- Never suggest, hint at, scaffold, or mention deferred features listed in this file.

### API and documentation
- For any prompt touching Notion, Google Calendar, Zoho, or Anthropic: cite the relevant doc URL from Authoritative Documentation Sources or instruct Claude Code to fetch it before writing code.
- Never rely on training-data memory for API shapes. These APIs evolve faster than training data.

### CLAUDE.md integrity
- Any prompt that would cause Claude Code to edit CLAUDE.md must state whether it is Tier 1 (auto-ok) or Tier 2 (surface for confirmation) per the existing edit policy.
- After a session that changes CLAUDE.md, list exactly what changed — no silent edits.

### Codebase conventions (enforce in every prompt)
- All work on `dev` branch — include as a `<do_not>` whenever relevant.
- No hardcoded table names, route strings, model IDs, or user-facing strings — use constants files.
- Every new i18n string requires both `de` and `en` entries. One language only is a bug.
- `npm run build` must pass — include as a success criterion on every prompt that touches code.
- Any prompt adding a data-fetching `useEffect` must explicitly reference the infinite-loop guard pattern in Standard Prompt Constraints.

### Push back
- If the premise of a request is flawed, say so before writing the prompt. Propose a better path with reasoning.
- If a prompt would be expensive (many files, broad rewrites), name it and propose a narrower scope first.
- Do not write prompts that silently comply with a flawed approach.

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
- Use existing constants files (`constants/tables.ts`, `constants/models.ts`, `constants/translations.ts`, `constants/areas.ts`, `constants/priorities.ts`, `constants/routes.ts`, `constants/client-tasks.ts`). Create them if missing. Never hardcode table names, model IDs, route paths, areas, priorities, monthly task names, or user-facing strings inline.
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
- **Prevent `useEffect` infinite loops on data-fetching components.** Every `useEffect` that fetches remote data and writes to state must follow this pattern:
  - Dependency array contains only primitive values (strings, numbers, booleans) — never objects, arrays, or functions. Derive a string ID from the selected entity and depend on that.
  - The loading guard must short-circuit on the existence of *any* entry for that ID (including the loading state), not on the presence of loaded data. Use `if (cache[id]) return;` — never `if (cache[id]?.data) return;`. The narrower guard re-fires while the request is in flight and produces an infinite loop.
  - If a callback (e.g. `loadDetail`) is in the dep array and is stable (`useCallback` with empty or stable deps), remove it from the effect's deps and add an `eslint-disable-next-line react-hooks/exhaustive-deps` comment explaining why. An unstable callback in deps causes the same loop as an object reference.
  - After a write that mutates the cache entry (optimistic update, post-write refresh), call the fetch function directly rather than triggering it via a state change that re-runs the effect.
- **Never call an API route from inside render, or from a `useEffect` with an unstable dep.** Before writing any `useEffect` that calls an API route, explicitly write out the dep array and verify every entry is a primitive. Flag any object or function dep as a likely loop before proceeding.
- **Rate-limit awareness for Notion.** Notion's API has aggressive rate limits. Never trigger Notion calls inside a loop, a polling interval, or a rapidly-firing effect. If a component mounts and immediately needs multiple Notion fetches, batch them with `Promise.all` — never serial `await`s in a loop. Log a warning (not an error) when a `rate_limited` response is received and surface a user-facing toast rather than silently retrying.

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

Master-detail view that merges Zoho Books contacts with the Notion Clients DB on `Zoho Contact ID`.

**List source:** active Zoho customers (`contact_type=customer&status=active`) cross-referenced with invoices in the last 12 months — only contacts with at least one invoice in that window are shown. A Zoho contact with no Notion record is still shown (metadata fields display as `—` and read "No Notion record linked"); a Notion record with no matching Zoho `contact_id` is excluded.

**Master list (320px fixed):** name + outstanding amount + health pill (green = no overdue, amber = outstanding > 0, red = at least one overdue invoice) + monthly-task progress badge (`{done}/4`, shows `–` until the detail for that client has been loaded). Sort: Overdue first (default), Outstanding (highest first), Name A–Z. Health badge red/amber is detail-aware, so a row's pill upgrades from amber to red after that client's detail is fetched.

**Summary bar (above both panels):** total clients, total outstanding (sum across all clients), total overdue (sum across loaded details only — under-states until all clients have been opened, never over-states).

**Detail panel sections:**
1. **Header** — name, Zoho email, Open Dashboard button (if `Dashboard Link` set), Open in Notion button (if Notion record linked).
2. **Financial summary** — Lifetime Turnover (from Zoho all-invoice sum, cached 10 min per contact), Outstanding (from Zoho `outstanding_receivable_amount`), Overdue (sum of overdue invoice balances). Below that: open invoices table (Invoice #, Date, Due Date, Amount, Status). Max 10 rows; "View all in Zoho" links to the Zoho Books invoices list.
3. **Monthly tasks** — checklist of the four `MONTHLY_TASK_NAMES` rows. Each row shows the project's Status badge (Active / On Hold / Done) or "Not created" if no project for that name exists this month. Clicking the badge cycles Active ↔ Done (optimistic, writes via existing `/api/projects/update`). When not all four exist, a "Generate tasks" button creates the missing ones in the Projects DB with `Status=Active`, `Area=Fulfillment`, `Priority=Medium`, `Due Date=last calendar day of current month`; 409 `tasks_exist` swaps the button for an "already generated this month" muted line.
4. **WhatsApp templates** — four templates (one per task stage), interpolated with `{name}` and `{amount}` (formatted Euro, no symbol — template includes €). Copy button writes plain text to the clipboard; Open WhatsApp button is a `wa.me/<digits>` deep link, only shown when the Zoho contact has a phone number that normalises to ≥7 digits.
5. **Client metadata** — six editable fields (Industry select, Employees number, Monthly Revenue number with € formatter, three URL fields). Inline edit per field with Save/Cancel; PATCH writes optimistically to Notion via `/api/clients/[zohoId]/notion` with revert + toast on failure. The route re-resolves the Notion pageId from the Zoho contact ID server-side rather than trusting a client-supplied id.
6. **Notes** — read-only `<PageBodyRenderer />` (same component as the Projects detail drawer) over the Notion page body. "Edit in Notion" link below. Both sections show "No Notion record linked" when there is no Notion record for the contact.

Zoho is read-only from Business Hub (no writes). Notion writes are limited to (a) the six metadata fields, (b) creating monthly task projects, (c) cycling task status on existing projects.

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

- `constants/tables.ts` — **CREATED.** Every Supabase table name. Exports `TABLES.GOOGLE_OAUTH_TOKENS`, `TABLES.BRIEFINGS`, `TABLES.TIME_BLOCK_SUGGESTIONS`, `TABLES.USER_SETTINGS`. Imported by every Supabase query.
- `constants/routes.ts` — **CREATED.** `ROUTES.pages.*` for every internal page path (home/projects/digest/calendar/clients/areas/resources/profile/googleConnected/googleError) and `ROUTES.api.*` for every API endpoint (projects, digest, calendar, clients, google, profile). Parameterized endpoints (`projects.blocks(pageId)`, `digest.timeblockConfirm(id)`, `digest.timeblockDismiss(id)`, `calendar.event(id)`, `clients.detail(zohoId)`, `clients.generateTasks(zohoId)`, `clients.notionPatch(zohoId)`) are functions that encode the id. Imported wherever a route string was previously hardcoded.
- `constants/models.ts` — **CREATED.** Anthropic model IDs (`MODELS.BRIEFING` = `claude-sonnet-4-6`, `MODELS.CLASSIFY` = `claude-haiku-4-5-20251001`) + `ModelKey` / `ModelId` types. Model upgrades are a one-line change here.
- `constants/translations.ts` — **CREATED.** DE/EN i18n strings. Every user-facing string lives here, with both `de` and `en` entries. No exceptions.
- `constants/areas.ts` — **CREATED.** Fulfillment, Accounting, Marketing, Sales, Development, Operations, Content, Personal + `Area` type.
- `constants/priorities.ts` — **CREATED.** High / Medium / Low + `Priority` type; Active / On Hold / Done + `Status` type. Also exports `NOTION_COLOUR_MAP` (the 10 Notion option-colour names → CSS values) and `notionColour(name)` helper used by the Projects table to paint Status/Area badges with the colour that Notion stores on each option.
- `constants/user.ts` — **CREATED.** Solo-user identity (`USER.EMAIL`, `USER.INITIALS`, `USER.NAME`). Display only — never used for auth.
- `constants/client-tasks.ts` — **CREATED.** `MONTHLY_TASK_NAMES = ['Book a Call', 'Get Transactions', 'Prepare Call', 'Call Done']` + `MonthlyTaskName` type. Drives the per-client monthly task checklist, the generate-tasks idempotency check, and the WhatsApp template keys.

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
NOTION_CLIENTS_DB_ID=         # 32-char hex of the Clients database (required for Tab 4)
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

### Clients DB

Created manually by Markus in Notion (the integration does not create databases). The integration must be shared with the DB. `NOTION_CLIENTS_DB_ID` must point at the database (32-char hex from the database URL). For each client record, paste the Zoho `contact_id` into the **Zoho Contact ID** rich_text field — that field is the join key with the Zoho contact returned by `listActiveContacts()`. Without it, the row will not appear on the Clients tab.

| Property | Type | Notes | Edited from Business Hub? |
| --- | --- | --- | --- |
| Name | title | Client display name | No (edit in Notion) |
| Zoho Contact ID | rich_text | Paste Zoho `contact_id` here — join key with Zoho data | No (edit in Notion) |
| Industry | select | `E-Commerce` / `SaaS` / `Agency` / `Retail` / `Hospitality` / `Other` (see `INDUSTRIES` in [app/clients/_components/types.ts](app/clients/_components/types.ts)) | Yes — metadata grid |
| Employees | number | Headcount | Yes — metadata grid |
| Monthly Revenue | number | Client's own monthly revenue (€), for segmentation | Yes — metadata grid |
| Call Notes Link | url | Link to most-recent call notes (Notion page, Google Doc, etc.) | Yes — metadata grid |
| Client Database Link | url | Link to their shared workspace or folder | Yes — metadata grid |
| Dashboard Link | url | EasyFinance or other dashboard URL | Yes — metadata grid |

Page body = free-form notes (same block types as Projects). Rendered read-only via `<PageBodyRenderer />` in BH; edits happen in Notion.

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
- View libs: `@tanstack/react-table` ^8.21.3, `@dnd-kit/core` ^6.3.1, `@dnd-kit/sortable` ^10.0.0, `@fullcalendar/{react,core,daygrid,timegrid,interaction}` all ^6.1.20.
- Utility libs: `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `next-themes` (only used by `components/ui/sonner.tsx`; no `ThemeProvider`), `sonner`, `radix-ui`, `lucide-react` ^1.16.0, `react-markdown` ^10.1.0 (renders the daily-briefing markdown on `/digest`).

**Secrets & external systems:**
- `.env.local` populated with Notion, Google, Zoho, Supabase, Anthropic secrets (not committed).
- PARA structure in Notion with Projects + Inbox databases (IDs in `.env.local`).
- Supabase project provisioned; `supabase/migrations/` directory exists with five migrations (`20260515120000_google_oauth_tokens.sql`, `20260516120000_briefings.sql`, `20260517120000_briefings_append_only.sql`, `20260518120000_time_block_suggestions.sql`, `20260519120000_user_settings.sql`) and `MIGRATION_LOG.md`. Tables in Supabase: `google_oauth_tokens`; `briefings` (date, kind 'daily'|'weekly', summary, model, input_hash, expires_at; append-only history, latest row per (date, kind) is the current briefing; lookup index on (date, kind, created_at desc)); `time_block_suggestions` (date, project_name, start_at, end_at, rationale, status 'pending'|'confirmed'|'dismissed', google_event_id, batch_id; append-only history, UI surfaces today's pending rows ordered by start_at; lookup index on (date, status, created_at desc)); `user_settings` (user_key pk, timezone default 'Asia/Dubai', master_calendar_id nullable, task_type_windows jsonb default '[]', updated_at; seeded with one row `user_key='markus'` via ON CONFLICT DO NOTHING). **Migrations must be run manually by Markus** (Supabase Dashboard SQL editor or `supabase db push`).

**App layout & i18n:**
- Top nav with 6-tab switcher (`Projects`/`Digest`/`Calendar`/`Clients`/`Areas`/`Resources`) + DE/EN `LocaleToggle` (DE default, persisted as `bh.locale` in localStorage) + Google "Connect" affordance (visible only when not connected) + avatar that links to `/profile`. The top nav listens for the `bh:google-status-changed` window event so the Connect button reappears immediately after a disconnect from `/profile` without a reload.
- Solo-user identity (email / initials / display name) lives in [constants/user.ts](constants/user.ts) — display only, never used for auth.
- All UI strings in [constants/translations.ts](constants/translations.ts).

**Library files (server-only marked with `import "server-only"`):**
- [lib/notion.ts](lib/notion.ts) — `listActiveProjects`, `updateProjectField` (6 fields: Status, Priority, Name, Area, Due Date, Next Action), `createProject`, `createClientProject` (Projects-DB create with explicit `Client` rich_text — used by `/api/clients/[zohoId]/generate-tasks`), `listProjectsByClient(clientName)` (Projects DB filtered by `Client` rich_text contains), `getPageBlocks` (one-level child recursion), `pingNotion` (health check via `users.me()`), `fetchSelectOptions(propertyName)` (reads the Projects data source schema via `notion.dataSources.retrieve` and returns the options of a `select` OR `status` property, each option carrying its `color` — returns `null` when the property is missing or of another type), `listNotionClients` (reads the Clients DB via its own cached `data_source_id` — fails loudly when `NOTION_CLIENTS_DB_ID` is unset), `getClientPageBlocks(pageId)` (thin alias over `getPageBlocks`), `updateClientField(pageId, field, value)` (6 client fields: Industry select, Employees + Monthly Revenue numbers, three URL fields). Exports `Project`, `ProjectDraft`, `UpdateField`, `NotionBlock`, `NotionRichText`, `NotionAnnotations`, `SelectOption`, `NotionClient`, `ClientUpdateField` types. The `notion` Client instance is now module-private — all callers go through the exported helpers above.
- [lib/zoho.ts](lib/zoho.ts) — Zoho Books v3 client. Module-private `getZohoAccessToken()` refreshes via `accounts.zoho.com/oauth/v2/token` (refresh-token grant) and caches the access token in a module-level `{ token, expiresAt }` with a 5-min refresh buffer. `listActiveContacts()` cross-references active customers with invoices in the last 12 months (returns the intersection — see Tab 4 spec). `getContactInvoices(contactId)` fans out across `unpaid` / `overdue` / `partially_paid` statuses (Zoho's `status` filter accepts a single value), dedupes by `invoice_id`, and sorts most-recent first. `getContactLifetimeTurnover(contactId)` sums `total` across all invoices for the contact, cached 10 min per contact. `pingZoho()` hits `/organizations` (validates both token + `organization_id`). All calls pass `organization_id` via `ZOHO_ORG_ID` env (CLAUDE.md Critical Version Warnings). US data center only (`accounts.zoho.com` / `zohoapis.com`). Exports `ZohoContact`, `ZohoInvoice` types.
- [lib/supabase-server.ts](lib/supabase-server.ts) — `supabaseServer()` factory using service role key.
- [lib/google.ts](lib/google.ts) — Module-private `getOAuthClient` (used only inside this file); exported `getAuthUrl`, `exchangeCodeForTokens`, `getAccessToken` (auto-refresh within 5 min of expiry), `getAuthorizedCalendarClient`, `listCalendars` (calendarList.list → `{ id, summary, primary }[]`), `getPrimaryBusy(timeMin, timeMax, calendarId?)` (freebusy.query against the given calendar, default `'primary'`, returns `BusyInterval[]`), `createBlock(summary, startIso, endIso, calendarId?)` (inserts an event into the given calendar, default `'primary'`, returns `{ id, htmlLink }`), `listEvents(calendarId, start, end)` (events.list with `singleEvents:true` + `orderBy:'startTime'`, returns `CalendarEvent[]` with id/summary/description/start/end/htmlLink/colorId), `createEvent(calendarId, payload)` (events.insert; stores `notionProjectId` in `extendedProperties.private` when provided, returns `{ id, htmlLink }`), `updateEvent(calendarId, eventId, patch)` (events.patch with summary/description/start/end), `deleteEvent(calendarId, eventId)` (events.delete, void), `isGoogleConnected`, `disconnectGoogle`. Tokens persisted to `google_oauth_tokens` (`user_key='markus'`).
- [lib/anthropic.ts](lib/anthropic.ts) — Module-private `anthropic` client + exported `briefing(prompt, system?)` (Sonnet, max_tokens 2048) + `pingAnthropic()` (1-token Haiku call for health check; caller must cache — see `/api/profile/status`) + `extractText(response)` (unwraps an Anthropic `messages.create` response into trimmed plain text by concatenating every text-typed content block — shared by both digest routes). Model IDs read from [constants/models.ts](constants/models.ts).
- [lib/settings.ts](lib/settings.ts) — `getUserSettings()` returns the 'markus' row with safe defaults (Asia/Dubai TZ, no master calendar, empty windows) when row or table is missing. `updateUserSettings(patch)` validates timezone via `Intl.supportedValuesOf('timeZone')` (with fallback to `Intl.DateTimeFormat` construction probe), validates each `TaskTypeWindow` (`start_hour < end_hour`, both 0–23), and upserts. Exports `UserSettings`, `UserSettingsPatch`, `TaskTypeWindow` types. The digest routes and the calendar routes read from this lib for timezone and `master_calendar_id ?? 'primary'`; per-task-type windows remain a future hook-up.
- [lib/i18n.tsx](lib/i18n.tsx) — `LocaleProvider`, `useLocale`, `useT`, `t` helper.
- [lib/tz.ts](lib/tz.ts) — Shared timezone math: `todayInTz(timezone)` (YYYY-MM-DD in the given zone from "right now"), `tzOffsetMs(at, timezone)` (the zone's offset from UTC in ms at the given instant, DST-aware), `localHourToIso(date, hour, timezone)` (UTC ISO for a local-hour boundary on a date), `isInCurrentMonth(iso)` (UTC-month membership check). Replaces the previously duplicated helpers in the digest routes and the per-client month filter. Server-only.

**Route handlers (all server, never return tokens to client):**
- `/api/projects/update`, `/api/projects/create`, `/api/projects/blocks` — Notion updates / page creation / page-body fetch.
- `/api/projects/options` — `GET` returns `{ status: SelectOption[], area: SelectOption[] }` by calling `fetchSelectOptions("Status")` + `fetchSelectOptions("Area")` in parallel. Options include each entry's Notion `color` so the table can paint the Status/Area badge with a matching left-border accent.
- `/api/google/connect` — 302 to Google consent URL (scope: `auth/calendar`, `access_type=offline`, `prompt=consent`).
- `/api/auth/callback/google` — OAuth callback; exchanges code, persists tokens, redirects to `/settings/google-connected` (or `/settings/google-error?reason=…`).
- `/api/google/status` — `{ connected: boolean }`. Returns `false` if the table doesn't exist yet (pre-migration safety).
- `/api/digest/daily` — `GET` returns the most recent daily briefing for today or 204; `POST` looks up the most recent row for today (date, 'daily', order by created_at desc, limit 1) and returns it as cached when `input_hash` matches and `?force=true` is absent, otherwise generates a fresh briefing from Active projects (Notion) + today's Google Calendar events (if connected, read from `master_calendar_id ?? 'primary'`) and `INSERT`s a new row (no upsert — `briefings` is append-only) with sha256 `input_hash` + end-of-day `expires_at` in `settings.timezone`. Both date and `expires_at` are derived from `getUserSettings().timezone`.
- `/api/digest/timeblocks` — `GET` returns today's pending suggestions ordered by `start_at` asc (today resolved in `settings.timezone`). `POST` requires Google connected (409 `google_not_connected` if not), computes free intervals via `freebusy.query` on `master_calendar_id ?? 'primary'` between 09:00–18:00 in `settings.timezone`, calls Sonnet with strict-JSON instructions (`{ suggestions: [...] }`, 2–4 entries, 25–90 min, inside free intervals), parses defensively (502 on parse failure with raw output echoed), and inserts one row per suggestion sharing a single `batch_id`. The row shape (`SuggestionRow`) and the Supabase column list (`ROW_COLS`) live in [app/api/digest/timeblocks/_lib.ts](app/api/digest/timeblocks/_lib.ts) and are imported by this route plus the two `[id]/...` sibling routes — single source of truth for the table shape across all three.
- `/api/digest/timeblocks/[id]/confirm` — only valid when row is `pending`; inserts a Google Calendar event on `master_calendar_id ?? 'primary'` (`summary` = project name), stores `google_event_id`, transitions to `confirmed`. Returns 502 on Google insert failure, 409 on race (row not pending). Imports `SuggestionRow` + `ROW_COLS` from `../../_lib`.
- `/api/digest/timeblocks/[id]/dismiss` — transitions a pending row to `dismissed`. No calendar write. 409 if not pending. Imports `SuggestionRow` + `ROW_COLS` from `../../_lib`.
- `/api/calendar/events` — `GET ?start=ISO&end=ISO` returns `{ events: CalendarEvent[] }` for the visible range from `master_calendar_id ?? 'primary'`. `POST` creates a Google event (body: `{ summary, description?, start, end, notionProjectId? }`) and returns `{ event: { id, htmlLink } }`. Both require Google connected (409 `google_not_connected` if not).
- `/api/calendar/events/[id]` — `PATCH` updates an event with any subset of `{ summary, description, start, end }`; `DELETE` removes the event (204). Both require Google connected.
- `/api/clients` — `GET` returns `{ clients: MergedClient[] }`. Calls `listNotionClients()` + `listActiveContacts()` in parallel, joins on `Zoho Contact ID === contact_id`, returns one row per Zoho contact (Notion-only records without a Zoho match are dropped). Each row includes Notion-side metadata (industry, employees, etc., or `null` when no Notion record is linked) plus Zoho-side amounts (`outstandingAmount`, `unusedCredits`) and a cheap `hasOutstanding` flag. Sorted default by outstanding-desc then name-asc. If `NOTION_CLIENTS_DB_ID` is missing or the Notion DB is unreachable, the route logs and returns the Zoho-only view instead of failing (UI surfaces empty Notion fields per row).
- `/api/clients/[zohoId]` — `GET` returns `{ zohoContactId, notion, notionBlocks, invoices, lifetimeTurnover, monthlyTasks }`. Resolves the matching Notion record first; uses its `name` to filter Projects DB rows for this month (created in current month or due in current month). Invoices, lifetime turnover, this-month projects, and Notion page blocks are fetched in parallel.
- `/api/clients/[zohoId]/generate-tasks` — `POST` with `{ clientName }`. Filters existing Projects-by-client to current-month rows, computes which of `MONTHLY_TASK_NAMES` are missing, creates one Notion page per missing name (`Status=Active`, `Area=Fulfillment`, `Priority=Medium`, `Due Date=last calendar day of this month`). Returns 409 `tasks_exist` when all four already exist this month. Body: `{ created: string[], skipped: string[] }`.
- `/api/clients/[zohoId]/notion` — `PATCH` with `{ field, value }`. Validates `field` is one of the six editable client fields, validates `value` per field type (string-or-null for Industry / URL fields, number-or-null for Employees / Monthly Revenue). Re-resolves the Notion `pageId` from the Zoho contact ID server-side (never trusts a client-supplied pageId), then calls `updateClientField`. Returns 404 `notion_not_linked` if no Notion record matches.
- `/api/google/disconnect` — `POST` removes the stored token row via `disconnectGoogle()` so the OAuth flow can be re-run from scratch. Surfaced from the `/profile` Google card.
- `/api/profile/status` — `POST` runs every integration health check in parallel via `Promise.allSettled` and returns `{ notion, google, zoho, anthropic, supabase }` keyed by integration with `{ status: 'connected'|'error'|'not_configured'|'never_connected', message?, checkedAt }`. Anthropic check is cached in a module-level variable for 10 min (success AND error) to avoid burning API calls on every page load. Zoho check calls `pingZoho()` (GET `/organizations`) when all four Zoho env vars are set; falls back to `not_configured` if any are missing.
- `/api/profile/settings` — `GET` returns `{ settings }` for `user_key='markus'` (falls back to defaults if the row or table is missing). `PATCH` accepts any subset of `{ timezone, master_calendar_id, task_type_windows }`, validates via `lib/settings.updateUserSettings`, upserts, and returns the persisted row. 400 on validation failure (e.g. `invalid_timezone`, `start_not_before_end`).
- `/api/profile/calendars` — `GET` requires Google connected (409 `google_not_connected` if not), calls `listCalendars()` and returns `{ calendars: [{ id, summary, primary }] }`.
- `/api/profile/task-types` — `GET` calls `fetchSelectOptions("Task Type")` on the Notion Projects data source. Returns `{ options: [{ id, name }], missing: false }` when the property exists, or `{ options: [], missing: true }` when it doesn't — the UI uses `missing` to surface a "create this property in Notion" empty state.

**Pages:**
- `/` redirects to `/projects`.
- `/projects` — Tab 1, fully built (see below).
- `/digest` — Tab 2, daily briefing + time-block suggestions (see below).
- `/calendar` — Tab 3, Google Calendar mirror (see below).
- `/clients` — Tab 4, client master-detail (see below).
- `/profile` — integration status surface (see below). Linked from the top-nav avatar.
- `/areas`, `/resources` — placeholder "coming soon" pages.
- `/settings/google-connected`, `/settings/google-error` — OAuth flow landings.

**Tab 1 (Projects) — complete:**
- Three view modes — Table (TanStack), Kanban (dnd-kit, grouped by Status, drag-drop writes Status; Priority shown as pill), Calendar (FullCalendar `dayGridMonth` + `interaction` plugin, drag-to-reschedule writes Due Date).
- View toggle top-left, persisted in `bh.projects.view` localStorage.
- Status / Area / Priority filters at tab level — apply to all three views.
- Inline edit in Table for Status, Area, Priority, Due Date, Next Action; Name edit happens in drawer.
- Table typography unified across all cell types — `h-9` + `font-sans text-sm` on both read and edit states, so clicking to edit doesn't visually resize the cell.
- Status and Area cells render through [OptionBadgeSelect](app/projects/_components/cells/OptionBadgeSelect.tsx), which paints a 3px solid left border on the trigger using the colour Notion stores on each option (via `NOTION_COLOUR_MAP`). Options + colours are fetched once on mount from `/api/projects/options`; the cell falls back to muted-default when the fetch hasn't returned yet.
- Detail drawer (shadcn Sheet, 720px): compact metadata zone with editable Name heading + 9 metadata rows; read-only Notion page body rendered by [app/projects/_components/PageBodyRenderer.tsx](app/projects/_components/PageBodyRenderer.tsx) (paragraph, heading_1/2/3, bulleted/numbered list with one-level children, to_do, quote, callout, code, divider, toggle; bold/italic/strikethrough/code/link rich-text; loading/empty/error states).
- Add Project dialog (shadcn Dialog) — Name + Area required validation; defaults: Status=Active, Priority=Medium.
- Optimistic UI on all writes with sonner toast + revert on failure.

**Tab 2 (AI Digest) — daily briefing + time-block suggestions:**
- Daily briefing and time-block suggestions are built; weekly plan is deferred.
- Server route `/api/digest/daily` (POST/GET). POST gathers trimmed Active projects (Name, Status, Area, Priority, Due Date, Next Action, Estimated Minutes — no page bodies) and today's Google Calendar events (title + start + end only, if connected), computes a sha256 `input_hash` over canonical JSON of the inputs, calls Sonnet via `briefing()` with a system prompt that requests three short markdown sections ("Focus today", "Overdue / urgent", "Defer"; under ~400 words), and `INSERT`s a new row into `briefings` (date, 'daily') with `expires_at` set to end-of-day in `settings.timezone`. Cache hit when the most recent row for today has a matching `input_hash` and `?force=true` is absent.
- Briefings are append-only: every regeneration inserts a new row and the displayed briefing is the latest row for today; prior briefings are preserved for a future history-viewer (separate task).
- Time-block suggestions live below the daily briefing on `/digest` (component [app/digest/_components/TimeBlockSuggestions.tsx](app/digest/_components/TimeBlockSuggestions.tsx)). On mount it GETs `/api/digest/timeblocks` (no auto-generate — Sonnet only runs on explicit user click). The route echoes `settings.timezone` alongside the suggestions and the component formats `HH:mm–HH:mm` in that timezone (not a hardcoded one). Empty state shows a "Suggest time blocks" button; populated state shows cards (project name, time range, rationale) with Confirm / Dismiss actions and a "Suggest again" header button that appends a new batch alongside existing pending cards. Optimistic UI on confirm/dismiss with sonner toasts and revert on failure. Uses the same `tRef` + empty-deps `useEffect` pattern as `DailyDigest` so locale toggles don't refetch.
- Both `DailyDigest` and `TimeBlockSuggestions` use a `max-w-4xl` centred wrapper.

**Tab 3 (Calendar) — Google Calendar mirror:**
- Server shell [app/calendar/page.tsx](app/calendar/page.tsx) calls `isGoogleConnected()` + fetches Active projects from Notion (for the dialog's project dropdown) and passes both as props to [app/calendar/_components/CalendarView.tsx](app/calendar/_components/CalendarView.tsx). The page also imports the scoped stylesheet [app/calendar/calendar.css](app/calendar/calendar.css) — Google-Calendar-style FullCalendar overrides nested under `.bh-calendar` so they never bleed into the Projects-tab FullCalendar.
- When Google is not connected: renders a centered "Connect Google Calendar" card with a CTA linking to `/api/google/connect`. Calendar markup is not rendered.
- When connected: FullCalendar mounts with `[dayGridPlugin, timeGridPlugin, interactionPlugin]`. Initial view: `timeGridWeek` (persisted as `bh.calendar.view` in localStorage). `editable: false` — no drag-to-reschedule on this tab (edit flows through the dialog only). Slot range `06:00–22:00` (48px per hour, with dashed half-hour minor lines), nowIndicator on (a primary-coloured line with a leading dot), all-day slot hidden, week starts Monday.
- FullCalendar's default toolbar is hidden; the tab renders its own toolbar above the calendar with `<` / Today / `>` buttons + the current range label (read from `view.title` on `datesSet`) on the left, and a Day / Week / Month segmented control on the right. The view toggle drives FC imperatively via `calendarRef.getApi().changeView(next)`.
- Events fetched from `/api/calendar/events?start=…&end=…` on every `datesSet` (view/range change). Pending time-block suggestions fetched once on mount from `/api/digest/timeblocks` and overlaid with the `bh-pending-event` className so calendar.css paints them with the muted/dashed style; the title is prefixed with `⏳ ` so they stay recognisable when the dashed border is small.
- Empty-slot click opens [app/calendar/_components/EventDialog.tsx](app/calendar/_components/EventDialog.tsx) in create mode, pre-filled with the slot's start/end as `datetime-local` strings. Google event click opens the same dialog in edit mode (Title, Project select, Description textarea, Start/End datetime-local). Title required, End-after-Start validated inline. Edit mode includes a Delete button that opens a second confirmation Dialog (since shadcn `alert-dialog` isn't installed; same Dialog primitive, dedicated content).
- Pending-suggestion click opens [app/calendar/_components/PendingSuggestionPopover.tsx](app/calendar/_components/PendingSuggestionPopover.tsx) (implemented as a small shadcn Dialog — no `popover` primitive installed): shows project name, HH:mm–HH:mm time range, rationale, Confirm / Dismiss. Confirm calls `/api/digest/timeblocks/[id]/confirm`, removes the ⏳ event, optimistically adds the new Google event to local state; Dismiss calls `/api/digest/timeblocks/[id]/dismiss` and removes the ⏳ event.
- All event create/update/delete and suggestion confirm/dismiss writes are optimistic with sonner toasts and revert-on-failure snapshots. i18n entries under `calendar.*` (including `calendar.toolbar.{today,prev,next}`) in [constants/translations.ts](constants/translations.ts) (DE+EN).

**Tab 4 (Clients) — Zoho/Notion master-detail:**
- Server shell [app/clients/page.tsx](app/clients/page.tsx) does no data fetching and mounts [app/clients/_components/ClientsView.tsx](app/clients/_components/ClientsView.tsx). The client component fetches `/api/clients` on mount, auto-selects the first row, and lazy-fetches `/api/clients/[zohoId]` per selected client (cached in component state — clicking a previously-loaded client reuses cache).
- **Detail-fetch effect (loop-safe pattern — see the "Prevent useEffect infinite loops" constraint in Standard Prompt Constraints):** the effect depends on `[selectedZohoId]` only (primitive), and the guard short-circuits on `if (details[selectedZohoId]) return` — the *presence* of any entry, not the presence of loaded data. An earlier version depended on `[selectedZohoId, details, loadDetail]` and guarded on `details[selectedZohoId]?.detail`; since `loadDetail` sets `loading: true` before awaiting, the `details` reference changed mid-fetch, the effect re-fired, the guard didn't short-circuit (data was still `null`), and the route was hammered dozens of times per second. Reaffirmed in the constraint to prevent regressions in other tabs.
- Components: [ClientList](app/clients/_components/ClientList.tsx) (left panel, 320px), [ClientDetail](app/clients/_components/ClientDetail.tsx) (right panel; pulls in [InvoiceList](app/clients/_components/InvoiceList.tsx), [MonthlyTaskChecklist](app/clients/_components/MonthlyTaskChecklist.tsx), [WhatsAppTemplates](app/clients/_components/WhatsAppTemplates.tsx), and an inline `MetadataGrid`/`IndustryField`/`NumberField`/`UrlField` group). Notes section reuses `<PageBodyRenderer />` from the Projects tab. Shared types and helpers in [types.ts](app/clients/_components/types.ts) including `INDUSTRIES` (the Notion `Industry` select options), `clientHealth()`, and `formatEur()`.
- Health pill on each list row: green when no overdue, amber when outstanding > 0, red when at least one overdue invoice (red is detail-aware — upgrades from amber after that client's detail is loaded). Task progress badge shows `{done}/4` once the detail is loaded, `–` before then.
- WhatsApp templates: four parameterized strings under `clients.whatsapp.template.<task name>` in [constants/translations.ts](constants/translations.ts), interpolated with `{name}` and `{amount}`. Copy button writes plain text. Open WhatsApp button is `https://wa.me/<digits>` and is hidden when the Zoho phone normalises to fewer than 7 digits.
- Metadata edits PATCH `/api/clients/[zohoId]/notion`; task status cycles use the existing `/api/projects/update` POST; task generation POSTs `/api/clients/[zohoId]/generate-tasks`. All writes are optimistic with sonner toast + revert on failure.
- i18n entries under `clients.*` in [constants/translations.ts](constants/translations.ts) (DE+EN, including monthly task labels, invoice status labels, WhatsApp templates, and metadata field labels).

**Profile (integration status + settings surface):**
- `/profile` ([app/profile/_components/ProfileView.tsx](app/profile/_components/ProfileView.tsx)) lists every integration as a card: name, kind (env / OAuth), status pill (Connected / Error / Not configured / Never connected), checked-at relative time, error message (truncated to ~120 chars, monospaced). A "Re-check all" header button re-runs every check; Google offers Connect / Disconnect actions.
- Env-based integrations (verified by a live ping): **Notion** (`users.me()`), **Anthropic** (1-token Haiku call, cached 10 min in a module-level variable to avoid burning API on every load — success AND error cached), **Supabase** (`select head:true` on `briefings`).
- OAuth integrations: **Google Calendar** (`isGoogleConnected()` + `calendarList.get('primary')` ping to verify the token still works). **Zoho Books** is wired via `pingZoho()` (GET `/organizations` — validates token + org_id) and reports `connected` / `error` / `not_configured`.
- All checks run in parallel via `Promise.allSettled` in `/api/profile/status`. The route never returns secrets / token contents.
- **Settings section** ([app/profile/_components/SettingsSection.tsx](app/profile/_components/SettingsSection.tsx)) — sits below Integrations. Three subsections:
  1. **Timezone** — Input + `<datalist>` of ~15 curated IANA zones (Dubai, Berlin, Madrid, London, Lisbon, Athens, Zurich, New York, Chicago, Denver, Los Angeles, Toronto, São Paulo, Singapore, Tokyo); free-text accepted. PATCH on Save / Enter.
  2. **Master Calendar** — radio list of user's Google calendars (with `primary` badge). Self-fetches `/api/profile/calendars` and listens for `bh:google-status-changed` so disconnect/reconnect re-syncs without a reload. Renders a muted "Connect Google Calendar" note when not connected.
  3. **Task Type Windows** — grouped list whose sections are derived from Notion's `Task Type` select-property options (fetched live each load, no string-coupling in code). Each section can hold **multiple windows** (`start_hour`–`end_hour` pairs) for that task type. A `+ Add window` button appends a `{ task_type, start_hour: 9, end_hour: 17 }` entry to the array; an `×` button per row removes it. PATCH on add / remove / valid edit with the full updated array. Rows with `start >= end` show a "Start must be before end" inline error and update visually but are not persisted until corrected. Backed by the existing `user_settings.task_type_windows` jsonb column — multiple entries with the same `task_type` are valid, so no migration was needed.
- Optimistic UI on all PATCHes with sonner toast + snapshot revert on failure. Uses the `tRef` + empty-deps `useEffect` pattern.
- The digest routes and the Tab 3 calendar routes read `timezone` + `master_calendar_id ?? 'primary'` from `lib/settings`. The time-block planner now also reads `task_type_windows`: when any windows are configured the workday window is the union (min start, max end) across all entries; otherwise it falls back to 09:00–18:00. The route logs the resolved window (`[timeblocks] tz=… window=H:00-H:00 → ISO → ISO`) for verification. Per-task-type routing (matching a project's Task Type to its specific window) is still future work.
- The time-block UI formats start/end in `settings.timezone` (echoed in the `/api/digest/timeblocks` response) rather than the previously hardcoded `Europe/Berlin` — fixes the symptom where a 09:00 Dubai suggestion was displayed as 07:00.
- UI: server-shell `/digest` page mounts client component [app/digest/_components/DailyDigest.tsx](app/digest/_components/DailyDigest.tsx). On mount it GETs `/api/digest/daily` (204 → empty state with "Generate" button). Renders the cached markdown via `react-markdown` (no plugins) using custom `components` mapping for headings/lists/strong/em/a/code/blockquote. "Regenerate" button POSTs `?force=true`. Generated-at indicator shows "Just generated" or a localized relative time.
- New dependency: `react-markdown` ^10 (no remark/rehype plugins). i18n entries under `digest.*` in [constants/translations.ts](constants/translations.ts) (DE+EN).

**Google OAuth — scaffolded, not yet exercised:**
- Code path works end-to-end on paper. Awaiting (a) Markus running the migration, (b) Markus clicking "Connect Google" in the top nav once to grant consent.
- The daily digest gracefully proceeds without calendar context when not connected (`googleConnected: false` flag passed into the model prompt).

**Not yet built:**
- Tabs 5–6 (Areas, Resources) — placeholders only.
- Tab 2 weekly plan.
- Per-task-type window *routing*: the planner reads the union (min start / max end) across all configured `task_type_windows`, but does not yet match a project's Task Type to that type's specific window.
- Supabase tables beyond `google_oauth_tokens`, `briefings`, `time_block_suggestions`, `user_settings`.
- Any agents or sub-agents.
- Notion Areas and Resources DBs (added when Tabs 5 and 6 build).
- RLS on `google_oauth_tokens` / `briefings` / `time_block_suggestions` / `user_settings` (currently relying on service-role-only access).

**Next planned step:** Tab 5 (Areas). Decide between (a) a new Notion `Areas` DB and (b) deriving Areas from the existing Projects DB `Area` select. Build an `app/areas` server shell + client view that surfaces one card per Area with Current Milestone (1 line, editable inline), Next 1–2 Steps (editable inline), and a count of Active projects linked to the Projects tab filtered by Area.

## Start-of-Session Checklist

Run this every session before touching code:

1. Read this CLAUDE.md in full.
2. Check the current branch. It should be `dev`. If it is `main`, switch before making changes.
3. Confirm where the requested work sits in the [Capability Priority Order](#capability-priority-order). If it does not appear there, ask before building.
4. If the task looks large or expensive (many files, broad rewrites, full-codebase reads), propose a narrower scope first and wait for confirmation.
5. Check `supabase/migrations/MIGRATION_LOG.md` if the task touches the database.
