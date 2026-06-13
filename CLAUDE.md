# Business Hub

Internal Next.js application that acts as Markus's primary operating dashboard — a full hub on top of Notion, Google Calendar, and Zoho Books. Read this file in full at the start of every session.

## Cowork Session Rules

These rules govern how Claude behaves inside Cowork mode. They apply in addition to all other constraints in this file. Read this section first, every session, before reading anything else.

### Role
Claude in Cowork is a senior engineering advisor and prompt author. It does not write, edit, or delete files. All implementation is done by Claude Code in the terminal. Cowork's job is to produce the prompt for Claude Code to execute — and to review what Claude Code returns before the next step. `roadmap.md` (`/business-hub/roadmap.md`) is a Cowork-managed strategic reference — it is off-limits to Claude Code unless a prompt explicitly names it.

### Notion-Fähigkeiten in Cowork (Capability-Limit — nicht erneut nachfragen)
- Die Notion-Anbindung in Cowork kann Seiten **nur erstellen und lesen**, **nicht aktualisieren, archivieren oder löschen**. Es gibt kein `update_page`-Tool.
- Konsequenz: Beim Versionieren (z.B. Areas `(vN)`) kann Cowork ein bestehendes `(v3)`-Suffix **nicht** entfernen und alte Versionen **nicht** archivieren. Das macht Markus selbst (Suffix umbenennen in Notion, alte Versionen in `/areas/manage` archivieren).
- Markus **nicht** wiederholt fragen, ob das Suffix entfernt oder die alte Version archiviert werden soll — einmal den manuellen Schritt nennen und gut.

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
- Jeder Prompt, der ein Feature ausliefert, einen Bug fixt oder Repo-State ändert, MUSS CLAUDE.md in `<files>` aufnehmen plus einen `<task>`-Schritt, der die betroffenen Tier-1-Abschnitte (Current Repo Status, Tab-Specs, PARA-Tabellen, additive Listen) im selben Prompt aktualisiert — als Tier 1 klassifiziert — damit die Doku nie über einen separaten Folge-Prompt nachgezogen werden muss. Tier-2-Abschnitte werden NIE automatisch editiert; sie bleiben confirmation-gated. Ändert ein Prompt nichts Dokumentierbares (reiner interner Refactor; keine Verhaltens-, Route-, Constant-, Env- oder Status-Änderung), muss er explizit "CLAUDE.md: no doc change needed" nennen, damit das Weglassen bewusst und nicht vergessen ist.

### Codebase conventions (enforce in every prompt)
- All work on `dev` branch — include as a `<do_not>` whenever relevant.
- No hardcoded table names, route strings, model IDs, or user-facing strings — use constants files.
- Every new i18n string requires both `de` and `en` entries. One language only is a bug.
- `npm run build` must pass — include as a success criterion on every prompt that touches code.
- Any prompt adding a data-fetching `useEffect` must explicitly reference the infinite-loop guard pattern in Standard Prompt Constraints.

### Verbatim-Sammelregel
- Wenn aus Quellen wie Klienten-Testimonials, Sales-Calls, Client-Calls, DMs, Reviews oder ähnlichem Verbatim-Material extrahiert wird, das in eine strukturierte Notion-Ablage übertragen wird (Client Language Bank, Brand OS-Pages mit Verbatim-Belegen, Pain/Trigger/Desire/Identity/Success-Metric-Sammlungen), gilt: **alle relevanten Verbatims** werden übertragen, nicht nur eine Top-N-Auswahl.
- Ziel ist Volumen für Muster-Erkennung. Markus will bei 10 starken Zitaten zu einem Thema 10 Einträge sehen, nicht 3 kuratierte.
- "Relevant" heißt: dient als Beleg für die Kategorie (Pain, Desire, etc.), ist verbatim oder dicht paraphrasiert, ist nicht reine Floskel.
- Empfehlungen, Sortierungen, Top-Picks oder "Stärkster Kandidat"-Markierungen sind in der Synthese-Begleitnotiz erlaubt und hilfreich. Sie ersetzen nicht das Anlegen aller einzelnen Einträge.
- Diese Regel gilt für jede Datenquelle, nicht nur für den Call-Miner-Skill. Auch bei Founder-Interviews, MINE-VOC-Research oder Sales-Call-Analysen.

### Push back
- If the premise of a request is flawed, say so before writing the prompt. Propose a better path with reasoning.
- If a prompt would be expensive (many files, broad rewrites), name it and propose a narrower scope first.
- Do not write prompts that silently comply with a flawed approach.

## Project Overview

Business Hub is a solo internal tool for Markus to run his business from one place. It is a tab-based hub with edit-capable surfaces — Markus reads, edits, and acts on his content from inside Business Hub, not by jumping between Notion, Google Calendar, and Zoho.

Single user: Markus. Non-technical founder. No multi-user, no auth flows beyond personal OAuth, no public surface.

**Primary goal:** meet deadlines, maintain overview, and work on what matters with clarity — without being overwhelmed.

What Business Hub IS:
- A full hub with 11 tabs: Projects, Development, AI Digest, Calendar, Clients, Areas, Resources, Calls, Freizeit, Bücher, Weekly Journal
- An edit-capable frontend on top of Notion + Google Calendar + Zoho Books
- An AI digest that reads everything and tells Markus what to do today and this week

What Business Hub is NOT:
- Not a replacement for Notion as the data layer. Notion still owns the schema and the data.
- Not a CRM, not a billing system. Zoho owns billing.
- Not a multi-user product. Solo app.
- Not a vanity-metrics dashboard.

## Brand Identity Reference

Brand identity (Mission, ICP, Positioning, Voice, verbatim customer phrases) is **canonical in Notion**, not in this repo. Read it before writing any user-facing copy — landing page text, ads, sales scripts, emails, social.

- **Brand name (outward-facing):** EasyFinance — used on landing page, sales calls, service, software. Official entity behind invoices: ML Solutions FZE (not used in branding).
- **Personal/founder content handle:** Geldstruktur — Markus's Instagram presence only. NOT the service brand.

### Where to look in Notion

- One-shot read for brand context: [Kontext-Brief — EasyFinance](https://www.notion.so/367dbb6acff781e69382ed94730d4bd0) (single source of truth, designed to be read at the start of any copy task)
- Full depth: [Brand OS DB](https://www.notion.so/c2f2040f70684c6d8398abc0f57ccb63) — 13 elements (Mission, Vision, Werte, Origin Story, ICP, Pain, Desire, Triggers, Positioning, Mechanism, Konkurrenz, Voice, Sales-Call-Framework). All 13 at Status=Working as of 2026-05-22.
- Verbatim customer phrases: [Client Language Bank](https://www.notion.so/aa793b49e04e4eabbdb83ec32422c6f5) — 36 quotes tagged by Type (Pain/Desire/Objection/Identity/Success Metric/Trigger Event) and Theme (Cashflow/Tax/Wealth/Time/Family/Business growth/Trust/Overwhelm). 28 historical MINE-VOC entries + 8 first-party Massimo verbatims from 2026-05-22 sales-call (first non-MINE-VOC entries; first Objection-Type-slot population).
- Sales-Call-Framework (operative Sales-Schicht): https://www.notion.so/368dbb6acff781f486f5d43cdb7244df

### Rules

- Brand OS rows with **Status = Draft** are not approved for external use — only Working or Canonical rows feed copy.
- Voice/tonality rules (Du-Form, anti-Esoterik, anti-Sie-Form, Connector-Ton) live in the Brand Voice row — read it before any copy task.
- Verbatim Language Bank phrases must NOT be paraphrased — they convert because they are the exact market wording.
- This file (CLAUDE.md) does not duplicate brand content. If the Notion brand DB and this file disagree, Notion wins.

### Editing Brand OS entries via Notion MCP — naming convention

The Notion MCP available in Cowork has **no `update_page` tool** — only create + read. To modify an existing Brand OS row you must:

1. Create a **new page** in the Brand OS data source with the updated content.
2. Suffix the **Element name** of the new page with `(v2)` / `(v3)` etc. so the table view shows the two rows side-by-side and Markus can tell at a glance which is newer **without checking page IDs**.
3. Hand Markus an explicit deletion list with the page ID(s) and URLs of the old version(s).
4. After Markus deletes the old row, he removes the `(v2)` suffix manually.

Example: rewriting "Mission" → create the new row as `Mission (v2)`. Once the old "Mission" is deleted by Markus, he renames `Mission (v2)` → `Mission`.

**Never create a new page with the same Element name as the existing one without a version suffix** — duplicate names without version markers are ambiguous in the table view and force Markus to inspect page IDs to find the canonical one.

The same convention applies to the Kontext-Brief sub-page under /06 Brand and to entries in the Client Language Bank (though Language Bank entries are usually additive, not replacements).

### Brand OS — open follow-ups (not blocking)

These were left open at the end of the 2026-05-21/22 founder-interview rounds. Pick any up when relevant:

- **Client success quote** — still open. The 8 first-party entries added on 2026-05-22 are from a single sales-call prospect (Pain / Trigger / Objection), not Success-Metric. Markus will surface a verbatim "seit ich Markus' System nutze, ___" quote from his WhatsApp/Telegram chats with an existing paying client. Add it to Client Language Bank as a Success-Metric entry once available.
- **Optional A — Personalisierung der Market-category Brand OS rows.** Per 2026-05-22:
  - **ICP** — done. v2 committed 2026-05-22 with real 9-client composition (89% Empfehlung, branchenagnostisch im Service-Layer) + Avatar Daniel = realer erster Klient (Juni 2024).
  - **Pain / Trigger Events** — partial. 6 Pain + 1 Trigger first-party Massimo verbatims now in Language Bank. v2 rows would weave these as concrete examples into the existing MINE-VOC pain/trigger clusters.
  - **Desire** — still MINE-VOC-only. Surface from upcoming sales-call mining or existing-client 3-month-review chats.

## Standard Prompt Constraints

Every Claude Code prompt for Business Hub should apply the constraints below. To keep prompts short, prompts can simply state "Apply the standard constraints listed in CLAUDE.md" rather than repeating them. The constraints live here so they update centrally — a change here propagates to all future prompts.

### Always

- Specify exact columns in all Supabase queries. Never `select('*')`.
- All secrets stay server-side. Never expose API keys, refresh tokens, or service-role keys to the client.
- Use existing constants files (`constants/tables.ts`, `constants/models.ts`, `constants/translations.ts`, `constants/departments.ts`, `constants/priorities.ts`, `constants/routes.ts`, `constants/client-tasks.ts`). Create them if missing. Never hardcode table names, model IDs, route paths, departments, priorities, monthly task names, or user-facing strings inline.
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
- Do not read, modify, or reference `roadmap.md` unless the prompt explicitly names it. `roadmap.md` is a strategic and operational reference maintained in Cowork. It is not part of the codebase and must never be touched as a side effect of a feature build, refactor, or CLAUDE.md sync.

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
- Tier-1-Doku-Updates sind per Default Teil des Feature-Prompts, kein separater Folge-Prompt. Jeder Prompt, der ein Feature ausliefert, einen Bug fixt oder sonst Repo-State ändert, aktualisiert die relevanten Tier-1-Abschnitte im selben Prompt, der die Änderung macht, damit CLAUDE.md nie aus dem Sync läuft. Tier-2-Abschnitte bleiben confirmation-gated.

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

- **Table view** — sortable columns (Name, Status, Department, Priority, Due Date, Next Action). Filterable by Status, Department, Priority. Inline edit for Status, Department, Priority, Due Date, and Next Action. Clicking the Name cell opens the detail drawer (Name is edited there, not in the row). Built on TanStack Table.
- **Kanban view** — three columns grouped by Status (Active / On Hold / Done). Drag-and-drop between columns writes the new Status to Notion. Each card shows a Priority indicator (small colored dot + label). Clicking the card body opens the detail drawer; the grip handle remains the drag activator. Built on dnd-kit.
- **Calendar view** — deadline view: projects rendered on their Due Date. Projects without a Due Date appear in a sidebar "no deadline" list. Clicking an event or a sidebar item opens the detail drawer. Drag-to-reschedule is supported: dragging an event to a different day writes the new Due Date to Notion (date-to-date only; no resize, no sidebar-to-calendar). Built on FullCalendar React + the `@fullcalendar/interaction` plugin.

All three views read from the same Notion Projects DB. View toggle is a segmented control in the tab header. Selected view persists in localStorage. The Status/Department/Priority filters live at the tab level and apply to all three views.

Setting a project's **Status to `Archived`** (via the Table status cell or the drawer's Status row) is an archive action, not an in-place edit: the project is copied to the Archive DB, the source page is trashed, and the row leaves the hub. See the Archive automation section in Current Repo Status.

**Detail drawer** — clicking a project in any view opens a right-anchored drawer (shadcn `<Sheet>`, 720px) that is the primary detail surface. The top zone is a compact metadata list (icon + narrow label column + value): Name (large editable heading), Status, Department, Priority, Due Date, Next Action, Estimated Minutes, Client, Outcome (read-only), Created. The bottom zone displays the Notion **page body** read-only, fetched live via `notion.blocks.children.list` and rendered through a custom block renderer (no rich-text library). Editing the page body still happens in Notion via the drawer's "Open in Notion" link.

An **"Add Project" button** in the tab header opens a modal (shadcn `<Dialog>`) to create a new project; the new page is written to the Notion Projects DB and appears immediately in the current view (subject to active filters).

### Tab 2: AI Digest

Claude reads Markus's Active Projects, Areas, today's calendar, and open invoices, and produces:

- **Daily digest** — a short briefing: what to focus on today, what's overdue, what to defer. Generated on demand or cached for the day in Supabase `briefings` table.
- **Weekly plan** — a 5-day plan based on current Active projects, deadlines, and estimated minutes. Generated on demand. Markus can regenerate.
- **Time-block suggestions** — proposed Google Calendar blocks across a forward-looking horizon (default 5 days, up to 7), grouped by day. Each suggestion has a one-click "Confirm" that writes the event to Google Calendar.

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

**Master list (320px fixed):** name + outstanding amount + health pill (green = no overdue, amber = outstanding > 0, red = at least one overdue invoice) + monthly-task progress badge (`{done}/4`, shows `–` until the detail for that client has been loaded). Sort: Overdue first (default), Outstanding (highest first), Name A–Z. A **Status filter** sits above the sort selector — options are the unique non-null Notion `Status` values across the loaded clients (sorted A–Z, derived from data so newly-added Notion options appear without a code change). Health badge red/amber is detail-aware, so a row's pill upgrades from amber to red after that client's detail is fetched. The tab container is `mx-auto w-full max-w-screen-2xl` (the old `min-w-[1240px]` was dropped in the 2026-06-06 mobile-first pass). On desktop (`md:` and up) the master list + detail render side-by-side via `md:grid md:grid-cols-[320px_minmax(0,1fr)]`; on mobile it becomes a **master/detail drill-down** — the list shows first, selecting a client swaps to the detail panel, and a "Back to list" button (`clients.detail.back`, `md:hidden`) returns to the list.

**Summary bar (above both panels):** total clients, total outstanding (sum across all clients), total overdue (sum across loaded details only — under-states until all clients have been opened, never over-states).

**Detail panel sections:**
1. **Header** — name, contact `Person` line (rendered as "Ansprechpartner / Contact person: <name>" when set), Zoho email, Open Dashboard button (if `Dashboard Link` set), Open in Notion button (if Notion record linked).
2. **Financial summary** — Lifetime Turnover (from Zoho all-invoice sum, cached 10 min per contact), Outstanding (from Zoho `outstanding_receivable_amount`), Overdue (sum of overdue invoice balances). Below that: open invoices table (Invoice #, Date, Due Date, Amount, Status). Max 10 rows; "View all in Zoho" links to the Zoho Books invoices list.
3. **Monthly tasks** — checklist of the four `MONTHLY_TASK_NAMES` rows. Each row shows the project's Status badge (Active / On Hold / Done) or "Not created" if no project for that name exists this month. Clicking the badge cycles Active ↔ Done (optimistic, writes via existing `/api/projects/update`). When not all four exist, a "Generate tasks" button creates the missing ones in the Projects DB with `Status=Active`, `Department=Fulfillment`, `Priority=Medium`, `Due Date=last calendar day of current month`; 409 `tasks_exist` swaps the button for an "already generated this month" muted line.
4. **WhatsApp templates** — four templates (one per task stage), interpolated with `{name}`, `{amount}` (formatted Euro, no symbol — template includes €), and `{due_date}` (the earliest unpaid invoice's due date, drives the Prepare Call template's urgency). Copy button writes plain text to the clipboard; Open WhatsApp button is a `wa.me/<digits>` deep link, only shown when the Zoho contact has a phone number that normalises to ≥7 digits. **Per-client template overrides are partially built** — the backend (Supabase `client_template_overrides` table, `/api/clients/[zohoId]/templates` GET/PUT/DELETE, `templateOverrides` field on the detail payload) is in place but no UI consumes `detail.templateOverrides` yet, so all clients still see the default DE/EN strings from `constants/translations.ts`. See "Not yet built" below.
5. **Client metadata** — seven rows: six editable fields (Industry select, Employees number, Monthly Revenue number with € formatter, three URL fields for Call Notes / Client Database / Dashboard) + one read-only `Monthly Fee` row (€-formatted). Inline edit per editable field with Save/Cancel; PATCH writes optimistically to Notion via `/api/clients/[zohoId]/notion` with revert + toast on failure. The route re-resolves the Notion pageId from the Zoho contact ID server-side rather than trusting a client-supplied id.
6. **Notes** — read-only `<PageBodyRenderer />` (same component as the Projects detail drawer) over the Notion page body. "Edit in Notion" link below. Both sections show "No Notion record linked" when there is no Notion record for the contact.

Zoho is read-only from Business Hub (no writes). Notion writes are limited to (a) the six editable metadata fields, (b) creating monthly task projects, (c) cycling task status on existing projects.

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

The resource detail drawer has an **Archive** action (with a reason picker) that moves a resource to the Archive DB and trashes the source page. See the Archive automation section in Current Repo Status.

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
- ~~Mobile-optimized layouts — desktop-first, mobile is a v2 concern.~~ **Built 2026-06-06 (commit `b4a7743`) — no longer deferred / no longer out of scope.** A mobile-first responsive layout now ships across all tabs; see "Mobile-first responsive layout" under Current Repo Status.
- Notification system (email, push, in-app) — Markus checks the hub manually.
- Editing existing Resources/Archive notes inside Business Hub — open in Notion instead.
- Two-way EasyFinance integration — Business Hub and EasyFinance stay separate codebases and separate data. Business Hub only links out to EasyFinance URLs.

## Coding Conventions

### Constants files

Every value below lives in a constants file. Never hardcode a table name, route, model ID, department name, priority, or user-facing string anywhere else in the codebase.

Files are created with `.ts` extension (TypeScript project) when a feature first needs them. Do not pre-scaffold empty placeholder files.

- `constants/tables.ts` — **CREATED.** Every Supabase table name. Exports `TABLES.GOOGLE_OAUTH_TOKENS`, `TABLES.BRIEFINGS`, `TABLES.TIME_BLOCK_SUGGESTIONS`, `TABLES.USER_SETTINGS`, `TABLES.CLIENT_TEMPLATE_OVERRIDES`. Imported by every Supabase query.
- `constants/routes.ts` — **CREATED.** `ROUTES.pages.*` for every internal page path (home/projects/digest/calendar/clients/areas/resources/calls/profile/googleConnected/googleError) and `ROUTES.api.*` for every API endpoint (projects, digest, calendar, clients, google, profile, archive, roadmap, resources, areas, calls). Parameterized endpoints (`projects.blocks(pageId)`, `digest.timeblockConfirm(id)`, `digest.timeblockDismiss(id)`, `calendar.event(id)`, `clients.detail(zohoId)`, `clients.generateTasks(zohoId)`, `clients.notionPatch(zohoId)`, `clients.templates(zohoId)`, `areas.blocks(id)`, `areas.update(id)`, `resources.blocks(id)`, `resources.archive(id)`) are functions that encode the id. `ROUTES.api.calls` has `create` (static, consumed by the external Call Miner skill), `mine` (the Calls-tab transcript-analysis route), and `list` (the recent-calls reader). `ROUTES.pages.calls` (`/calls`) is the Calls tab. Imported wherever a route string was previously hardcoded.
- `constants/models.ts` — **CREATED.** Anthropic model IDs (`MODELS.BRIEFING` = `claude-sonnet-4-6`, `MODELS.CLASSIFY` = `claude-haiku-4-5-20251001`) + `ModelKey` / `ModelId` types. Model upgrades are a one-line change here.
- `constants/translations.ts` — **CREATED.** DE/EN i18n strings. Every user-facing string lives here, with both `de` and `en` entries. No exceptions.
- `constants/departments.ts` — **CREATED.** Fulfillment, Accounting, Marketing, Sales, Development, Operations, Content, Personal + `Department` type. (Renamed from `constants/areas.ts` / `AREAS` / `Area` on 2026-05-20 — see the Tab 1 note in Current Repo Status.)
- `constants/archive.ts` — **CREATED.** `REASONS_ARCHIVED` (`Completed` / `Cancelled` / `Outdated` / `Replaced` / `No longer relevant`) + `ReasonArchived` type, `DEFAULT_REASON_PROJECT` (`Completed`), `DEFAULT_REASON_RESOURCE` (`No longer relevant`). Drives the archive-automation reason picker and the Archive DB `Reason Archived` writes.
- `constants/priorities.ts` — **CREATED.** High / Medium / Low + `Priority` type; Active / On Hold / Done + `Status` type. Also exports `NOTION_COLOUR_MAP` (the 10 Notion option-colour names → CSS values) and `notionColour(name)` helper used by the Projects table to paint Status/Department badges with the colour that Notion stores on each option.
- `constants/user.ts` — **CREATED.** Solo-user identity (`USER.EMAIL`, `USER.INITIALS`, `USER.NAME`). Display only — never used for auth.
- `constants/client-tasks.ts` — **CREATED.** `MONTHLY_TASK_NAMES = ['Book a Call', 'Get Transactions', 'Prepare Call', 'Call Done']` + `MonthlyTaskName` type. Drives the per-client monthly task checklist, the generate-tasks idempotency check, and the WhatsApp template keys.
- `constants/call-notes.ts` — **CREATED.** Call Notes taxonomy consumed by `/api/calls/create` (the external "Call Miner" Cowork skill writes here): `CALL_TYPES` (Sales/Client/Coaching/Other), `OUTCOMES_SALES`, `OUTCOMES_CLIENT`, `OUTCOMES_COACHING` (`On Track` / `At Risk` / `Breakthrough` / `Action Needed` — `At Risk` is shared with the Client set), `ALL_OUTCOMES` (deduped union of the three sets so `At Risk` appears once), `ENGAGEMENT_LEVELS`, `OBJECTION_TAGS` + `CallType` / `Outcome` (union of all three outcome sets) / `EngagementLevel` / `ObjectionTag` types. Values are case-sensitive and must match the Notion Call Notes DB select options exactly.
- `constants/project-views.ts` — **CREATED (2026-06-07).** The four named list-views for Tab 1: `PROJECT_VIEWS` (`open` = Active/In Progress/Later, `backlog` = Backlog, `onhold` = On Hold/Waiting, `done` = Done) + `ViewKey` type, `DEFAULT_VIEW_KEY` (`open`), and `PROJECT_VIEW_STATUSES` (the deduped union of every status any view references **plus** `"Nicht relevant"` appended additively — consumed by `listProjectsForViews()` and by `/api/projects/update`'s Status validation). `"Nicht relevant"` (imported from `constants/development.ts` as `STATUS_NOT_RELEVANT`) is **not** a Projects-tab view; it is added to the union only so the Development tab's inline Status edit to that option validates (no `400 value_not_in_enum`). Intentionally typed `readonly string[]` because it references Notion Status values outside the narrow `Status` union in `constants/priorities.ts`; that union stays limited to Active/On Hold/Done (Kanban columns + drawer/Add-dialog selects).
- `constants/area-categories.ts` — **CREATED (2026-06-08).** `AREA_CATEGORIES = ["Business", "Privat", "Weiterbildung"] as const` (both display + grouping order; case-sensitive, must match the Notion Areas DB `Kategorie` select options) + `AreaCategory` type. Drives the collapsible category sections on the Areas page. Never hardcode these strings elsewhere.
- `constants/areas-review.ts` — **CREATED (2026-06-07).** Server-side question bank for the Areas Review wizard, keyed by the **base** area name (the Notion page name with the ` (vN)` suffix stripped). `UNIVERSAL_QUESTIONS` (5: done_extra / status / milestone / milestone_due / health) + `AREA_QUESTIONS` (two per area for Content/Marketing/Sales/Fulfillment/Accounting/Operations/Development/Personal) + `questionsForArea(base)` (universal + that area's two) + `ReviewQuestion`/`ReviewQuestionType` types. Question labels reference `areasReview.q.*` keys in `constants/translations.ts` (rendered through `t()`).
- `constants/buecher.ts` — **CREATED (2026-06-08).** Bücher (personal library) taxonomy: `BUCHER_STATUSES = ["Gelesen", "Aktuell", "Demnächst"] as const` + `BucherStatus` (case-sensitive, must match the Notion Bücher DB `Status` select options; drives validation + the Status-select option order); `BUCHER_SHELF_ORDER = ["Aktuell", "Demnächst", "Gelesen"] as const` (display order of the card-grid status shelves, top → bottom — **separate** from `BUCHER_STATUSES` so the shelf order can differ from the select-option order; same `BucherStatus` value set); `BUCHER_TAGS` (seed list `Business`/`Mindset`/`Fiction`/`Finance` — the Notion `Tags` multi_select is extensible, this is only the seeded set) + `BucherTag`; cover-art endpoint constants `GOOGLE_BOOKS_SEARCH_URL`, `OPENLIBRARY_SEARCH_URL`, `OPENLIBRARY_COVER_URL(coverId, size)`. Never inline these URLs elsewhere. Mirrors the structure of `constants/freizeit.ts`.
- `constants/development.ts` — **CREATED (2026-06-13).** Development tab (Tab 10) taxonomy: `PRODUCTS = ["Business Hub", "EasyFinance", "Familien-Stammbaum"] as const` + `Product` type, `DEV_TYPES = ["Feature", "Bug", "Anpassung"] as const` + `DevType` type, `DEVELOPMENT_DEPARTMENT = "Development"` (the Projects DB `Department` select option that flags dev work). All strings are case-sensitive and must match the Notion Projects DB `Product` / `Dev Type` / `Department` select options exactly. Never hardcode these option strings elsewhere. **Status buckets (2026-06-13):** `STATUS_NOT_RELEVANT = "Nicht relevant"` (+ `STATUS_BACKLOG` / `STATUS_DONE` / `STATUS_ARCHIVED`), `DEV_STATUS_BUCKETS` (ordered `{ key, labelKey }[]` — `all` / `active` / `backlog` / `done` / `not_relevant`; `active` & `done` reuse the existing `status.*` i18n keys, the rest use dedicated `development.bucket.*` keys) + `DevStatusBucket` type, `DEFAULT_DEV_STATUS_BUCKET = "active"`, and `matchesDevStatusBucket(bucket, status)` (the predicate: `active` = anything NOT in {Backlog, Done, Archived, Nicht relevant}; `backlog`/`done`/`not_relevant` = exact match; `all` = no filter). Imports `type TranslationKey` from `constants/translations` (type-only, no runtime cycle). `STATUS_NOT_RELEVANT` is also imported by `constants/project-views.ts` (appended to `PROJECT_VIEW_STATUSES`).
- `constants/journal.ts` — **CREATED (2026-06-13).** Weekly Journal tab (Tab 11) taxonomy: `JOURNAL_KATEGORIEN = ["Business", "Privat", "Weiterbildung"] as const` + `JournalKategorie` (the Erfolge DB `Kategorie` select + the Journal-Kanban column order; same three values as `constants/area-categories.ts` but the Erfolge DB owns its own select); `JOURNAL_WEEK_STATUSES = ["Entwurf", "Abgeschlossen"] as const` + `JournalWeekStatus`; `WEEK_COMPLETED_STATUS = "Abgeschlossen"` (the week-status the overdue check looks for); `ERFOLG_STATUSES = ["Not started", "In progress", "Done"] as const` + `ErfolgStatus` (a Notion `status` property, not a select); `OVERDUE_THRESHOLD_WEEKDAY = 7` (ISO weekday Mon=1…Sun=7 on/after which an un-finished current week counts as overdue — the single knob to move the reminder earlier/later); `JOURNAL_NOTION_DB_URL` (the overdue banner's "open in Notion" target). All option strings are case-sensitive and must match the Notion Weekly Journal / Erfolge DB options exactly. Never hardcode these elsewhere.

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
NOTION_CALL_NOTES_DB_ID=      # 32-char hex of the Call Notes database — paste after creating the DB in Notion
NOTION_AREAS_DB_ID=           # 32-char hex of the Areas database — created 2026-05-17
NOTION_RESOURCES_DB_ID=       # 32-char hex of the Resources database — populated for Tab 6
NOTION_ARCHIVES_DB_ID=        # 32-char hex of the Archive database — archive-automation Phase 1
NOTION_FREIZEIT_DB_ID=        # 32-char hex of the Freizeit database — paste after running scripts/create-freizeit-db.mjs
NOTION_BUCHER_DB_ID=          # 32-char hex of the Bücher database — paste after running scripts/create-buecher-db.mjs
NOTION_WEEKLY_JOURNAL_DB_ID=  # 32-char hex of the Weekly Journal database (read-only Journal tab) — db id 9c8a7e60946d42f6994d977b432398e1
NOTION_ERFOLGE_DB_ID=         # 32-char hex of the Erfolge (wins) database — relation -> Weekly Journal — db id 40f273bbe5714a589ce04feb0ecba6e0

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

# TMDB — Freizeit cover art (film/series posters)
TMDB_API_KEY=                 # TMDB API read access token (themoviedb.org, free) — resolves film/series posters for the Freizeit tab. Steam game covers need no key.

# Google Books — Bücher cover art (book covers)
GOOGLE_BOOKS_API_KEY=         # optional — Google Books volumes API key; only raises the daily quota. Empty is fine (keyless quota + OpenLibrary fallback need no key).

# App password gate (proxy.ts + /api/auth/login)
APP_PASSWORD=                 # the single password that unlocks the hub
SESSION_SECRET=               # >= 32 chars — seals the iron-session cookie
```

## PARA Data Model in Notion

Notion is the source of truth. These property names are exact and case-sensitive — the Notion API will silently return empty results if a property name is misspelled.

### Projects DB

| Property | Type | Notes | Edited from Business Hub? |
| --- | --- | --- | --- |
| Name | title | Project name | Yes — drawer (opens from any view) |
| Status | status | `Active` / `On Hold` / `Done` / `Archived` / `Nicht relevant` (+ the wider filter-only options `Backlog` / `In Progress` / `Later` / `Waiting`) — Notion `status` type (not `select`), uses `status: { equals: ... }` filter shape. The `Archived` option was added 2026-05-20; `Nicht relevant` (Complete group, case-sensitive) added 2026-06-13 for the Development tab's "not relevant" bucket. Setting Status to `Archived` from Business Hub does not edit the project in place — it triggers an immediate move to the Archive DB (metadata copied to /04 Archives, source page trashed). See the Archive automation section in Current Repo Status. | Yes — Table inline, Kanban drag-drop, drawer; Development-tab inline pill |
| Department | select | One of the values in `constants/departments.ts`. Renamed from `Area` on 2026-05-20 — the old name clashed with the Resources/Archive `Area` taxonomy. | Yes — Table inline, drawer |
| Priority | select | `High` / `Medium` / `Low` | Yes — Table inline, drawer |
| Outcome | rich_text | One-line definition of done | Read-only display in drawer; edit body in Notion |
| Next Action | rich_text | The very next physical action | Yes — Table inline, drawer |
| Due Date | date | Optional | Yes — Table inline, drawer |
| Estimated Minutes | number | Used by the time-block planner | No (display only in drawer) |
| Client | rich_text | Optional, free text — links project to Zoho client | No (display only in drawer) |
| Product | select | `Business Hub` / `EasyFinance` / `Familien-Stammbaum` — added for the Development tab (Tab 10) to bucket dev work per product. Values are case-sensitive and live in `constants/development.ts` (`PRODUCTS`). Read into `Project.product` (string \| null, additive — read without `requireProp`). Drives the product sections on `/development`. | No (set in Notion) |
| Dev Type | select | `Feature` / `Bug` / `Anpassung` — added for the Development tab to sub-group each product's dev items. Case-sensitive, in `constants/development.ts` (`DEV_TYPES`). Read into `Project.devType` (string \| null, additive). Drives the per-type sub-headings on `/development`. | No (set in Notion) |
| Created | (page metadata) | Read from `page.created_time` on the Notion page object, not a DB property | n/a |

### Inbox DB

| Property | Type | Notes |
| --- | --- | --- |
| Name | title | Raw capture text |
| Type | select | `Task` / `Idea` / `Reference` / `Someday` — set by Claude during classification |
| Routed To | rich_text | Target Area / Project / Resource — set by Claude |
| Processed | checkbox | Defaults false; Markus flips to true after review |

There is **no** `Captured At` property on the Inbox DB. Capture time is the page's system `created_time` (read from `page.created_time`); `listInboxEntries()` sorts FIFO via a `{ timestamp: "created_time" }` sort, not a property sort.

### Clients DB

Created manually by Markus in Notion (the integration does not create databases). The integration must be shared with the DB. `NOTION_CLIENTS_DB_ID` must point at the database (32-char hex from the database URL). For each client record, paste the Zoho `contact_id` into the **Zoho Contact ID** rich_text field — that field is the join key with the Zoho contact returned by `listActiveContacts()`. Without it, the row will not appear on the Clients tab.

| Property | Type | Notes | Edited from Business Hub? |
| --- | --- | --- | --- |
| Name | title | Client display name | No (edit in Notion) |
| Zoho Contact ID | rich_text | Paste Zoho `contact_id` here — join key with Zoho data | No (edit in Notion) |
| Industry | select | `E-Commerce` / `SaaS` / `Agency` / `Retail` / `Hospitality` / `Other` (see `INDUSTRIES` in [app/clients/_components/types.ts](app/clients/_components/types.ts)) | Yes — metadata grid |
| Employees | number | Headcount | Yes — metadata grid |
| Monthly Revenue | number | Client's own monthly revenue (€), for segmentation | Yes — metadata grid |
| Monthly Fee | number | What this client pays Markus per month (€). Read-only in BH; surfaced as a read-only row in the metadata grid. | No (edit in Notion) |
| Person | rich_text | Primary contact person at the client. Shown in the detail-panel header when set. | No (edit in Notion) |
| Status | select | Lifecycle marker on the Notion Clients DB (separate from Project Status). Drives the Tab 4 master-list **Status filter** (option list derived live from loaded data). Mapped to `clientStatus` in TS to avoid collision with Project-status terminology. | No (edit in Notion) |
| Call Notes Link | rich_text *(write path bug — see "Not yet built")* | Link to most-recent call notes (Notion page, Google Doc, etc.). Read path in [lib/notion.ts](lib/notion.ts) treats this as `rich_text` (the link is stored as plain text inside the rich_text content); the write path in `updateClientField` still sends `{ type: "url", url }`. Until the Notion DB schema is confirmed and one of the two paths is fixed, treat "save" success on this field as suspect. | Yes — metadata grid |
| Client Database Link | rich_text *(write path bug — see "Not yet built")* | Link to their shared workspace or folder. Same read/write type mismatch as Call Notes Link. | Yes — metadata grid |
| Dashboard Link | rich_text *(write path bug — see "Not yet built")* | EasyFinance or other dashboard URL. Same read/write type mismatch as Call Notes Link. | Yes — metadata grid |
| Tier | select | `Standard` (blue) / `Plus` (purple) / `Essential` (gray) — added 2026-05-22 to track which package the client purchased. Not yet read by Business Hub UI. | No (edit in Notion) |
| Acquisition Source | select | `Empfehlung` / `Facebook Ads` / `Instagram organic` / `Networking (Dubai)` / `Sales Coach (Sadin)` / `Other` — added 2026-05-22 to track acquisition channel. Foundation for future Marketing-Attribution. Not yet read by Business Hub UI. | No (edit in Notion) |

Page body = free-form notes (same block types as Projects). Rendered read-only via `<PageBodyRenderer />` in BH; edits happen in Notion.

### Call Notes DB

Created manually by Markus in Notion (the integration does not create databases). The integration must be shared with the DB. `NOTION_CALL_NOTES_DB_ID` must point at the database (32-char hex from the database URL). Pages are written by `/api/calls/create`, which is called by the external "Call Miner — Geldstruktur" Cowork skill, AND by `/api/calls/mine`, the in-app Calls tab (Tab 7) that analyses a pasted transcript and writes the same shape — both share `persistCallNote` in [lib/calls.ts](lib/calls.ts), so Business Hub owns the schema mapping under one roof. As of the Calls tab there IS a Business Hub UI for this DB (read via `/api/calls/list`).

| Property | Type | Notes | Edited from Business Hub? |
| --- | --- | --- | --- |
| Name | title | `[Call Type] — [Client/Prospect] — [YYYY-MM-DD]` | Written by `/api/calls/create` |
| Call Type | select | `Sales` / `Client` / `Coaching` / `Other` | Written by `/api/calls/create` |
| Date | date | Call date | Written by `/api/calls/create` |
| Client | relation → Clients DB | Empty for sales calls; populated via a Notion page id resolved **server-side** from a Zoho `contact_id` — never a client-supplied page id | Written by `/api/calls/create` |
| Duration | number | Minutes | Written by `/api/calls/create` |
| Outcome | select | Sales: `Won` / `Lost` / `Follow-up` / `Disqualified` · Client: `Healthy` / `At Risk` / `Upsell Opportunity` / `Issue Raised` · Coaching: `On Track` / `At Risk` / `Breakthrough` / `Action Needed` (`At Risk` is shared with the Client set — same string). The outcome family must match the call type (`outcome_type_mismatch` otherwise); Coaching calls accept only the Coaching outcomes. | Written by `/api/calls/create` |
| Engagement | select | `High` / `Medium` / `Low` | Written by `/api/calls/create` |
| Objections Count | number | Count of objections raised. Objections are Sales/Client-only; for Coaching calls a missing `objectionsCount` defaults to `0` and missing/empty `objectionsTags` to `[]`. | Written by `/api/calls/create` |
| Objections Tags | multi_select | `Pricing` / `Timing` / `Trust` / `Already has bookkeeper` / `Software/EasyFinance` / `Stripe/SEPA resistance` / `Other` | Written by `/api/calls/create` |

Page body = the structured call sections produced by the Call Miner skill, appended as paragraph blocks. The taxonomy lives in [constants/call-notes.ts](constants/call-notes.ts).

### Areas DB (created when Tab 5 builds)

To be defined when Tab 5 is built. Likely properties: Name (title), Current Milestone (rich_text), Next Steps (rich_text), Status (select: Active / Paused).

| Property | Type | Notes | Edited from Business Hub? |
| --- | --- | --- | --- |
| Kategorie | select | Über-category grouping for the Areas tab — `Business` / `Privat` / `Weiterbildung` (case-sensitive, must match `constants/area-categories.ts`). Read by `listAreas()` into `NotionArea.category` (defensive `asSelect`, null when unset); drives the collapsible category sections on the Areas page. | No (edit in Notion) |

### Weekly Journal DB + Erfolge DB (Tab 11 — read-only)

Two Notion DBs read by the Weekly Journal tab. Created manually by Markus in Notion; the integration must be shared with both. `NOTION_WEEKLY_JOURNAL_DB_ID` (db id `9c8a7e60946d42f6994d977b432398e1`) and `NOTION_ERFOLGE_DB_ID` (db id `40f273bbe5714a589ce04feb0ecba6e0`). Business Hub **never writes** to either — capture/edit stays in Notion. Mapped by the pure `mapWeek` / `mapErfolg` in [lib/journal.ts](lib/journal.ts).

**Weekly Journal** (one row per ISO week):

| Property | Type | Notes | Edited from Business Hub? |
| --- | --- | --- | --- |
| Name | title | e.g. `KW 23 - 01.06.2026 - 07.06.2026` | No (edit in Notion) |
| Woche (Start) | date | The **Monday** of the week — Business Hub's week identity key (matched against the ISO-week Monday) | No |
| Status | select | `Entwurf` / `Abgeschlossen` — `Abgeschlossen` clears the overdue banner for that week | No |

**Erfolge** (one row per win):

| Property | Type | Notes | Edited from Business Hub? |
| --- | --- | --- | --- |
| Name | title | The win | No (edit in Notion) |
| Kategorie | select | `Business` / `Privat` / `Weiterbildung` — the Journal-Kanban columns (`JOURNAL_KATEGORIEN`) | No |
| Area | select | Area tag (Marketing, Sales, Gym, Spanisch, Investment, Dancing, … 16 values) — drives the per-area timeline | No |
| Woche | relation → Weekly Journal | Assigns the win to a week (page id). The win↔week join (`erfolgeForWeek`) reads this relation. | No |
| Status | status | `Not started` / `In progress` / `Done` (a Notion `status` property, not a `select`) | No |

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
- **Mobile-first responsive (built 2026-06-06, commit `b4a7743`).** No minimum width: the `<main>` shell is `mx-auto w-full max-w-screen-2xl` with responsive padding (`px-4 py-4 sm:px-6 sm:py-6`). Every tab adapts down to phone width (stacked cards, drill-down master/detail, horizontally-scrollable strips). The earlier "desktop-first, min 1280px, mobile is a v2 concern" stance no longer holds — see "Mobile-first responsive layout" under Current Repo Status.

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
- TMDB — search & query (Freizeit film/series posters): https://developer.themoviedb.org/docs/search-and-query-for-details
- TMDB — image basics (poster URL construction): https://developer.themoviedb.org/docs/image-basics
- Steam Storefront search (Freizeit game covers, no API key): https://store.steampowered.com/api/storesearch/?term=<name>&cc=us&l=en
- Google Books — volumes search (Bücher cover art, optional key): https://developers.google.com/books/docs/v1/using
- OpenLibrary — Search API (Bücher cover fallback): https://openlibrary.org/dev/docs/api/search
- OpenLibrary — Covers API (Bücher cover URL construction): https://openlibrary.org/dev/docs/api/covers

### When to Fetch

> Fetch when: writing a new integration call, debugging an unexpected API error, generating example code with method names, or upgrading a library. Do NOT fetch for: trivial parameter tweaks where the signature is already verified, refactoring local code with no API surface change, styling, or generic Next.js/Tailwind patterns.

## Current Repo Status

Snapshot of what actually exists in the repo. Treat this as the single source of truth for "where are we right now" — update it as state changes.

**Bootstrap date:** 2026-05-15

**Deployment:** Hosted on **Railway**, which auto-deploys from the `main` branch on every push. All env vars (Notion / Google / Zoho / Supabase / Anthropic / `APP_PASSWORD` / `SESSION_SECRET`) are configured in the Railway project, not committed. After a push, the new client JS bundle only takes effect once the Railway deploy finishes — a one-time hard refresh in the browser clears the old cached bundle.

**Stack & scaffold:**
- Next.js 16.2.6 (App Router) + React 19.2.4 + TypeScript 5 + Tailwind v4 (PostCSS plugin, no `tailwind.config.js`).
- shadcn/ui with the **Nova preset** (`style: "radix-nova"`, `baseColor: "neutral"`, `iconLibrary: "lucide"`). Components in [components/ui/](components/ui/): `badge`, `button`, `card`, `dialog`, `input`, `select`, `separator`, `sheet`, `sonner`, `tabs`.
- Fonts: Geist Sans + Geist Mono via `next/font/google` (variables `--font-geist-sans` / `--font-geist-mono`, aliased to `--font-sans` / `--font-mono` in [app/globals.css](app/globals.css) `:root` so Tailwind v4's default `--font-sans: var(--font-sans)` self-reference is bypassed).
- Palette (blue/white/ink) tuned in [app/globals.css](app/globals.css) via OKLCH tokens on `:root`. Dark mode block exists but no `next-themes` provider mounted — light only at runtime.

**Dependencies installed:**
- SDKs: `@notionhq/client` ^5.21.0, `@anthropic-ai/sdk` ^0.96.0, `@supabase/supabase-js` ^2.105.4, `googleapis` ^171.4.0, `axios` ^1.16.1.
- View libs: `@tanstack/react-table` ^8.21.3, `@dnd-kit/core` ^6.3.1, `@dnd-kit/sortable` ^10.0.0, `@fullcalendar/{react,core,daygrid,timegrid,interaction}` all ^6.1.20.
- Utility libs: `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `next-themes` (only used by `components/ui/sonner.tsx`; no `ThemeProvider`), `sonner`, `radix-ui`, `lucide-react` ^1.16.0, `react-markdown` ^10.1.0 (renders the daily-briefing markdown on `/digest`), `diff` ^9.0.0 + `@types/diff` ^7.0.2 (server-side unified diff for `/api/roadmap/draft`), `iron-session` ^8.0.4 (seals the `bh_session` cookie for the app-wide password gate; Edge-compatible via iron-webcrypto).

**Secrets & external systems:**
- `.env.local` populated with Notion, Google, Zoho, Supabase, Anthropic secrets (not committed). Notion DB IDs populated: `NOTION_PROJECTS_DB_ID`, `NOTION_INBOX_DB_ID`, `NOTION_CLIENTS_DB_ID`, `NOTION_AREAS_DB_ID`, `NOTION_RESOURCES_DB_ID`.
- PARA structure in Notion with Projects + Inbox databases (IDs in `.env.local`).
- Supabase project provisioned; `supabase/migrations/` directory exists with six migrations (`20260515120000_google_oauth_tokens.sql`, `20260516120000_briefings.sql`, `20260517120000_briefings_append_only.sql`, `20260518120000_time_block_suggestions.sql`, `20260519120000_user_settings.sql`, `20260520120000_client_template_overrides.sql`) and `MIGRATION_LOG.md`. Tables in Supabase: `google_oauth_tokens`; `briefings` (date, kind 'daily'|'weekly', summary, model, input_hash, expires_at; append-only history, latest row per (date, kind) is the current briefing; lookup index on (date, kind, created_at desc)); `time_block_suggestions` (date, project_name, start_at, end_at, rationale, status 'pending'|'confirmed'|'dismissed', google_event_id, batch_id; append-only history, UI surfaces today's pending rows ordered by start_at; lookup index on (date, status, created_at desc)); `user_settings` (user_key pk, timezone default 'Asia/Dubai', master_calendar_id nullable, task_type_windows jsonb default '[]', updated_at; seeded with one row `user_key='markus'` via ON CONFLICT DO NOTHING); `client_template_overrides` (id uuid pk, zoho_contact_id, template_key, custom_text, created_at, updated_at; UNIQUE (zoho_contact_id, template_key); index on zoho_contact_id — persists per-client WhatsApp template overrides for Tab 4; backend-only in this build, no UI consumer yet). **Migrations must be run manually by Markus** (Supabase Dashboard SQL editor or `supabase db push`).
- Scripts: [scripts/create-areas-db.mjs](scripts/create-areas-db.mjs) bootstrapped the Notion Areas DB (one-shot). [scripts/migrations/](scripts/migrations/) holds Notion-side schema migrations as one-off TypeScript scripts: `2026-05-20-rename-projects-area-to-department.ts` (Projects DB `Area` → `Department`) and `2026-05-20-add-projects-status-archived.ts` (added the `Archived` option to Status). These are Notion migrations (not Supabase) — runtime is `tsx`/`bun`; run manually by Markus when surfaced in a prompt.

**App layout & i18n:**
- Top nav with 10-tab switcher (`Projects`/`Development`/`Digest`/`Calendar`/`Clients`/`Areas`/`Resources`/`Calls`/`Freizeit`/`Bücher`) + DE/EN `LocaleToggle` (DE default, persisted as `bh.locale` in localStorage) + Google "Connect" affordance (visible only when not connected) + avatar that links to `/profile`. The top nav listens for the `bh:google-status-changed` window event so the Connect button reappears immediately after a disconnect from `/profile` without a reload.
- Solo-user identity (email / initials / display name) lives in [constants/user.ts](constants/user.ts) — display only, never used for auth.
- All UI strings in [constants/translations.ts](constants/translations.ts).
- **Mobile-first responsive layout (2026-06-06, commit `b4a7743`).** The global `min-w-[1280px]` was removed from the `<main>` shell in [app/layout.tsx](app/layout.tsx) — it is now `mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 sm:py-6` (responsive padding, no minimum width). A `.no-scrollbar` utility was added in [app/globals.css](app/globals.css) (`@layer utilities`) for horizontally-scrollable strips. Responsive behaviour was applied across all tabs: TopNav tab strip scrolls horizontally / wraps on mobile; Projects table → stacked cards on mobile (kanban → horizontal snap-scroll, calendar grid stacks); Clients → master/detail drill-down with a back button on mobile (see Tab 4); Calendar tab → scoped mobile FullCalendar CSS; Resources/Areas/Digest/Profile → responsive filters/inputs; all drawer meta grids stack label/value on mobile. A `MOBILE_AUDIT.md` was added at the repo root documenting the audit. The mobile version is a fully built, supported surface — **not** out of scope and **no longer deferred**; the UI/Design → Layout section and the Deferred Features list were updated accordingly (2026-06-07).

**Library files (server-only marked with `import "server-only"`):**
- [lib/notion.ts](lib/notion.ts) — `listActiveProjects`, `listProjectsForViews()` (loads the union of all `PROJECT_VIEW_STATUSES` via an `or`-of-`status.equals` filter — the superset the Projects tab's named views filter down client-side; same projection/mapping as `listActiveProjects`, which stays Active-only for Calendar/Areas/Digest), `listProjectsByStatus(status)` (parameterised twin of `listActiveProjects`; returns `Project` + `lastEditedTime` as `ProjectByStatus[]`; consumed by `/api/roadmap/draft`), `updateProjectField` (6 fields: Status, Priority, Name, Department, Due Date, Next Action), `createProject`, `createClientProject` (Projects-DB create with explicit `Client` rich_text — used by `/api/clients/[zohoId]/generate-tasks`), `listProjectsByClient(clientName)` (Projects DB filtered by `Client` rich_text contains), `getPageBlocks` (one-level child recursion), `appendTextBlocks(pageId, text)` (splits text on newline into paragraph blocks; batches at 100 children/append to honour Notion's children-per-call cap), `pingNotion` (health check via `users.me()`), `fetchSelectOptions(propertyName)` (reads the Projects data source schema via `notion.dataSources.retrieve` and returns the options of a `select` OR `status` property, each option carrying its `color` — returns `null` when the property is missing or of another type), `listNotionClients` (reads the Clients DB via its own cached `data_source_id` — fails loudly when `NOTION_CLIENTS_DB_ID` is unset), `getClientPageBlocks(pageId)` (thin alias over `getPageBlocks`), `updateClientField(pageId, field, value)` (6 client fields: Industry select, Employees + Monthly Revenue numbers, three URL fields — *write path sends `{ type: "url", url }` but the Notion schema is rich_text per the read path; mismatch is tracked in "Not yet built"*), `listResources()` + `createResource(draft)` (Resources DB; module-level `resourcesDataSourceId` cache mirroring the Projects/Clients/Areas pattern; the `Confidence` property is shape-agnostic — extractor probes `select`/`number`/`rich_text`/`formula` and stringifies whichever is present), `getResourcePageBlocks(pageId)` (thin alias over `getPageBlocks` — used by the Resources drawer's lazy-fetch), `fetchResourceSelectOptions(propertyName)` (the Resources-data-source twin of `fetchSelectOptions` — returns a `select`/`status` property's options with colours; powers `/api/resources/options`), `createCallNote(draft)` (creates a page in the Call Notes DB via `notion.pages.create` on a lazily-cached `callNotesDataSourceId`; appends `body` as paragraph blocks when present — non-fatal on failure; throws `call_notes_not_configured` when `NOTION_CALL_NOTES_DB_ID` is unset), `listCallNotes(limit=25)` (reads the most recent Call Notes via the same `callNotesDataSourceId` cache + `dataSources.query` pattern, Date desc; projects `id`/`name`/`callType`/`date`/`outcome`/`notionUrl` as `CallNoteSummary[]`; powers `/api/calls/list`), and the Phase 2 archive helpers `createArchiveEntry(payload)` / `archiveProjectPage(pageId, { reason? })` / `archiveResourcePage(pageId, { reason? })` (each retrieves the source page, maps the relevant properties, creates the Archive entry on a lazily-cached `archivesDataSourceId`, then trashes the source via `pages.update({ in_trash: true })`; partial-failure handling logs both ids and throws — no rollback). Exports `Project`, `ProjectByStatus`, `ProjectDraft`, `UpdateField`, `NotionBlock`, `NotionRichText`, `NotionAnnotations`, `SelectOption`, `NotionClient`, `ClientUpdateField`, `NotionArea`, `AreaUpdateField`, `NotionResource`, `ResourceDraft`, `CallNoteDraft`, `CallNoteSummary`, `ArchivePayload`, `ArchiveResult` types. The `notion` Client instance is module-private — all callers go through the exported helpers above.
- [lib/calls.ts](lib/calls.ts) — **CREATED.** Shared Call Notes write path. `persistCallNote(input)` holds all the field validation, the server-side Zoho-`contact_id`→Notion-page resolution, and the `createCallNote` write — extracted from the old `/api/calls/create` inline body so `/api/calls/create` and `/api/calls/mine` share one validator. Throws `CallNoteError` (carries the wire `code` + HTTP `status`) for every coded failure (`missing_name`, `invalid_call_type`, `invalid_date`, `invalid_duration`, `invalid_outcome`, `outcome_type_mismatch`, `invalid_engagement`, `invalid_objections_count`, `invalid_tag`, `invalid_body`, `invalid_client_zoho_id`, `not_configured` 503, `notion_not_linked` 404). Coaching defaults (`objectionsCount=0`, `objectionsTags=[]`) preserved. Exports `CallNoteError`, `PersistCallNoteInput`.
- [lib/call-miner-prompt.ts](lib/call-miner-prompt.ts) — **CREATED.** The Calls-tab analysis prompt. `CALL_MINER_SYSTEM_PROMPT` (strict-JSON system prompt: detect Sales/Client/Coaching/Other, the full result schema, outcome must match the call-type set, Sales/Client = 6 Markdown sections / Coaching = 3 + count 0 / tags [], no em-dashes in body prose, language = transcript's with DE default, names never in social sections) + `buildCallMinerUserContent({transcript, date?, callTypeHint?, clientName?})` (injects transcript + today's date as the model default + optional hints). Exports `CallMinerResult`, `BuildCallMinerInput`. No new Anthropic helper — the route reuses `roadmapDraft()`.
- [lib/notion-areas.ts](lib/notion-areas.ts) — **CREATED (2026-06-07).** Server-only helpers for the **Areas versioning + review** workflow. Instantiates a **second** `@notionhq/client` against the same `NOTION_TOKEN` (the base client in `lib/notion.ts` is module-private — same pattern the archive-sweep route uses; not a second auth). `extractPageId(urlOrId)` (pulls the page id out of a Notion URL/id, returns it dashed — strips query/hash/trailing slashes, removes dashes, then **end-anchors** the match with `/[0-9a-fA-F]{32}$/`. **Fixed 2026-06-07:** the old first-match-then-last `/[0-9a-fA-F]{32}/g` logic returned a corrupted, left-shifted UUID when a hex-like slug tail fused onto the id after dash-removal — e.g. `…/Accounting-v3-<id>` → `…v3<id>` or `…-Juni-2026-<id>` → `…2026<id>` produced one >32-char hex run; end-anchoring takes the true last-32 id. This had caused `archive_previous_failed` / `archive_project_failed` warnings on real URLs, so old versions + Done projects were never archived), lazily-cached `areasDataSourceId` + `projectsDataSourceId`, a minimal `markdownToBlocks` converter (`## ` → heading_2, `- ` → bulleted_list_item, else paragraph; capped at 100 children — richer than `appendTextBlocks`, which is paragraph-only), `createAreaVersion(name, props, bodyMarkdown?)` (creates a new Area page with `Archived=false`, returns `{ id, url }`), `archiveAreaPage(urlOrId)` (sets `Archived=true` checkbox), `archiveProject(urlOrId)` (writes the Projects `Status` (a `status` property) to `Archived` **directly** — does NOT route through `/api/projects/update`, so no Archive-DB copy; the Phase-3 sweep reconciles later), `listAreas()` (paginates the **full** Areas DB **including** archived rows — unlike `lib/notion.ts`'s `listAreas()` which excludes them), `listProjectsForReview()` (lists every project with the fields the review diff needs, incl. the custom `Created by` select whose `AI` option flags AI-created projects), `createAreaProject({ name, department, dueDate? })` (additive — creates a Projects-DB page on the cached `projectsDataSourceId` for the review wizard's manual "new projects" panel: `Status="Active"` + `Priority="Medium"` from [constants/priorities.ts](constants/priorities.ts) (`STATUSES[0]` / `PRIORITIES[1]`), `Department=<area base>`, `Due Date` only when `dueDate` is set; no assumption about other properties; returns `{ id, url }`). Exports `AREA_STATUSES` (`Active`/`Needs Attention`/`Paused`) + `AreaStatus`, `AreaVersionProps`, `AreaSummary`, `ReviewProject` types.
- [lib/zoho.ts](lib/zoho.ts) — Zoho Books v3 client. Module-private `getZohoAccessToken()` refreshes via `accounts.zoho.com/oauth/v2/token` (refresh-token grant) and caches the access token in a module-level `{ token, expiresAt }` with a 5-min refresh buffer. `listActiveContacts()` cross-references active customers with invoices in the last 12 months (returns the intersection — see Tab 4 spec). `getContactInvoices(contactId)` fans out across `unpaid` / `overdue` / `partially_paid` statuses (Zoho's `status` filter accepts a single value), dedupes by `invoice_id`, and sorts most-recent first. `getContactLifetimeTurnover(contactId)` sums `total` across all invoices for the contact, cached 10 min per contact. `pingZoho()` hits `/organizations` (validates both token + `organization_id`). All calls pass `organization_id` via `ZOHO_ORG_ID` env (CLAUDE.md Critical Version Warnings). US data center only (`accounts.zoho.com` / `zohoapis.com`). Exports `ZohoContact`, `ZohoInvoice` types.
- [lib/supabase-server.ts](lib/supabase-server.ts) — `supabaseServer()` factory using service role key.
- [lib/google.ts](lib/google.ts) — Module-private `getOAuthClient` (used only inside this file); exported `getAuthUrl`, `exchangeCodeForTokens`, `getAccessToken` (auto-refresh within 5 min of expiry; throws `Error("google_invalid_grant")` when the refresh-token grant comes back `invalid_grant` — i.e. the token was revoked, so callers can surface a reconnect prompt), `getAuthorizedCalendarClient`, `listCalendars` (calendarList.list → `{ id, summary, primary }[]`), `getPrimaryBusy(timeMin, timeMax, calendarId?)` (freebusy.query against the given calendar, default `'primary'`, returns `BusyInterval[]`), `createBlock(summary, startIso, endIso, calendarId?)` (inserts an event into the given calendar, default `'primary'`, returns `{ id, htmlLink }`), `listEvents(calendarId, start, end)` (events.list with `singleEvents:true` + `orderBy:'startTime'`, returns `CalendarEvent[]` with id/summary/description/start/end/htmlLink/colorId), `createEvent(calendarId, payload)` (events.insert; stores `notionProjectId` in `extendedProperties.private` when provided, returns `{ id, htmlLink }`), `updateEvent(calendarId, eventId, patch)` (events.patch with summary/description/start/end), `deleteEvent(calendarId, eventId)` (events.delete, void), `isGoogleConnected`, `disconnectGoogle`. Tokens persisted to `google_oauth_tokens` (`user_key='markus'`).
- [lib/anthropic.ts](lib/anthropic.ts) — Module-private `anthropic` client + exported `briefing(prompt, system?)` (Sonnet, max_tokens 2048) + `roadmapDraft(systemPrompt, userContent)` (sibling of `briefing()` for the roadmap-update task — Sonnet at `max_tokens` 16384, used by `/api/roadmap/draft`; same response shape so `extractText()` works on it) + `classify(prompt, system?)` (Haiku-targeted variant of `briefing()` — same response shape, `MODELS.CLASSIFY`, max_tokens 512; used by the Areas focus route and future classification tasks) + `pingAnthropic()` (1-token Haiku call for health check; caller must cache — see `/api/profile/status`) + `extractText(response)` (unwraps an Anthropic `messages.create` response into trimmed plain text by concatenating every text-typed content block — shared by both digest routes and the roadmap-draft route). Model IDs read from [constants/models.ts](constants/models.ts).
- [lib/settings.ts](lib/settings.ts) — `getUserSettings()` returns the 'markus' row with safe defaults (Asia/Dubai TZ, no master calendar, empty windows) when row or table is missing. `updateUserSettings(patch)` validates timezone via `Intl.supportedValuesOf('timeZone')` (with fallback to `Intl.DateTimeFormat` construction probe), validates each `TaskTypeWindow` (`start_hour < end_hour`, both 0–23), and upserts. Exports `UserSettings`, `UserSettingsPatch`, `TaskTypeWindow` types. The digest routes and the calendar routes read from this lib for timezone and `master_calendar_id ?? 'primary'`; per-task-type windows remain a future hook-up.
- [lib/i18n.tsx](lib/i18n.tsx) — `LocaleProvider`, `useLocale`, `useT`, `t` helper.
- [lib/tz.ts](lib/tz.ts) — Shared timezone math: `todayInTz(timezone)` (YYYY-MM-DD in the given zone from "right now"), `tzOffsetMs(at, timezone)` (the zone's offset from UTC in ms at the given instant, DST-aware), `localHourToIso(date, hour, timezone)` (UTC ISO for a local-hour boundary on a date), `isInCurrentMonth(iso)` (UTC-month membership check). Replaces the previously duplicated helpers in the digest routes and the per-client month filter. Server-only.
- [lib/utils.ts](lib/utils.ts) — shadcn's `cn()` helper (clsx + tailwind-merge). Imported by every component that conditionally composes class names.

**Route handlers (all server, never return tokens to client):**
- `/api/projects/update`, `/api/projects/create`, `/api/projects/blocks` — Notion updates / page creation / page-body fetch. `create` accepts an optional `body: string`; when non-empty it splits on newline and appends paragraph blocks via `appendTextBlocks` after the page is created. The append step is non-fatal — a failure logs `append_blocks_failed` but the route still returns the created project. **Status validation (2026-06-07):** the per-field validation in `update` checks an incoming `Status` value against `PROJECT_VIEW_STATUSES` ([constants/project-views.ts](constants/project-views.ts) — the union of all named-view statuses: Active / In Progress / Later / Backlog / On Hold / Waiting / Done), **not** the narrow `STATUSES` from `constants/priorities.ts`. The Table status cell offers every live Notion option via `/api/projects/options`, so validating against the narrow union previously rejected `Backlog`/`In Progress`/`Later`/`Waiting` with `400 value_not_in_enum` (client showed "Aktualisierung fehlgeschlagen" + revert). `Priority` still validates against `PRIORITIES`, `Department` against `DEPARTMENTS`. `Archived` is intentionally NOT in `PROJECT_VIEW_STATUSES` and is caught by the archive intercept above the validation.
- `/api/resources` (`GET`) — calls `listResources()`, returns `{ ok: true, resources }`. 503 `not_configured` when `NOTION_RESOURCES_DB_ID` is unset.
- `/api/resources/create` (`POST`) — body `{ name, area?, type?, body? }`. Validates and calls `createResource`. Returns 503 / 500 / 400 as appropriate.
- `/api/resources/[id]/blocks` (`GET`) — returns `{ ok: true, blocks }` from `getResourcePageBlocks(id)`. 400 on missing id, 500 on Notion error. Powers the lazy-fetch in `ResourceDrawer`.
- `/api/areas/focus` (`GET`) — reads `roadmap.md` from the filesystem via `fs.readFileSync(path.join(process.cwd(), "roadmap.md"))`, calls Haiku (`classify()`) with a strategic-advisor system prompt + today's date prepended, returns `{ summary, generatedAt, cached }`. Module-level in-memory cache (1h TTL); `?bust=<ts>` query param bypasses the cache for the Refresh button. Soft-fails to `{ summary: null, error: "roadmap_not_found" | "generation_failed" }` with 200 (never 5xx) so the FocusHeader degrades gracefully.
- `/api/areas/manage` (`GET`) — lists **every** Area page (including archived ones) via `listAreas()` from [lib/notion-areas.ts](lib/notion-areas.ts), sorted live-first then most-recent-created. Distinct from `/api/areas` (which excludes archived rows + adds project counts). 503 `areas_not_configured` when `NOTION_AREAS_DB_ID` is unset, 500 on Notion error. Powers the `/areas/manage` surface.
- `/api/areas/version` (`POST`) — atomic-ish version bump. Body `{ newVersionName, previousVersionUrl?, properties?, body?, archiveProjectUrls? }`. (1) `createAreaVersion` (hard-fail → 500, nothing archived); (2) `archiveAreaPage(previousVersionUrl)` (non-fatal → `warnings[]`); (3) `archiveProject(url)` per related project (non-fatal, per-item → `warnings[]`). Validates `newVersionName` non-empty (`missing_new_version_name`), `properties.status` against `AREA_STATUSES` (`invalid_status`), body string (`invalid_body`), `archiveProjectUrls` array (`invalid_archive_project_urls`). 503 `not_configured` when the env var is unset. Returns `{ ok, id, url, warnings }`.
- `/api/areas/archive` (`POST`) — body `{ url }` or `{ urls: [] }`. Sets `Archived=true` on each Areas-DB page via `archiveAreaPage`; per-item failures are collected (never fails the whole batch). 400 `no_urls` / `invalid_json`, 503 `not_configured`. Returns `{ ok, archived: string[], failed: { url, error }[] }`.
- `/api/areas/review/diff` (`POST`) — reads every **live** (Archived=false) area + all projects (`listAreas()` + `listProjectsForReview()` in parallel), groups projects by `Department` (the only area↔project link), and per area computes `doneProjects` (Status=Done) / `newProjects` (created after the area page **or** `Created by = AI`) / `ongoingProjects`, plus `questions` (`questionsForArea(base)`) and a `skippable` flag (0 done + 0 new). Areas with movement sort first. 503 `not_configured` (needs both Areas + Projects DB ids), 500 on error. Returns `{ ok, areas: AreaReviewState[] }` (the `AreaReviewState` type is exported and imported by the wizard).
- `/api/areas/review/draft` (`POST`) — body `{ area, diff, answers }`. Calls Sonnet via `roadmapDraft()` with a German strict-JSON system prompt (drafts `properties` + a Markdown `body` with fixed sections Standard / Accomplishments / Blocker / Connected Projects / Notes; Done projects roll into dated `✅` bullets, no em-dashes). **Cumulative Accomplishments (2026-06-07):** before the Sonnet call the route reads the previous version's live page body once via `getAreaPageBlocks(area.id)` ([lib/notion.ts](lib/notion.ts)) and parses the existing `## Accomplishments` bullets (collects `bulleted_list_item` plain-text from the `Accomplishments` `heading_2` until the next `heading_2`, dropping empties); these are injected into the prompt as a `BESTEHENDE ACCOMPLISHMENTS` block and the system prompt instructs the model to carry them **verbatim** first, then append the new Done projects **without name-duplicates**. The body read is a **soft-fail** — a missing `area.id` or a fetch error just `console.warn`s and proceeds without carry-forward (no 500). Archived versions stay untouched snapshots. **Milestone choice (2026-06-07):** the route reads `ans.milestone_status` (`keep` | `reached` | `adjust`, default `keep`). `keep` carries `area.currentMilestone` forward **unchanged** (no Accomplishments entry); `reached` / `adjust` set `properties.currentMilestone` to the entered `ans.milestone` (falling back to the current one if blank). On `reached` **and** a non-empty current milestone, the prompt gets an `ERREICHTER MEILENSTEIN` block (`🏁 Meilenstein erreicht: <old> (<reviewDate>)`) and the Accomplishments system rule adds that bullet verbatim (after existing bullets, before new Done projects; no duplicates); `keep` / `adjust` add no such bullet. Parses defensively (`parseModelJson` strips ```json fences + slices the first `{...}`; 502 `parse_failed` with raw echoed; 200 soft-fail `generation_failed` on Anthropic error). **The version number (`bumpVersion` → `(vN+1)`/`(v2)`), `previousVersionUrl`, and `archiveProjectUrls` are computed server-side, not trusted to the model** — only `properties` + `body` come from the LLM; user answers (status/milestone/health/milestone_due) override the model for the deterministic fields. Returns `{ ok, payload }` shaped exactly for `/api/areas/version`.
- `/api/projects/suggest` (`POST`) — body `{ project: ProjectContext, context: string }`. Gathers area milestone / next steps from `listAreas()` + upcoming Google Calendar events (if connected, 7-day window) in parallel via `Promise.allSettled` (both lookups best-effort). Calls Sonnet (`briefing()`) with a strict-JSON system prompt requesting `{ "steps": ["..."] }` (3–5 entries, ≤15 words each). Returns `{ ok: true, steps: string[] }`. Defensive JSON parse: direct `JSON.parse` first, falling back to slicing the first `{...}` block if the model wrapped JSON in prose; 502 `parse_failed` (with raw output echoed) on parse failure; 200 soft-fail `generation_failed` on Anthropic error.
- `/api/projects/options` — `GET` returns `{ status: SelectOption[], department: SelectOption[] }` by calling `fetchSelectOptions("Status")` + `fetchSelectOptions("Department")` in parallel. Options include each entry's Notion `color` so the table can paint the Status/Department badge with a matching left-border accent.
- `/api/development` — `GET` returns `{ ok: true, projects }` from `listDevelopmentProjects()` (Projects DB filtered to `Department=Development`, all statuses). 503 `not_configured` when `NOTION_PROJECTS_DB_ID` is unset, 500 `list_failed` on a Notion throw. Powers Tab 10. See Tab 10 (Development).
- `/api/google/connect` — 302 to Google consent URL (scope: `auth/calendar`, `access_type=offline`, `prompt=consent`).
- `/api/auth/callback/google` — OAuth callback; exchanges code, persists tokens, redirects to `/settings/google-connected` (or `/settings/google-error?reason=…`). The redirect base is derived from `new URL(process.env.GOOGLE_REDIRECT_URI).origin`, **not** from `new URL(req.url).origin` — behind the Railway reverse proxy the request origin resolves to the internal bind address (`http://0.0.0.0:8080`), which would send the browser to an unreachable host (`ERR_CONNECTION_REFUSED`) even though the token was already saved. Falls back to the request origin via try/catch when `GOOGLE_REDIRECT_URI` is unset/invalid (local dev).
- `/api/google/status` — `{ connected: boolean }`. Returns `false` if the table doesn't exist yet (pre-migration safety).
- `/api/digest/daily` — **locale-aware** (2026-06-07). `GET ?locale=de|en` (default `de`) returns the most recent daily briefing for today in that locale or 204; `POST` accepts `locale` ('de'|'en', default 'de') in the body, looks up the most recent row for today + that locale (date, 'daily', locale, order by created_at desc, limit 1) and returns it as cached when `input_hash` matches and `?force=true` is absent, otherwise generates a fresh briefing from Active projects (Notion) + today's Google Calendar events (if connected, read from `master_calendar_id ?? 'primary'`) and `INSERT`s a new row (no upsert — `briefings` is append-only) with `locale`, sha256 `input_hash` (locale is part of the hashed inputs), and end-of-day `expires_at` in `settings.timezone`. The entire briefing — prose AND the three H2 section titles — is generated in the target language (DE → "Fokus heute" / "Überfällig / dringend" / "Aufschieben"; EN → "Focus today" / "Overdue / urgent" / "Defer") via a per-locale system prompt. Each locale is a distinct cache entry (new `briefings.locale` column, migration `20260607120000_briefings_locale.sql`), so toggling DE↔EN reuses each language's cache instead of re-running Sonnet. Both date and `expires_at` are derived from `getUserSettings().timezone`.
- `/api/digest/timeblocks` — **multi-day planner (default 5-day, max 7-day forward horizon)** as of 2026-06-06. `GET` returns all pending suggestions whose `start_at` is in the future (`start_at >= now`) and whose `date` is within the horizon (`date <= today+6`), ordered by `start_at` asc (today resolved in `settings.timezone`). `POST` requires Google connected (409 `google_not_connected` if not). It accepts an optional body `{ horizon_days }` clamped to **1–7** (`DEFAULT_HORIZON_DAYS = 5`, `MAX_HORIZON_DAYS = 7`). The workday window is derived from `settings.task_type_windows` via `resolveWorkdayHours`: when any windows are configured the window is the **union** across all entries (min `start_hour`, max `end_hour`); otherwise it falls back to **09:00–18:00**. The route iterates each day in the horizon: only today's window start is clamped to `now` (later days use the full window), days whose window has already passed are dropped (`days_skipped` reason `workday_past`). For each remaining candidate it fetches freebusy + events (`listEvents`) in parallel on `master_calendar_id ?? 'primary'`, derives free intervals, and **drops any day with less than `MIN_FREE_MINUTES_PER_DAY = 60` of total free time** (`days_skipped` reason `insufficient_free_time`). If no day survives, returns **409 `no_viable_days`** with the `days_skipped` array. Sonnet is then called **once for all viable days** with the multi-day strict-JSON prompt (`SYSTEM_PROMPT_MULTI`, schema `{ days: [{ date, work_day, suggestions: [{ project_name, start, end, rationale }] }] }`): the model also classifies each day's `work_day` boolean (false for travel/family/holiday/full-day-personal days — those become `days_skipped` reason `non_work_day` and are not persisted). Per work day: **1–4 blocks**, 25–90 min, inside that day's free intervals, sorted ascending and truncated to 4 if the model overshoots. Parsed defensively via `parseMultiDay` (502 on parse failure with raw output echoed; strips an optional ```json fence and slices the first `{...}` block as a second safety net; rejects `end <= start`). Hallucinated dates not in the viable set are ignored. **The daily briefing summary is no longer read as context** (the prior `readLatestBriefingSummary` helper was removed). One row per suggestion is inserted, **one `batch_id` per day**. The response is `{ suggestions, timezone, days_processed, days_skipped, model }` (the old single top-level `batch_id` field is gone). Per-day blocks are logged (`[timeblocks] date=… tz=… blocks=N`). The row shape (`SuggestionRow`) and the Supabase column list (`ROW_COLS`) live in [app/api/digest/timeblocks/_lib.ts](app/api/digest/timeblocks/_lib.ts) and are imported by this route plus the two `[id]/...` sibling routes — single source of truth for the table shape across all three.
- `/api/digest/timeblocks/[id]/confirm` — only valid when row is `pending`; inserts a Google Calendar event on `master_calendar_id ?? 'primary'` (`summary` = project name), stores `google_event_id`, transitions to `confirmed`. Returns 502 on Google insert failure, 409 on race (row not pending). Imports `SuggestionRow` + `ROW_COLS` from `../../_lib`.
- `/api/digest/timeblocks/[id]/dismiss` — transitions a pending row to `dismissed`. No calendar write. 409 if not pending. Imports `SuggestionRow` + `ROW_COLS` from `../../_lib`.
- `/api/calendar/events` — `GET ?start=ISO&end=ISO` returns `{ events: CalendarEvent[] }` for the visible range from `master_calendar_id ?? 'primary'`. `POST` creates a Google event (body: `{ summary, description?, start, end, notionProjectId? }`) and returns `{ event: { id, htmlLink } }`. Both require Google connected (409 `google_not_connected` if not). When the stored refresh token has been revoked the `GET` returns **409 `google_invalid_grant`** (surfaced by the upstream `getAccessToken` throw) so the UI can prompt a reconnect.
- `/api/calendar/events/[id]` — `PATCH` updates an event with any subset of `{ summary, description, start, end }`; `DELETE` removes the event (204). Both require Google connected.
- `/api/clients` — `GET` returns `{ clients: MergedClient[] }`. Calls `listNotionClients()` + `listActiveContacts()` in parallel, joins on `Zoho Contact ID === contact_id`, returns one row per Zoho contact (Notion-only records without a Zoho match are dropped). Each row includes Notion-side metadata (`industry`, `employees`, `monthlyRevenue`, `monthlyFee`, `person`, `clientStatus`, `callNotesLink`, `clientDatabaseLink`, `dashboardLink`, `notionPageId`, `notionUrl` — all nullable when no Notion record is linked) plus Zoho-side amounts (`outstandingAmount`, `unusedCredits`) and a cheap `hasOutstanding` flag. Sorted default by outstanding-desc then name-asc. If `NOTION_CLIENTS_DB_ID` is missing or the Notion DB is unreachable, the route logs and returns the Zoho-only view instead of failing (UI surfaces empty Notion fields per row).
- `/api/clients/[zohoId]` — `GET` returns `{ zohoContactId, notion, notionBlocks, invoices, lifetimeTurnover, monthlyTasks, templateOverrides }`. Resolves the matching Notion record first; uses its `name` to filter Projects DB rows for this month (created in current month or due in current month). Invoices, lifetime turnover, this-month projects, Notion page blocks, and the per-client `templateOverrides` map (from Supabase `client_template_overrides`) are fetched in parallel via `Promise.allSettled` — a single upstream failure (Zoho rate-limit, Notion 5xx, missing override table pre-migration) leaves the rest of the payload intact. `templateOverrides` falls back to `{}` when the override table is missing (PGRST205/42P01) so the route degrades gracefully pre-migration. **Note:** the `templateOverrides` field is fetched but no UI currently consumes it — see "Not yet built".
- `/api/clients/[zohoId]/generate-tasks` — `POST` with `{ clientName }`. Filters existing Projects-by-client to current-month rows, computes which of `MONTHLY_TASK_NAMES` are missing, creates one Notion page per missing name (`Status=Active`, `Department=Fulfillment`, `Priority=Medium`, `Due Date=last calendar day of this month`). Returns 409 `tasks_exist` when all four already exist this month. Body: `{ created: string[], skipped: string[] }`.
- `/api/clients/[zohoId]/notion` — `PATCH` with `{ field, value }`. Validates `field` is one of the six editable client fields, validates `value` per field type (string-or-null for Industry / URL fields, number-or-null for Employees / Monthly Revenue). Re-resolves the Notion `pageId` from the Zoho contact ID server-side (never trusts a client-supplied pageId), then calls `updateClientField`. Returns 404 `notion_not_linked` if no Notion record matches. *(The three "URL" fields write as Notion `url` type but the read path expects `rich_text` — see "Not yet built".)*
- `/api/clients/[zohoId]/templates` — Per-client WhatsApp template overrides backed by Supabase `client_template_overrides`. `GET` returns `{ overrides: Record<template_key, string> }`; `PUT` body `{ template_key, custom_text }` validates `template_key` against `MONTHLY_TASK_NAMES` and upserts on `(zoho_contact_id, template_key)`; `DELETE ?template_key=<name>` removes a single override. Returns `{ overrides: {} }` / `503 migration_not_run` / no-op success when the migration hasn't been applied yet (PGRST205/42P01). **Backend only — no Tab 4 UI consumes the overrides yet; see "Not yet built".**
- `/api/google/disconnect` — `POST` removes the stored token row via `disconnectGoogle()` so the OAuth flow can be re-run from scratch. Surfaced from the `/profile` Google card.
- `/api/profile/status` — `POST` runs every integration health check in parallel via `Promise.allSettled` and returns `{ notion, google, zoho, anthropic, supabase }` keyed by integration with `{ status: 'connected'|'error'|'not_configured'|'never_connected', message?, checkedAt }`. Anthropic check is cached in a module-level variable for 10 min (success AND error) to avoid burning API calls on every page load. Zoho check calls `pingZoho()` (GET `/organizations`) when all four Zoho env vars are set; falls back to `not_configured` if any are missing.
- `/api/profile/settings` — `GET` returns `{ settings }` for `user_key='markus'` (falls back to defaults if the row or table is missing). `PATCH` accepts any subset of `{ timezone, master_calendar_id, task_type_windows }`, validates via `lib/settings.updateUserSettings`, upserts, and returns the persisted row. 400 on validation failure (e.g. `invalid_timezone`, `start_not_before_end`).
- `/api/profile/calendars` — `GET` requires Google connected (409 `google_not_connected` if not), calls `listCalendars()` and returns `{ calendars: [{ id, summary, primary }] }`.
- `/api/profile/task-types` — `GET` calls `fetchSelectOptions("Task Type")` on the Notion Projects data source. Returns `{ options: [{ id, name }], missing: false }` when the property exists, or `{ options: [], missing: true }` when it doesn't — the UI uses `missing` to surface a "create this property in Notion" empty state.
- `/api/calls/create` — `POST`, consumed by the external "Call Miner" Cowork skill (and shares the same write path as the Calls tab). Delegates ALL validation + client resolution + the Notion write to `persistCallNote` ([lib/calls.ts](lib/calls.ts)); the route only parses JSON (`invalid_json`) and maps `CallNoteError`/`call_notes_not_configured` to responses. Behaviour + error codes are **unchanged** from the prior inline implementation: a specific 400 code per bad field (`missing_name`, `invalid_call_type`, `invalid_date`, `invalid_duration`, `invalid_outcome`, `outcome_type_mismatch` — Sales/Client outcomes must pair with the matching `callType`, `invalid_engagement`, `invalid_objections_count`, `invalid_tag`, `invalid_body`, `invalid_client_zoho_id`), 404 `notion_not_linked` when a supplied `clientZohoId` matches no Notion record (resolved server-side via `listNotionClients()`, never trusting a caller-supplied page id), 503 `not_configured` when `NOTION_CALL_NOTES_DB_ID` is unset. On success returns `{ ok: true, id, url }`; any other thrown error → 500.
- `/api/calls/mine` — `POST`, the in-app Calls tab (Tab 7) analyser. Body `{ loomUrl?, transcript, callTypeHint?, clientZohoId?, date? }`. `transcript` required (400 `missing_transcript`). Calls `roadmapDraft()` (reused, no new Anthropic helper) with `CALL_MINER_SYSTEM_PROMPT` + `buildCallMinerUserContent` (today's date from `getUserSettings().timezone` is the model's default). Parses defensively (strips ```json fences, slices the first `{...}` block; 502 `parse_failed` with the raw output echoed; 200 soft-fail `generation_failed` on an Anthropic error). When `loomUrl` is set, prepends a `Loom: <url>` line to the body (Loom is **never** scraped server-side — JS-rendered, no stable API; the transcript is pasted). Hints (`callTypeHint`/`clientZohoId`/`date`) override the model where set, then hands off to `persistCallNote`; `CallNoteError` codes are surfaced with their status. Returns `{ ok, id, url, callType, outcome }`. This is Phase 1 only — no 06-Brand writes (Client Language Bank / Brand OS) — that is Phase 2/3.
- `/api/calls/list` — `GET` returns `{ ok: true, calls: CallNoteSummary[] }` (the ~25 most recent Call Notes via `listCallNotes()`, Date desc). 503 `not_configured` when `NOTION_CALL_NOTES_DB_ID` is unset.

**Pages:**
- `/` redirects to `/projects`.
- `/projects` — Tab 1, fully built (see below).
- `/development` — Tab 10, Projects DB filtered to Department=Development, product-first (see below).
- `/digest` — Tab 2, daily briefing + time-block suggestions (see below).
- `/calendar` — Tab 3, Google Calendar mirror (see below).
- `/clients` — Tab 4, client master-detail (see below).
- `/areas` — Tab 5, Areas card grid + drawer (see below).
- `/areas/manage` — Areas version-management surface (live / outdated / archived versions per base area; one-click archive). See Tab 5.
- `/areas/review` — Areas Review wizard (area-by-area review → AI-drafted new version → approve & write). See Tab 5.
- `/resources` — Tab 6, fully built (see below).
- `/calls` — Tab 7, Loom-link + transcript → AI analysis → Call Notes write + recent list (see below).
- `/profile` — integration status surface (see below). Linked from the top-nav avatar.
- `/settings/google-connected`, `/settings/google-error` — OAuth flow landings.
- `/login` — password gate (see Password gate below). Renders outside the gate.
- `/capture` — Quick Capture into the Notion Inbox DB (see Quick Capture below).

**Password gate (app-wide, cookie-based):**
- [proxy.ts](proxy.ts) (Next 16 `proxy` file convention — the renamed successor to `middleware`; exports a `proxy(req)` function + a `config.matcher`) gates every request behind a single password. Unauthenticated requests redirect to `/login`.
- Session is an `iron-session` sealed cookie (`bh_session`, httpOnly, `secure` in production, `sameSite=lax`, 30-day `maxAge`). Seal config lives in [lib/session.ts](lib/session.ts) (`sessionOptions` + `SessionData`) and is shared by the Edge proxy and the Node login route so the same cookie is sealed on login and unsealed on every request. iron-session v8 is Edge-compatible via iron-webcrypto.
- `POST /api/auth/login` ([app/api/auth/login/route.ts](app/api/auth/login/route.ts), `runtime = "nodejs"`) compares the posted password against `APP_PASSWORD`; on match it sets `session.isLoggedIn = true` and saves the cookie. 401 `invalid_password` on mismatch, 503 `not_configured` when `APP_PASSWORD` is unset.
- [app/login/page.tsx](app/login/page.tsx) + [app/login/_components/LoginForm.tsx](app/login/_components/LoginForm.tsx): single password field; on success it does a full navigation to `/projects` so the new cookie is present when the proxy evaluates the next request. The page uses a `fixed inset-0` wrapper to escape the centered, padded `<main>` so the gate is full-bleed on a phone. *(Predates the 2026-06-06 mobile-first pass, which removed the `<main>` `min-w-[1280px]` this wrapper originally escaped; the `fixed inset-0` wrapper is retained.)*
- **Four paths are deliberately NOT gated** (the allowlist in proxy.ts): `/login`, `/api/auth/login`, `/api/auth/callback/google` (Google calls it server-side during OAuth with no session cookie — gating it breaks calendar auth), and `/api/calls/create` (the external Call Miner skill posts unauthenticated in v1). Static assets (`_next`, `favicon`) are excluded via the matcher.
- Env vars: `APP_PASSWORD` (the password) and `SESSION_SECRET` (≥32 chars, seals the cookie). Both must be set in the deploy environment or the gate fails (503 / iron-session throws on seal).

**Quick Capture (`/capture`):**
- A deliberately mobile-friendly (phone-PWA) one-way capture surface that writes raw entries into the existing Notion **Inbox DB** (`NOTION_INBOX_DB_ID`). This is the first code in the repo that uses the Inbox DB.
- [app/capture/page.tsx](app/capture/page.tsx) + [app/capture/_components/CaptureForm.tsx](app/capture/_components/CaptureForm.tsx): single-column form (textarea + a 4-button type picker over `INBOX_TYPES` + Save). On success it clears the textarea, toasts, and refocuses for fast successive capture (type selection is kept). Uses a `fixed inset-0` wrapper (with an in-page back link) to render full-bleed outside the centered, padded `<main>` — scoped to `/capture` only. *(Predates the 2026-06-06 mobile-first pass, which removed the `<main>` `min-w-[1280px]` this wrapper originally escaped.)*
- `POST /api/inbox/create` ([app/api/inbox/create/route.ts](app/api/inbox/create/route.ts), `runtime = "nodejs"`): body `{ name, type }`. Validates `name` non-empty and `type` against `INBOX_TYPES` (400 `missing_name` / `invalid_type`), 503 `not_configured` when `NOTION_INBOX_DB_ID` is unset. Calls `addToInbox`.
- [lib/notion.ts](lib/notion.ts) additive `addToInbox(name, type)` — creates a page in the Inbox DB via the lazily-cached `inboxDataSourceId` (same `data_source_id` create pattern as `createResource`/`createProject`, Notion 2025-09-03+). Sets `Name` (title), `Type` (select), `Processed` (checkbox=false); `Routed To` is left empty (triage happens later in Notion).
- Constants: `INBOX_TYPES` + `InboxType` in [constants/inbox.ts](constants/inbox.ts); `ROUTES.pages.{login,capture}`, `ROUTES.api.auth.login`, `ROUTES.api.inbox.create` in [constants/routes.ts](constants/routes.ts). A **Capture** link sits in the top-nav action cluster (lucide `Inbox` icon). i18n under `login.*` / `capture.*` / `nav.capture` in [constants/translations.ts](constants/translations.ts) (DE+EN).
- **Voice input (Web Speech API, 2026-06-08).** [components/VoiceInput.tsx](components/VoiceInput.tsx) — self-contained Client-Component (browser-native `SpeechRecognition`, keine npm-Dependency, kein Backend, kein API-Key), über der Capture-Textarea in [CaptureForm.tsx](app/capture/_components/CaptureForm.tsx) gemountet. Mic-Toggle + DE/EN-Sprachumschalter (die Web Speech API erkennt die Sprache nicht selbst — `lang` muss gesetzt werden; Default `de-DE`, in `localStorage bh.voice.lang` persistiert, während der Aufnahme gesperrt). Feature-detected via `window.SpeechRecognition ?? window.webkitSpeechRecognition` — fehlt die API, degradiert sie zu einem `voice.unsupported`-Hinweis (kein Crash). `continuous` + `interimResults`; nur finalisierte (`isFinal`) Segmente werden via `onTranscript` emittiert, das an die Textarea ANHÄNGT (nie ersetzt); Interim-Text ist nur internes Live-Feedback. `onend` resettet ohne Auto-Restart; `onerror` mappt `not-allowed`/`service-not-allowed` → `voice.permissionDenied`-Toast, schluckt `aborted`/`no-speech`. Loop-safe Effects (primitive Deps; `onTranscript`/`lang`/`t` in Refs gespiegelt); Unmount macht `abort()` + Handler null. Constants: [constants/voice.ts](constants/voice.ts) (`VOICE_LANGS`, `DEFAULT_VOICE_LANG`, `VOICE_LANG_STORAGE_KEY`, `VoiceLangCode`); Ambient-Typen in [types/speech-recognition.d.ts](types/speech-recognition.d.ts); 8 `voice.*` i18n-Keys (DE+EN). Die Komponente ist wiederverwendbar (nur `onTranscript`-gekoppelt), aktuell nur in `/capture` eingehängt. Laufzeitverhalten ist browser-abhängig — zuverlässig auf Desktop/Android-Chrome, wackelig auf iOS-Safari.

**Tab 1 (Projects) — complete:**
- Three view modes — Table (TanStack), Kanban (dnd-kit, grouped by Status, drag-drop writes Status; Priority shown as pill), Calendar (FullCalendar `dayGridMonth` + `interaction` plugin, drag-to-reschedule writes Due Date).
- View toggle top-left, persisted in `bh.projects.view` localStorage.
- Status / Department / Priority filters at tab level — apply to all three views.
- Inline edit in Table for Status, Department, Priority, Due Date, Next Action; Name edit happens in drawer.
- Table typography unified across all cell types — `h-9` + `font-sans text-sm` on both read and edit states, so clicking to edit doesn't visually resize the cell.
- **Notion-style pill badges**: Status and Department cells render through [OptionBadgeSelect](app/projects/_components/cells/OptionBadgeSelect.tsx) as rounded pills with a Notion-matched light background + matching text colour (via `NOTION_COLOUR_BG_MAP` + `NOTION_COLOUR_TEXT_MAP` + `notionColourBg()` / `notionColourText()` helpers in [constants/priorities.ts](constants/priorities.ts)). No left-border accent — full pill fill on both the trigger and the dropdown items. Options + colours are fetched once on mount from `/api/projects/options`; the cell falls back to a muted default when the fetch hasn't returned yet. The original `NOTION_COLOUR_MAP` + `notionColour()` helpers remain in place for back-compat.
- **Group by Department**: a "Group by Department" toggle button (lucide `Layers` icon) sits in the Table toolbar to the right of the three filter dropdowns. Visible only when `view === "table"`; toggle state persists in `ProjectsClient` state across view switches and re-appears with the active highlight when the user returns to the Table view. When active, rows are sorted by `DEPARTMENTS` constant order (unknowns at the end) and section header `<tr>`s are injected between groups. Implemented in [ProjectsTable.tsx](app/projects/_components/ProjectsTable.tsx) via a `rowEntries: ({ kind: "header", department } | { kind: "row", row })[]` `useMemo` — TanStack Table's `getGroupedRowModel` is *not* used. The memo depends on `[table, groupByDepartment, t, sorting]` so column-sort toggles re-derive entries correctly.
- **ProjectDrawer** widened from 720px to `w-[min(90vw,1400px)] sm:max-w-[min(90vw,1400px)]`. Now that [components/ui/sheet.tsx](components/ui/sheet.tsx) no longer hardcodes `data-[side=right]:sm:max-w-sm` / `data-[side=left]:sm:max-w-sm` in its base `cn()`, the caller-provided className actually takes effect. Compact metadata zone with editable Name heading + 9 metadata rows; read-only Notion page body rendered by [PageBodyRenderer.tsx](app/projects/_components/PageBodyRenderer.tsx) (paragraph, heading_1/2/3, bulleted/numbered list with one-level children, to_do, quote, callout, code, divider, toggle; bold/italic/strikethrough/code/link rich-text; loading/empty/error states).
- **Cross-tab department-filter wiring**: [ProjectsClient.tsx](app/projects/_components/ProjectsClient.tsx) seeds `departmentFilter` lazily from `useSearchParams().get("department")`, validated against the `DEPARTMENTS` constant — so the project-count badge link from Tab 5 lands on `/projects?department=<name>` with the matching filter already applied. Invalid / missing values fall back to no filter. The parent [app/projects/page.tsx](app/projects/page.tsx) wraps `ProjectsClient` in `<Suspense>` because Next 16 requires it for `useSearchParams`.
- **Add Project dialog** (shadcn Dialog at `sm:max-w-xl`) — Name + Department required validation; defaults: Status=Active, Priority=Medium. Includes a multiline **Notes textarea** below Next Action; non-empty content is split on newline and appended as paragraph blocks to the new Notion page via `appendTextBlocks` after creation. The append step is non-fatal — a failure logs `append_blocks_failed` but the route still returns the created project.
- **ActionSuggester** ([ActionSuggester.tsx](app/projects/_components/ActionSuggester.tsx)) — self-contained client component mounted in both ProjectDrawer (below the page body) and AddProjectDialog (below the Notes field). Two visual sections: top callout with the context textarea + Suggest/Regenerate button right-aligned; bottom callout listing saved step suggestions, only rendered when `steps.length > 0`. Both context and step list persist in `localStorage` keyed by `bh.suggest.ctx.<id>` / `bh.suggest.steps.<id>` (falls back to `project.name` when no id is available — i.e. the dialog case before the page exists). Steps are written to storage only inside the `suggest()` success path, never via a reactive effect, so an in-flight request can't clobber the cached list. Hydration uses the loop-safe pattern (deps `[project.id, project.name, storageKey]`, all primitives). `/api/projects/suggest` runs only on explicit button click. Suggest button flips its label to "Regenerate" once steps exist. The "Use" button calls `onAccept(step)` → in the drawer this routes through the existing `onUpdate(project.id, "Next Action", step)` optimistic pipeline (sonner toast + revert); in the dialog it sets the `nextAction` form state.
- **[components/ui/sheet.tsx](components/ui/sheet.tsx)** — removed `data-[side=right]:sm:max-w-sm data-[side=left]:sm:max-w-sm` from the base `SheetContent` `cn()` string. All Sheet consumers now control their own max-width via className (benefits ProjectDrawer + AreaDrawer + ResourceDrawer — all three now open at the intended `min(90vw, 1400px)`).
- Optimistic UI on all writes with sonner toast + revert on failure.
- **Named view presets (2026-06-07, supersedes the earlier "status change drops the row" behaviour).** The Projects tab now loads a wider set of statuses via `listProjectsForViews()` (the union of the four named views in [constants/project-views.ts](constants/project-views.ts): **Open** = `Active`/`In Progress`/`Later`, **Backlog** = `Backlog`, **On Hold** = `On Hold`/`Waiting`, **Done** = `Done`) instead of Active-only. A view-preset `Select` sits in the Table/Calendar toolbar (left of the Status filter); the choice persists in `bh.projects.viewPreset` localStorage (default `open`). `ProjectsClient.listItems` narrows `filteredItems` to the active preset's status set, so **Table + Calendar** render that subset — a status change is now an **in-place edit**: when a project's new status no longer matches the active preset, the derived `listItems` re-filters and the row drops automatically (no special-case removal, no drawer auto-close). **Kanban deliberately renders `filteredItems`** (the full set), keeping its own `Active`/`On Hold`/`Done` columns — the preset does not apply to it. `Archived` keeps its separate archive-and-drop path. Note: the wider Status values (`In Progress`/`Later`/`Backlog`/`Waiting`) are filter-only and intentionally **not** part of the narrow `Status` union in `constants/priorities.ts` (which still drives Kanban columns + the drawer/Add-dialog selects — kept to `Active`/`On Hold`/`Done`). **Write-path fix (2026-06-07):** `/api/projects/update` now validates incoming `Status` values against `PROJECT_VIEW_STATUSES` (not the narrow `STATUSES`), so setting a project to `Backlog`/`In Progress`/`Later`/`Waiting` from the Table status cell writes through to Notion instead of returning `400 value_not_in_enum` — see the `/api/projects/update` route entry above.
- **2026-05-20 — Projects DB `Area` property renamed to `Department`** (Phase 1 of archive automation). The old name clashed semantically with the Resources/Archive `Area` taxonomy. Code rename: `constants/areas.ts` → `constants/departments.ts` (`AREAS` → `DEPARTMENTS`, type `Area` → `Department`); `Project.area` / `ProjectDraft.area` → `.department`; `UpdateField` `"Area"` → `"Department"`; `/api/projects/options` response key `area` → `department`. The cross-tab filter URL is now `/projects?department=<name>` (was `?area=`). The Notion Projects DB property is now `Department` (select). The PARA Areas tab (Tab 5) and the Notion Areas DB are unaffected — only the Projects column changed. The `ActionSuggester` ↔ `/api/projects/suggest` subsystem still uses the wire key `area` (suggest route is out of the Phase 1 scope).

**Tab 2 (AI Digest) — daily briefing + time-block suggestions:**
- Daily briefing and time-block suggestions are built; weekly plan is deferred.
- Server route `/api/digest/daily` (POST/GET). **Locale-aware (2026-06-07):** both verbs take the locale ('de'|'en', default 'de') — `GET` via `?locale=`, `POST` via a body field — and the briefing is generated entirely in that language, section titles included (DE → "Fokus heute" / "Überfällig / dringend" / "Aufschieben"; EN → "Focus today" / "Overdue / urgent" / "Defer"). POST gathers trimmed Active projects (Name, Status, Department, Priority, Due Date, Next Action, Estimated Minutes — no page bodies) and today's Google Calendar events (title + start + end only, if connected), computes a sha256 `input_hash` over canonical JSON of the inputs (locale included), calls Sonnet via `briefing()` with a per-locale system prompt that requests three short markdown sections under ~400 words, and `INSERT`s a new row into `briefings` (date, 'daily', locale) with `expires_at` set to end-of-day in `settings.timezone`. Cache hit when the most recent row for today **in that locale** has a matching `input_hash` and `?force=true` is absent — so each language is cached separately (new `briefings.locale` column) and toggling DE↔EN reuses the cache instead of regenerating. The `DailyDigest` component passes the current locale on the mount GET + the regenerate POST and refetches when the locale changes (primitive `locale` dep; still no auto-generate on mount or locale switch — a not-yet-generated language shows the generate state).
- Briefings are append-only: every regeneration inserts a new row and the displayed briefing is the latest row for today; prior briefings are preserved for a future history-viewer (separate task).
- Time-block suggestions live below the daily briefing on `/digest` (component [app/digest/_components/TimeBlockSuggestions.tsx](app/digest/_components/TimeBlockSuggestions.tsx)). On mount it GETs `/api/digest/timeblocks` (no auto-generate — Sonnet only runs on explicit user click). The generate button POSTs `{ horizon_days: 5 }` (`HORIZON_DAYS = 5` constant). The route echoes `settings.timezone` alongside the suggestions and the component formats `HH:mm–HH:mm` in that timezone (not a hardcoded one). **Multi-day:** future suggestions are filtered (`start_at >= now`) and **grouped by `date`**, each group ascending; the group header label is "Heute"/"Today", "Morgen"/"Tomorrow", or a localized `weekday + day` (computed at local noon, immune to TZ flips). Empty state shows a "Suggest time blocks" button (`digest.timeblocks.emptyMulti`); populated state shows day-grouped cards (project name, time range, rationale) with Confirm / Dismiss actions and a "Suggest again" header button that appends a new batch alongside existing pending cards. `no_viable_days` (and legacy `no_free_slots`) is treated as an empty result rather than an error. Optimistic UI on confirm/dismiss with sonner toasts and revert on failure. Uses the same `tRef` + empty-deps `useEffect` pattern as `DailyDigest` so locale toggles don't refetch.
- Both `DailyDigest` and `TimeBlockSuggestions` use a `max-w-4xl` centred wrapper.

**Tab 3 (Calendar) — Google Calendar mirror:**
- Server shell [app/calendar/page.tsx](app/calendar/page.tsx) calls `isGoogleConnected()` + fetches Active projects from Notion (for the dialog's project dropdown) and passes both as props to [app/calendar/_components/CalendarView.tsx](app/calendar/_components/CalendarView.tsx). The page also imports the scoped stylesheet [app/calendar/calendar.css](app/calendar/calendar.css) — Google-Calendar-style FullCalendar overrides nested under `.bh-calendar` so they never bleed into the Projects-tab FullCalendar.
- When Google is not connected: renders a centered "Connect Google Calendar" card with a CTA linking to `/api/google/connect`. Calendar markup is not rendered.
- When connected: FullCalendar mounts with `[dayGridPlugin, timeGridPlugin, interactionPlugin]`. Initial view: `timeGridWeek` (persisted as `bh.calendar.view` in localStorage). `editable: false` — no drag-to-reschedule on this tab (edit flows through the dialog only). Slot range `06:00–22:00` (48px per hour, with dashed half-hour minor lines), nowIndicator on (a primary-coloured line with a leading dot), all-day slot hidden, week starts Monday.
- FullCalendar's default toolbar is hidden; the tab renders its own toolbar above the calendar with `<` / Today / `>` buttons + the current range label (read from `view.title` on `datesSet`) on the left, and a Day / Week / Month segmented control on the right. The view toggle drives FC imperatively via `calendarRef.getApi().changeView(next)`.
- Events fetched from `/api/calendar/events?start=…&end=…` on every `datesSet` (view/range change). When the fetch returns `google_invalid_grant` (revoked refresh token) the view sets a `tokenRevoked` flag and renders a **reconnect banner** above the calendar (`calendar.reconnect.title/body/cta` → links to `/api/google/connect`) plus a `calendar.errorTokenRevoked` toast, rather than the generic load-error toast. Pending time-block suggestions fetched once on mount from `/api/digest/timeblocks` and overlaid with the `bh-pending-event` className so calendar.css paints them with the muted/dashed style; the title is prefixed with `⏳ ` so they stay recognisable when the dashed border is small.
- Empty-slot click opens [app/calendar/_components/EventDialog.tsx](app/calendar/_components/EventDialog.tsx) in create mode, pre-filled with the slot's start/end as `datetime-local` strings. Google event click opens the same dialog in edit mode (Title, Project select, Description textarea, Start/End datetime-local). Title required, End-after-Start validated inline. Edit mode includes a Delete button that opens a second confirmation Dialog (since shadcn `alert-dialog` isn't installed; same Dialog primitive, dedicated content).
- Pending-suggestion click opens [app/calendar/_components/PendingSuggestionPopover.tsx](app/calendar/_components/PendingSuggestionPopover.tsx) (implemented as a small shadcn Dialog — no `popover` primitive installed): shows project name, HH:mm–HH:mm time range, rationale, Confirm / Dismiss. Confirm calls `/api/digest/timeblocks/[id]/confirm`, removes the ⏳ event, optimistically adds the new Google event to local state; Dismiss calls `/api/digest/timeblocks/[id]/dismiss` and removes the ⏳ event.
- All event create/update/delete and suggestion confirm/dismiss writes are optimistic with sonner toasts and revert-on-failure snapshots. i18n entries under `calendar.*` (including `calendar.toolbar.{today,prev,next}`) in [constants/translations.ts](constants/translations.ts) (DE+EN).
- **View switcher**: a Day | Week | Range segmented control sits on the right side of the custom toolbar (same pattern as the Projects view toggle). Day → `timeGridDay`, Week → `timeGridWeek`, Range → custom date-range mode. The active view persists in `bh.calendar.view`; mount-restore reads it and calls the appropriate `changeView` after the FullCalendar ref is available.
- **Custom Range mode**: when Range is selected, a compact date-picker row appears below the toolbar with a From input + To input + Apply button. Apply calls `calendarRef.current.getApi().changeView("timeGrid", { start: customStart, end: nextDayOf(customEnd) })` — FullCalendar's custom-range `end` is exclusive, so we shift the inclusive picker date by one day before handing off. The picker values persist in `bh.calendar.custom.start` / `bh.calendar.custom.end` and are restored on page load alongside the view. Prev/Next in custom mode advances by the range's own duration (FullCalendar default behaviour).

**Tab 4 (Clients) — Zoho/Notion master-detail:**
- Server shell [app/clients/page.tsx](app/clients/page.tsx) does no data fetching and mounts [app/clients/_components/ClientsView.tsx](app/clients/_components/ClientsView.tsx). The client component fetches `/api/clients` on mount, auto-selects the first row, and lazy-fetches `/api/clients/[zohoId]` per selected client (cached in component state — clicking a previously-loaded client reuses cache). The outer container is `mx-auto w-full max-w-screen-2xl`; on desktop it is a two-column grid (`md:grid md:grid-cols-[320px_minmax(0,1fr)]`), on mobile a master/detail drill-down driven by a `mobileView` state (list ↔ detail) with a `md:hidden` "Back to list" button (the old `min-w-[1240px]` was removed in the 2026-06-06 mobile-first pass). A Status filter sits in [ClientList.tsx](app/clients/_components/ClientList.tsx) below the sort selector — options are the unique non-null `clientStatus` values across loaded clients (derived in `ClientsView.statusOptions`, sorted A–Z).
- **Detail-fetch effect (loop-safe pattern — see the "Prevent useEffect infinite loops" constraint in Standard Prompt Constraints):** the effect depends on `[selectedZohoId]` only (primitive), and the guard short-circuits on `if (details[selectedZohoId]) return` — the *presence* of any entry, not the presence of loaded data. An earlier version depended on `[selectedZohoId, details, loadDetail]` and guarded on `details[selectedZohoId]?.detail`; since `loadDetail` sets `loading: true` before awaiting, the `details` reference changed mid-fetch, the effect re-fired, the guard didn't short-circuit (data was still `null`), and the route was hammered dozens of times per second. Reaffirmed in the constraint to prevent regressions in other tabs.
- Components: [ClientList](app/clients/_components/ClientList.tsx) (left panel, 320px), [ClientDetail](app/clients/_components/ClientDetail.tsx) (right panel; pulls in [InvoiceList](app/clients/_components/InvoiceList.tsx), [MonthlyTaskChecklist](app/clients/_components/MonthlyTaskChecklist.tsx), [WhatsAppTemplates](app/clients/_components/WhatsAppTemplates.tsx), and an inline `MetadataGrid`/`IndustryField`/`NumberField`/`UrlField` group). Notes section reuses `<PageBodyRenderer />` from the Projects tab. Shared types and helpers in [types.ts](app/clients/_components/types.ts) including `INDUSTRIES` (the Notion `Industry` select options), `clientHealth()`, and `formatEur()`.
- Health pill on each list row: green when no overdue, amber when outstanding > 0, red when at least one overdue invoice (red is detail-aware — upgrades from amber after that client's detail is loaded). Task progress badge shows `{done}/4` once the detail is loaded, `–` before then.
- WhatsApp templates: four parameterized strings under `clients.whatsapp.template.<task name>` in [constants/translations.ts](constants/translations.ts), interpolated with `{name}`, `{amount}`, and `{due_date}` (earliest unpaid invoice's due date). Copy button writes plain text. Open WhatsApp button is `https://wa.me/<digits>` and is hidden when the Zoho phone normalises to fewer than 7 digits. Per-client overrides (backend at `/api/clients/[zohoId]/templates`, Supabase `client_template_overrides`) are not yet wired into [WhatsAppTemplates.tsx](app/clients/_components/WhatsAppTemplates.tsx) — every client currently renders the default DE/EN strings.
- Metadata edits PATCH `/api/clients/[zohoId]/notion`; task status cycles use the existing `/api/projects/update` POST; task generation POSTs `/api/clients/[zohoId]/generate-tasks`. All writes are optimistic with sonner toast + revert on failure.
- i18n entries under `clients.*` in [constants/translations.ts](constants/translations.ts) (DE+EN, including monthly task labels, invoice status labels, WhatsApp templates, and metadata field labels).

**Tab 5 (Areas) — bird's-eye view over the Areas DB:**
- Server shell [app/areas/page.tsx](app/areas/page.tsx) calls `listAreas()` + `listActiveProjects()` in parallel via `Promise.all`, derives `projectCounts: Record<string, number>` by grouping active projects on their `Department` select in JS (one Notion query, not eight — never per-area), and passes `areas` + `projectCounts` to [app/areas/_components/AreasView.tsx](app/areas/_components/AreasView.tsx). Area names are run through a `normalize()` helper that strips a trailing ` (vN)` version suffix (the Brand-OS-style versioning convention) before matching counts, so a renamed-in-progress area card still shows the right project/overdue counts. Falls back to an empty payload when `NOTION_AREAS_DB_ID` is missing rather than crashing.
- [AreasView](app/areas/_components/AreasView.tsx) is the top-level client component: holds `areas` state (seeded from server props), `selectedAreaId` state for the drawer, and a `persist(id, field, value)` helper that performs the optimistic update — patches the in-memory area immediately, PATCHes `/api/areas/[areaId]/update`, and on failure restores the previous value + fires a sonner `areas.updateError` toast. **Category grouping (2026-06-08):** areas are grouped by their Notion `Kategorie` select (`NotionArea.category`) into collapsible sections in `AREA_CATEGORIES` order (`Business` → `Privat` → `Weiterbildung`; from [constants/area-categories.ts](constants/area-categories.ts)), with a trailing "Ohne Kategorie" section rendered only when an area has a null/unknown category. Each non-empty section renders via [CategorySection.tsx](app/areas/_components/CategorySection.tsx) (lightweight collapsible — header with title + area count + lucide `ChevronDown`/`ChevronRight`, no shadcn-collapsible dependency; collapsed/expanded state persisted per category in `localStorage` under `bh.areas.section.<category>`, default expanded, loop-safe mount-read) wrapping the same responsive card grid: 1 col on narrow → 2 at `lg` → 3 at `2xl`. The per-card props (`AreaCard`), the drawer, `FocusHeader`, the header buttons, and the inline-edit/persist logic are unchanged — only the layout was reorganised into sections.
- [AreaCard](app/areas/_components/AreaCard.tsx) — **Phase 2 (2026-06-08): compact, display-only, fully clickable.** The whole card is a keyboard-accessible `role="button"` (`tabIndex=0`, Enter/Space + click) that opens the detail **dialog** (`onOpen`). It shows ONLY: area name, a **traffic-light status** (`StatusLight` — filled coloured dot + label: Active = emerald, Needs Attention = amber, Paused = muted/grey, via `dotTone()`), the current Milestone (read-only, `line-clamp-2`, falls back to the `areas.noMilestone` placeholder), and the Milestone due date (read-only, `Intl.DateTimeFormat` medium) when set. The status-tinted card background (`cardTone()`) is retained. **Removed from the card and moved into the dialog:** all inline-edit fields (Current Milestone / Next Steps / Next Focus / Goal), Next Steps / Next Focus / Health Metric display, the project-count + overdue badges, and the per-card Review pill. The card no longer takes `onPersist` / `activeProjectCount` / `overdueCount` props — only `area` + `onOpen`.
- [AreaDialog](app/areas/_components/AreaDialog.tsx) — **Phase 2 (2026-06-08): renamed from `AreaDrawer.tsx` and converted from a right-anchored shadcn `Sheet` to a centred shadcn `Dialog` pop-up.** `DialogContent` is `flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl` with an internally scrollable body (`flex-1 overflow-y-auto`); a **visible** `DialogTitle` carries the area name (replaced the old `sr-only` SheetTitle). Closes via Esc / the corner X / overlay click / the footer Close button (`DialogClose`). All previous content/behaviour is preserved 1:1: the `MetaRow` 2-column grid with editable **Status** (shadcn `Select` Active / Needs Attention / Paused — onValueChange PATCHes immediately), **Current Milestone** (input), **Next Steps** (textarea), **Next Focus** (input), **Goal** (textarea) plus read-only **Milestone Due Date** / **Standard** / **Health Metric**; the lazy-fetched page-body section (`PageBody` with the unchanged loop-safe `[areaId]`-dep effect); and the footer (Open in Notion · Review this area · Close). **Moved in from the card (Phase 2):** the project-count + overdue badges now render at the top of the dialog body (same logic/styling, links to `/projects?department=<name>`), so `AreaDialog` gained two props `activeProjectCount` / `overdueCount` (passed from `AreasView` via `projectCounts`/`overdueCounts` keyed on `normalize(selectedArea.name)`). The page body still renders via `<PageBodyRenderer />` imported from [app/projects/_components/PageBodyRenderer.tsx](app/projects/_components/PageBodyRenderer.tsx) (reused, not copied). The `areas.drawer.*` i18n keys are kept (only the component, not the keys, was renamed).
- Drawer block-fetch effect follows the loop-safe pattern from Standard Prompt Constraints: `useEffect` depends on `[areaId]` only (primitive), guard short-circuits on `if (cache[areaId]) return` — presence of any entry (including in-flight loading state), not loaded data. ESLint `exhaustive-deps` suppressed on the line that omits the cache setter.
- API routes (all server-only, never return tokens to client):
  - `GET /api/areas` — calls `listAreas()` + `listActiveProjects()` in parallel, groups counts in JS, returns `{ areas, projectCounts }`. Returns 503 `{ error: "areas_not_configured" }` when `NOTION_AREAS_DB_ID` is unset.
  - `GET /api/areas/[areaId]/blocks` — returns `{ ok, blocks }` from `getAreaPageBlocks(areaId)`.
  - `PATCH /api/areas/[areaId]/update` — body `{ field, value }`. Whitelists `field` against the five-value `AreaUpdateField` union; rejects `Status` values outside `["Active", "Needs Attention", "Paused"]` with 400 `value_not_in_enum`. Returns 200 `{ ok: true }`.
- New helpers in [lib/notion.ts](lib/notion.ts) (all additive — no existing exports modified): `listAreas()` (sorts by Name asc, paginates via `dataSources.query`; also reads the `Kategorie` select into `NotionArea.category` (string|null, defensive `asSelect`) for the Areas-tab category grouping), `updateAreaField(pageId, field, value)`, `getAreaPageBlocks(pageId)` (thin alias over `getPageBlocks`), types `NotionArea` + `AreaUpdateField`. Module-level `areasDataSourceId` cache mirrors the Projects / Clients pattern — fetched lazily on first call via `databases.retrieve`. **Important shape difference vs Projects:** the Areas DB `Status` is a `select` property, not a `status` property; `updateAreaField` builds `{ Status: { type: "select", select: { name } } }`, and the route's filter shape would be `select.equals` (not `status.equals`). Mixing these silently returns empty results.
- Constants added: `ROUTES.api.areas.list` (`/api/areas`), `ROUTES.api.areas.blocks(id)`, `ROUTES.api.areas.update(id)` in [constants/routes.ts](constants/routes.ts). 24 `areas.*` i18n keys in [constants/translations.ts](constants/translations.ts) with both `de` and `en` entries, including the `{count} active projects` template used by the card badge.
- Cross-tab wiring: [app/projects/_components/ProjectsClient.tsx](app/projects/_components/ProjectsClient.tsx) seeds `departmentFilter` lazily from `useSearchParams().get("department")`, validated against the `DEPARTMENTS` constant — so the count-badge link from Tab 5 lands on Tab 1 with the matching filter already applied. The parent [app/projects/page.tsx](app/projects/page.tsx) wraps `ProjectsClient` in `<Suspense>` because `useSearchParams` requires it. Invalid or missing `?department=` values fall back to no filter.
- **Status-tinted card callouts**: each `AreaCard`'s outer `div` gets a status-based background via `cardTone(status)` — Active = `bg-emerald-500/8 border-emerald-200/50 dark:border-emerald-800/40`, Needs Attention = `bg-amber-500/8 border-amber-200/50 dark:border-amber-800/40`, Paused = `bg-muted/30 border-border`, default = `bg-card border-border`. The grid now communicates health at a glance without any drawer interaction.
- **Three additional read-only fields on the card** (each conditional on the value being set): Milestone Due Date (formatted via `Intl.DateTimeFormat({ dateStyle: "medium" })`); Next Focus (truncated to 2 lines via `line-clamp-2`); Health Metric (with a 6×6px status-coloured dot — emerald / amber / muted-foreground — beside the text, also `line-clamp-2`).
- **Overdue badge + zero-count suppression**: a red badge `t("areas.overdueProjects")` showing `{count} overdue` appears on cards whose area has active projects with a past Due Date. The count is computed server-side in [app/areas/page.tsx](app/areas/page.tsx) alongside `projectCounts` (one pass through the projects array — no extra Notion calls). Paused areas with `activeProjectCount === 0` hide the active-project badge entirely (the count is uninformative for paused work); the overdue badge still appears independently if any overdue items exist.
- **FocusHeader**: a `<FocusHeader />` sub-component lives inside [AreasView.tsx](app/areas/_components/AreasView.tsx) and renders between the page header and the card grid. On mount it `GET`s `/api/areas/focus` and renders a 2–3 sentence AI-generated strategic summary (Haiku, derived from `roadmap.md`). Subtle primary-tinted callout (`border-primary/15 bg-primary/5`) with a Sparkles icon. Refresh button re-fetches with `?bust=<ts>` to bypass the server-side 1h cache. Skeleton during initial load; renders nothing when the summary is null/error so the UI degrades silently.
- **AreaDialog sizing** (Phase 2): the area detail is now a centred dialog at `sm:max-w-3xl max-h-[85vh]` with an internally scrollable body (superseded the old Sheet width note — the area detail no longer uses `sheet.tsx`).

**Tab 5 — Areas versioning + review workflow (2026-06-07):**

The Areas DB uses a **versioned-page** convention (Brand-OS-style `Name (vN)` suffixes + an `Archived` checkbox property): a base area like `Marketing` can have several pages, of which the most-recently-created non-archived one is "live" and the rest are "outdated"/"archived". Two surfaces sit on top of this, both linked from the Tab 5 header in [AreasView.tsx](app/areas/_components/AreasView.tsx): an **Areas Review** outline button (→ `ROUTES.pages.areasReview`, full sequential review) and a **Versionen verwalten / Manage versions** outline button (→ `ROUTES.pages.areasManage`, `History` icon, `areas.manage` key) sitting beside it. All server logic lives in [lib/notion-areas.ts](lib/notion-areas.ts) (a second Notion client instance — see Library files).

- **Manage surface** ([app/areas/manage/page.tsx](app/areas/manage/page.tsx) → [ManageView.tsx](app/areas/manage/_components/ManageView.tsx)). Client component fetches `GET /api/areas/manage` on mount, buckets pages by **base name** (` (vN)` stripped via a local `normalize()`) into `live` / `outdated` / `archived` (live = newest non-archived; outdated = remaining non-archived; archived = checkbox-flagged). Per group it shows the live version + a list of outdated versions each with an **Archive** button (POSTs `/api/areas/archive`), an **Archive all outdated** action, and "Open in Notion" links. **Each version row also renders its `area.created` timestamp** (localized via `Intl.DateTimeFormat` with the active `useLocale` locale, `dateStyle: "medium"` + `timeStyle: "short"`, mono `text-xs text-muted-foreground`, always visible — the app is desktop-first, so there is no `sm:` gate) so the newest version is identifiable at a glance. Optimistic-ish with reload-after; sonner toasts. The page shell only gates on `NOTION_AREAS_DB_ID`.
- **Review wizard** ([app/areas/review/page.tsx](app/areas/review/page.tsx) → [ReviewWizard.tsx](app/areas/review/_components/ReviewWizard.tsx)). A step-per-area wizard. On mount it POSTs `/api/areas/review/diff` to get each live area's done/new/ongoing project sets + the per-area `questions`. **Single-area mode:** the wizard reads `?area=<base>` via `useSearchParams` and, inside the existing mount effect (no new fetch; dep list stays primitive — `[notConfigured, areaParam]`), filters the loaded diff client-side to `base === areaParam`, seeds answers over that one-area subset, and resets `index` to 0; with no `area` param it behaves exactly as before (all areas sequentially). A non-matching/archived `area` simply yields the existing empty screen — no new error route, no backend filter. The single-area subtitle uses `areasReview.singleSubtitle` (`{area}` placeholder). The entry point links here, to `` `${ROUTES.pages.areasReview}?area=${encodeURIComponent(normalize(area.name))}` `` (only the query is appended; the route path comes from `ROUTES`): the **"Diese Area reviewen" / "Review this area"** button in the [AreaDialog.tsx](app/areas/_components/AreaDialog.tsx) footer (`areas.drawer.reviewThis`). *(Phase 2: the per-card "Review" pill was removed — review now runs from the dialog footer only; the `areas.card.review` key remains in `translations.ts` but is no longer rendered.)* Because `useSearchParams` requires it in Next 16, [page.tsx](app/areas/review/page.tsx) wraps `<ReviewWizard />` in `<Suspense fallback={null}>` (same pattern as [app/projects/page.tsx](app/projects/page.tsx)). **Manual new-projects panel (stage 3a):** the question step (the no-draft branch, below the questions and above the draft buttons) renders [AreaProjectsPanel.tsx](app/areas/review/_components/AreaProjectsPanel.tsx) in its own callout — a client component (`{ department: current.base }`, no fetch effect) holding user-added rows `{ name, dueDate, include }`. "+ Projekt hinzufügen" appends an empty row; each row has a name input, a `type=date` input, an include checkbox (already present so stage 3b's AI-prefilled deselectable rows dock without a rebuild), and a remove (×) button. **"Projekte anlegen"** POSTs the included, non-empty rows to `/api/areas/review/projects` (`ROUTES.api.areas.reviewProjects`) as `{ department, projects: [{ name, dueDate: dueDate||null }] }`; the route (`runtime nodejs`) validates `department` non-empty (400 `missing_department`), `projects` is an array (400 `invalid_projects`), 503 `not_configured` when `NOTION_PROJECTS_DB_ID` is unset, then per entry validates a non-empty name + an optional `YYYY-MM-DD` `dueDate` and calls `createAreaProject` **serially** — per-item failures (bad date / Notion error) collect into `failed[]` and never abort the batch (`{ ok, created: [{name,id,url}], failed: [{name,error}] }`). On the client, successfully-created rows are removed, failed rows stay for retry; sonner success / partial-warning / error toasts. This is **independent of the draft/version flow** (a separate button; `/api/areas/review/draft` + `/api/areas/version` are untouched). **AI pre-fill (stage 3b):** the panel also has a **"AI-Vorschläge holen" / "Get AI suggestions"** button (`Sparkles`, label flips to "Denke nach…" while loading) that POSTs `{ area, diff, answers }` to `/api/areas/review/suggest` (`ROUTES.api.areas.reviewSuggest`, `runtime nodejs`). That route reads `roadmap.md` **read-only** via `fs.readFileSync(path.join(process.cwd(), "roadmap.md"))` (same pattern as `/api/areas/focus`; a missing file is a soft-fail — it proceeds **without** roadmap context, never 500), builds a German strict-JSON prompt over the area state + diff + answers + roadmap, calls Sonnet via `roadmapDraft()` + `extractText()`, and parses defensively (strips a ```json fence + slices the first `{...}`; 502 `parse_failed` with raw echoed; 200 soft-fail `generation_failed` on Anthropic error). It returns `{ ok, milestone, milestoneDueDate: YYYY-MM-DD|null, projects: [{ name, dueDate: YYYY-MM-DD|null }] }` (model dates validated to ISO-or-null server-side). On the client the suggested projects are **merged into** the existing rows (appended, fully editable / deselectable / removable — never replacing manually-entered rows), and the suggested milestone shows in a small block above the rows with an **"Übernehmen" / "Adopt"** button that calls `onAdoptMilestone(m, due)` → the wizard writes `milestone` (and `milestone_due` when set) into `answers` via `setAnswer` (only on explicit click, never auto-overwrite), then shows an "Übernommen" marker. Suggest runs **only on button click** (no fetch effect). `roadmap.md` is read-only here and is never written. For each area: shows the project deltas, renders the question form (text/textarea/status/date inputs — status reuses the `areas.status.*` labels). **The `milestone` question is special-cased** to a dedicated [MilestoneField.tsx](app/areas/review/_components/MilestoneField.tsx) (instead of the generic `QuestionField`): it shows the current milestone **read-only** plus a keep / reached / adjust segmented choice (default `keep`) writing to `answers[areaId].milestone_status`; `keep` hides the text field (milestone unchanged), `reached` shows an empty new-milestone field + a hint that the old one is logged in Accomplishments, `adjust` prefills the field with the current wording. The text writes to `answers[areaId].milestone` as before. The AI-suggest **Adopt** (`onAdoptMilestone`) now also flips `milestone_status` `keep` → `adjust` so the adopted text is visible/editable. Then **Create draft** POSTs `/api/areas/review/draft` (Sonnet drafts the new version's properties + Markdown body; rendered as a preview with `react-markdown`). **Approve & write** POSTs the server-computed payload to `/api/areas/version` (creates `Name (vN+1)`, archives the previous version, archives the Done projects). Skippable areas (no movement) can be skipped; per-area `answers` / `drafts` / `written` are tracked in component state. **When `/api/areas/version` returns a non-empty `warnings[]` (a cleanup step — archive-previous or archive-project — failed), the wizard does NOT auto-advance: it stores the raw warning strings per area in a `warnings: Record<areaId, string[]>` state (set only in the approve handler, never via an effect) and renders a persistent amber callout below the preview listing each warning line verbatim plus an explanatory hint (`areasReview.warningsHeading` / `areasReview.warningsHint`) telling Markus the new version was written but the old version / Done projects can be archived manually in `/areas/manage`. **Each warning line also extracts its embedded page URL (`/(https?:\/\/[^\s)]+)/`) and renders an "Open page to archive" link (`areasReview.warningsOpenPage`, `target=_blank`) so he can open + archive that page directly, and the callout has a "Trotzdem weiter" / "Continue anyway" button (`areasReview.warningsContinue`) that calls `goNext()` so he can leave the step.** The callout otherwise stays until he leaves the step (Skip / Back). On zero warnings it auto-advances as before.** Areas with no movement sort last; the wizard ends on a "Review complete" screen. The shell gates on both `NOTION_AREAS_DB_ID` + `NOTION_PROJECTS_DB_ID`. `/api/areas/version` additionally `console.warn("area_version_warning", <detail>)`s each warning server-side so future cleanup failures are traceable in the logs (no change to the archive logic itself).
- Constants: `ROUTES.pages.{areasManage, areasReview}` + `ROUTES.api.areas.{manage, version, archive, reviewDiff, reviewDraft, reviewProjects, reviewSuggest}` in [constants/routes.ts](constants/routes.ts); the question bank in [constants/areas-review.ts](constants/areas-review.ts); ~60 `areasManage.*` / `areasReview.*` / `areasReview.q.*` i18n keys in [constants/translations.ts](constants/translations.ts) (DE+EN) + `areas.review` / `areas.manage` / `areas.drawer.reviewThis` / `areasReview.singleSubtitle` / `areasReview.projects.*` (manual new-projects panel + AI suggest button) / `areasReview.suggest.*` (suggested-milestone block: milestoneTitle / adopt / adopted) / `areas.card.review` (per-card review pill) / `areasReview.warningsOpenPage` + `areasReview.warningsContinue` (warning-callout links + continue button) / `areasReview.milestone.*` (7 keys for the keep/reached/adjust milestone field).
- **Project↔Area link is the `Department` select only** (no Notion relation). The review diff groups projects by `Department === base area name`. "New" projects are those created after the live area page **or** flagged `Created by = AI` (a custom Projects-DB select). `archiveProject()` writes `Status=Archived` directly (bypassing the Archive-DB copy flow); the Phase-3 archive sweep reconciles those into the Archive DB.

**Tab 6 (Resources) — complete:**
- Server shell [app/resources/page.tsx](app/resources/page.tsx) calls `listResources()` and passes the array to [app/resources/_components/ResourcesView.tsx](app/resources/_components/ResourcesView.tsx). Falls back to `notConfigured` props when `NOTION_RESOURCES_DB_ID` is unset, and to `error` props when the Notion call throws — neither state crashes the page. `force-dynamic` so the Notion call doesn't run during static prerender.
- [ResourcesView](app/resources/_components/ResourcesView.tsx) is a client component built on TanStack Table (`getCoreRowModel` + `getSortedRowModel`) — the prior card-grid implementation was replaced because the Resources DB will scale to many entries. **Columns** (in order): Name (no sort header; clickable `<button>` that calls `setSelectedResourceId(row.id)` and opens the drawer), Area (sortable, rendered as muted `<Pill>` or em-dash), Type (sortable, muted pill), Status (sortable, plain text), Tags (no sort; comma-joined string in `max-w-[160px] truncate`), Source (no sort; hostname link with lucide `Link` icon — `e.stopPropagation()` so clicking the link doesn't also open the drawer), Last Reviewed (sortable, monospaced formatted date), Open (fixed 48px column, no header text; lucide `ExternalLink` icon linking to `notionUrl` with `e.stopPropagation()`). The whole row is `cursor-pointer` and the row's `onClick` opens the drawer.
- **Three composing filters**: search input (case-insensitive match against `name + summary`), Area dropdown (unique non-null `resource.area` values from the data, sorted A–Z — NOT from the `DEPARTMENTS` constant; the Resources DB uses its own area names), Type dropdown (unique values from the data). All three filters AND together. The "Add Note" button moved from the page header into the filter bar row with `ml-auto` so it sits on the right end.
- [ResourceDrawer](app/resources/_components/ResourceDrawer.tsx) — shadcn `Sheet` at `w-[min(90vw,1400px)] sm:max-w-[min(90vw,1400px)]`. Same `MetaRow` 2-column pattern as ProjectDrawer and AreaDrawer. 8 read-only rows: Area (`LayoutGrid`), Type (`BookOpen`), Status (`CircleDashed`), Confidence (`Gauge`), Tags (`Tag` — comma-joined), Source (`LinkIcon` — `<a>` with hostname), Last Reviewed (`CalendarDays`), Created (`CalendarDays` — `page.created_time`). Bottom zone lazy-fetches `/api/resources/[id]/blocks` and renders via `<PageBodyRenderer />` **imported from [app/projects/_components/PageBodyRenderer.tsx](app/projects/_components/PageBodyRenderer.tsx)** (reused, not copied). 3-line skeleton during load; muted `blocks.empty` message when there are no blocks. Block-fetch effect follows the loop-safe pattern: deps `[resourceId]` only, guard `if (!resourceId || cache[resourceId]) return` — short-circuits on the presence of any entry, not on loaded data. ESLint `exhaustive-deps` suppressed with a comment. **Drawer source is the full `resources` state, not the filtered list**, so the drawer stays open if a subsequent filter change would otherwise hide its row.
- [AddResourceDialog](app/resources/_components/AddResourceDialog.tsx) is a shadcn Dialog (`sm:max-w-xl`) with Name (required), Area select (options fetched live on mount from `/api/resources/options` — the Resources DB's own 18-value Area taxonomy, *not* the Projects departments; the select is disabled while loading and falls back to a free-text input with a one-time error toast on fetch failure), Type select (hardcoded `Note / Reference / Link / Template / Other`), and a multi-line Body textarea. Submit posts to `/api/resources/create`; on success the new resource is prepended to local state via `onCreated`. Sonner toasts on success / error. No optimistic UI.
- API routes (all server-only, runtime `nodejs`):
  - `GET /api/resources` — returns `{ ok: true, resources }`. 503 `not_configured` when `NOTION_RESOURCES_DB_ID` is unset.
  - `POST /api/resources/create` — body `{ name, area?, type?, body? }`. Validates types, builds a `ResourceDraft`, calls `createResource`. 503 / 500 / 400 as appropriate.
  - `GET /api/resources/[id]/blocks` — returns `{ ok: true, blocks }` from `getResourcePageBlocks(id)`. Uses the Next 16 `Promise<{ id: string }>` params shape consistent with the rest of this repo. 400 on missing id, 500 on Notion error.
  - `GET /api/resources/options` — returns `{ area: SelectOption[] }` (each option with its Notion `color`) from `fetchResourceSelectOptions("Area")` on the Resources data source. Mirrors `/api/projects/options`; powers the Add-Note dialog's Area select. Constant: `ROUTES.api.resources.options`.
- New helpers in [lib/notion.ts](lib/notion.ts) (additive): `listResources()` (paginates up to 200 results, sorts by Name asc), `createResource(draft)` (creates the page with `parent: { type: "data_source_id", data_source_id }` per 2025-09-03, then calls `appendTextBlocks(page.id, body)` when body is non-empty), `getResourcePageBlocks(pageId)` (thin alias over `getPageBlocks`), types `NotionResource` + `ResourceDraft`. Module-level `resourcesDataSourceId` cache. The DB's `Confidence` property has no fixed schema type, so the extractor (`asConfidence`) probes `select` → `number` → `rich_text` → `formula` in order and stringifies whichever shape arrives — defensive against later schema edits.
- Constants added: `ROUTES.api.resources.list` (`/api/resources`), `ROUTES.api.resources.create` (`/api/resources/create`), `ROUTES.api.resources.blocks(id)` (`/api/resources/${id}/blocks` — parameterized function using `encodeURIComponent`). 38 `resources.*` i18n keys total in [constants/translations.ts](constants/translations.ts) (DE + EN) — 22 from the initial build + 16 added in the table/drawer rewrite (one filter, 8 field labels for the drawer, 7 column headers for the table).
- Archive **browsing** inside Tab 6 is deferred — Tab 6 surfaces only the Resources DB. Archiving *into* the Archive DB is built (see Archive automation below).

**Tab 7 (Calls) — transcript → Call Notes (Phase 1):**
- The Calls tab is the in-app replacement for the external "Call Miner" Cowork skill's manual flow. Markus pastes a Loom link plus the call transcript; a server route analyses the transcript with Anthropic (detects Sales/Client/Coaching/Other, builds the deliverable body the way the skill does) and writes a page to the Notion Call Notes DB. **Loom is never scraped server-side** (JS-rendered, no stable API) — the transcript is pasted, and the Loom URL is stored as a `Loom: <url>` reference line at the top of the page body. **Phase 1 only:** form + analysis + Call-Notes write + recent list. No 06-Brand writes (Client Language Bank / Brand OS) — that is Phase 2/3.
- Server shell [app/calls/page.tsx](app/calls/page.tsx) (`force-dynamic`) mounts the client component [app/calls/_components/CallsView.tsx](app/calls/_components/CallsView.tsx): a form (Loom URL, large transcript textarea, Call-Type `Select` defaulting to "Auto-detect", optional Client `Select` loading `/api/clients` on mount, optional Date defaulting to today) + a recent-calls list (`/api/calls/list`). "Analysieren & speichern" POSTs `/api/calls/mine`, disables while in flight, sonner toast with a Notion-link action on success, error-code→i18n mapping on failure. The recent-list fetch follows the loop-safe pattern — a primitive `refreshKey` dep bumped after a successful save; the effect's guard short-circuits on the cancelled flag. Locale toggles don't refetch (`tRef` pattern).
- Shared write path lives in [lib/calls.ts](lib/calls.ts) (`persistCallNote` + `CallNoteError`) — see Library files. The analysis prompt lives in [lib/call-miner-prompt.ts](lib/call-miner-prompt.ts) — see Library files. The reader is `listCallNotes()` in [lib/notion.ts](lib/notion.ts). Routes: `/api/calls/mine`, `/api/calls/list` (and the reused-but-refactored `/api/calls/create`) — see the route-handlers list above.
- Constants: `ROUTES.pages.calls`, `ROUTES.api.calls.{mine,list}` (create kept) in [constants/routes.ts](constants/routes.ts); `nav.calls` + ~35 `calls.*` i18n keys in [constants/translations.ts](constants/translations.ts) (DE + EN). The "Calls" tab is the 7th tab in [components/TopNav.tsx](components/TopNav.tsx). `/api/calls/mine` + `/api/calls/list` are gated by the password proxy (called from authenticated UI); only `/api/calls/create` stays on the proxy allowlist for the external skill.

**Tab 8 (Freizeit) — leisure tracker (Filme/Serien/Videospiele), complete (2026-06-08):**
- A PARA-adjacent Notion DB "🧸 08 Freizeit" for quickly capturing film/series/game ideas with fast check-off. The default view shows only **active** items (Offen + Läuft); Erledigt drops out of the active list but stays reachable as history.
- **Backend** (built 2026-06-08, pre-UI): DB-creation script [scripts/create-freizeit-db.mjs](scripts/create-freizeit-db.mjs) (one-shot, run by Markus with `node --env-file=.env.local`, same parent page as the Areas DB) creates the DB + logs the 32-char ID + URL. Schema: `Name` (title), `Kategorie` (select: Film/Serie/Videospiel), `Status` (select: Offen/Läuft/Erledigt), `Erledigt am` (date), `Link` (url), `Notiz` (rich_text). Capture time is the system `created_time`, not a property. `NOTION_FREIZEIT_DB_ID` is pasted into `.env.local` after running it.
- Constants: [constants/freizeit.ts](constants/freizeit.ts) (`FREIZEIT_CATEGORIES` + `FreizeitCategory`, `FREIZEIT_STATUSES` + `FreizeitStatus` — case-sensitive, must match Notion options); `ROUTES.pages.freizeit` (`/freizeit`) + `ROUTES.api.freizeit.{list, create, item(id), blocks(id)}` in [constants/routes.ts](constants/routes.ts).
- [lib/notion.ts](lib/notion.ts) additive helpers (existing exports unchanged): module-level `freizeitDataSourceId` cache (lazy, resolved from `NOTION_FREIZEIT_DB_ID`, throws when unset), types `NotionFreizeitItem` (incl. `cover: string | null`) / `FreizeitDraft` (incl. optional `cover`) / `FreizeitUpdateField` (incl. `"Cover"`), `listFreizeit()` (paginates, projects explicit fields incl. the `Cover` url property, sorts created_time desc), `createFreizeitItem(draft)` (data_source_id create, Status default "Offen", optional `Cover` url, non-fatal body append), `updateFreizeitItem(pageId, patch)` (Status/Erledigt am/Link/Notiz/Cover), `getFreizeitPageBlocks(pageId)` (alias over `getPageBlocks`), `ensureFreizeitCoverProperty()` (additive + idempotent — adds the `Cover` url property to the Freizeit data source via `dataSources.update` if missing; used by the backfill script).
- Routes (all server, runtime `nodejs`, 503 when `NOTION_FREIZEIT_DB_ID` unset): `GET /api/freizeit` → `{ ok, items }`; `POST /api/freizeit/create` (body `{ name, category?, link?, note?, body? }`; 400 `missing_name` / `invalid_category`); `PATCH /api/freizeit/[id]` (body `{ status?, link?, note? }`; 400 `invalid_status`; **server-side done-date tracker** — sets `Erledigt am` to today (in `settings.timezone`) on `status="Erledigt"`, clears it when status moves back to Offen/Läuft); `GET /api/freizeit/[id]/blocks` → `{ ok, blocks }`.
- **UI** (built 2026-06-08; the TanStack-table rendering described in this bullet was **replaced 2026-06-08 by the card-grid redesign** — see the dedicated redesign bullet below. Server shell, props posture, filters, `changeStatus`, drawer wiring + add-dialog are unchanged; only the rendering changed.): server shell [app/freizeit/page.tsx](app/freizeit/page.tsx) (`force-dynamic`) calls `listFreizeit()` and mounts [FreizeitView.tsx](app/freizeit/_components/FreizeitView.tsx); falls back to `notConfigured` (missing env) / `error` (Notion throw) props without crashing — same posture as `app/resources/page.tsx`. [FreizeitView.tsx](app/freizeit/_components/FreizeitView.tsx) was a TanStack-Table client component (`getCoreRowModel` + `getSortedRowModel`) mirroring `ResourcesView`. **Columns:** Name (no sort, clickable button → drawer), Kategorie (sortable, colour-tinted pill), Status (**inline-editable** shadcn `Select` over `FREIZEIT_STATUSES`), Erledigt am (sortable, mono date), Notiz (no sort, truncate), Link (no sort, hostname link + `ExternalLink`, `e.stopPropagation`, only when set), Hinzugefügt (sortable, mono date from `createdTime`), Open (Notion-link icon col). **Three AND-composing filters:** search (case-insensitive over Name + Notiz), Kategorie dropdown (`FREIZEIT_CATEGORIES` + "Alle Kategorien"), Status dropdown (**"Aktiv" = default**, = Offen + Läuft, plus Offen / Läuft / Erledigt / Alle). The "Hinzufügen" button (`ml-auto`) opens the add dialog. **Inline status edit (core "abhaken" UX):** changing status in the cell OR the drawer calls `changeStatus` → optimistic local set (status + doneDate: today on → Erledigt, cleared on → Offen/Läuft, mirroring the server tracker), PATCH `ROUTES.api.freizeit.item(id)`, sonner toast + revert on failure. The status cell `<td>` stops row-click propagation so editing it doesn't open the drawer. Drawer source is the **full** `items` state (not the filtered list), so it stays open if a status/filter change would hide the row.
- [FreizeitDrawer.tsx](app/freizeit/_components/FreizeitDrawer.tsx) — shadcn `Sheet` at `w-[min(90vw,1400px)] sm:max-w-[min(90vw,1400px)]`, same `MetaRow` 2-col pattern. Rows: Kategorie (read-only pill text), Status (editable `Select` → same `changeStatus` path), Erledigt am (read-only date), Link (read-only `<a>` host), Notiz (read-only), Hinzugefügt (read-only date). Bottom zone lazy-fetches `ROUTES.api.freizeit.blocks(id)` and renders via `<PageBodyRenderer />` **imported from [app/projects/_components/PageBodyRenderer.tsx](app/projects/_components/PageBodyRenderer.tsx)** (reused, not copied); 3-line skeleton on load, empty body → "Open in Notion" link. Block-fetch effect follows the loop-safe pattern: deps `[freizeitId]` only, guard `if (!freizeitId || cache[freizeitId]) return`, `exhaustive-deps` suppressed with a comment.
- [AddFreizeitDialog.tsx](app/freizeit/_components/AddFreizeitDialog.tsx) — shadcn Dialog (`sm:max-w-xl`): Name (required), Kategorie `Select` (`FREIZEIT_CATEGORIES`), Link (url input), Notiz (input), Body (textarea). Submit POSTs `ROUTES.api.freizeit.create`; on success prepends the new item to local state via `onCreated`. Sonner toasts; no optimistic UI (like `AddResourceDialog`). Shared FE helpers/types in [app/freizeit/_components/types.ts](app/freizeit/_components/types.ts) (`FreizeitItem` alias, filter sentinels, `todayLocalIso`, `safeHostname`, `safeFormat`).
- TopNav: Freizeit is the 8th tab in [components/TopNav.tsx](components/TopNav.tsx) (after Calls), `lucide` `Gamepad2` icon, label `nav.freizeit`. Constants: `nav.freizeit` + ~45 `freizeit.*` i18n keys in [constants/translations.ts](constants/translations.ts) (DE + EN). Mobile mirrors the Resources pattern (`overflow-x-auto` table, stacking `MetaRow` grid in the drawer).
- **Cover-art layer (2026-06-08).** *(The UI now renders these covers — see the card-grid redesign bullet below; this bullet documents the data/backend layer.)* Real cover images are resolved per category and stored in a new Notion `Cover` (url) property on the Freizeit DB — the Notion property is the cache, no Supabase table. Resolution ([lib/freizeit-covers.ts](lib/freizeit-covers.ts), `import "server-only"`): `resolveCover({ name, category })` strips title prefixes ("Movie" / "Anime Movie" / "Series" + leading "Film "/"Serie ") before searching (the display name is untouched), then — **Videospiel** → Steam Storefront search (`store.steampowered.com/api/storesearch/?term=…&cc=us&l=en`, no API key) → first result's app id → `cdn.cloudflare.steamstatic.com/steam/apps/<appid>/header.jpg`; **Film** → TMDB `GET /3/search/movie`; **Serie** → TMDB `GET /3/search/tv` → first `poster_path` → `https://image.tmdb.org/t/p/w342<poster_path>` (TMDB auth = `Authorization: Bearer ${TMDB_API_KEY}`). **Best-effort:** every failure (network, no hit, missing `TMDB_API_KEY`, timeout via 8s `AbortController`) resolves to `null` + `console.warn` — `resolveCover` never throws and never blocks the create flow; external calls are serial (one HTTP call per resolve). Endpoints/bases are constants in [constants/freizeit.ts](constants/freizeit.ts) (`STEAM_SEARCH_URL`, `STEAM_HEADER_URL(appid)`, `TMDB_API_BASE`, `TMDB_SEARCH_MOVIE_PATH`, `TMDB_SEARCH_TV_PATH`, `TMDB_IMAGE_BASE`) — no inline URLs. `POST /api/freizeit/create` now best-effort-resolves a cover after the item is created and writes it via `updateFreizeitItem({ cover })`; a miss/error is logged (`cover_resolve_failed`) and the item is still returned (non-blocking). `GET /api/freizeit` returns the new `cover` field per item. **Backfill:** [scripts/backfill-freizeit-covers.mjs](scripts/backfill-freizeit-covers.mjs) (one-shot, `node --env-file=.env.local`; **run by Markus after setting `TMDB_API_KEY`**) ensures the `Cover` property exists, loads all items, resolves covers **only for items without an existing cover** (manual overrides are never overwritten), writes serially with ~300ms spacing, and logs a final hit-list + MISS-list (name + category) so misses can be set manually. The script is plain `.mjs` (node, no tsx) so it replicates the resolver/ensure-property logic inline, mirroring the endpoint constants. New env var: `TMDB_API_KEY` (free TMDB read access token; Steam needs none).
- **Card-grid redesign (2026-06-08, replaces the TanStack table).** [FreizeitView.tsx](app/freizeit/_components/FreizeitView.tsx) now renders a cover-art card grid instead of a table. **Data loading, filter state, `changeStatus` (optimistic + revert + toast), the add-dialog and the drawer wiring are unchanged** — only the rendering was swapped. Filtered items are split into **two sections** — "Filme & Serien" (`freizeit.section.filmSeries` — Film + Serie + unknown-category) and "Videospiele" (`freizeit.section.games` — Videospiel), each with an icon (`Clapperboard` / `Gamepad2`) + total count. Within a section, cards are grouped into **status shelves** in `FREIZEIT_STATUSES` order (Offen → Läuft → Erledigt) under shelf labels `freizeit.shelf.{Offen|Läuft|Erledigt}` ("Als Nächstes"/"Up next", "Läuft gerade"/"In progress", "Erledigt"/"Done"). The existing **status filter still drives which shelves appear** (default `Aktiv` = Offen + Läuft, so the Erledigt shelf is hidden until `Alle` or `Erledigt` is picked); the category filter hides whole sections/cards. Empty shelves/sections are not rendered; the `freizeit.empty` state shows when nothing matches. Grid columns differ per section: films/series `minmax(120px,1fr)` (portrait), games `minmax(220px,1fr)` (landscape). [FreizeitCard.tsx](app/freizeit/_components/FreizeitCard.tsx) (new) is one card: a plain `<img loading="lazy">` cover (**no next/image**, no domain config) with `object-fit:cover`; on `onError` **or** a null `item.cover` it falls back to a category-tinted block (`categoryFallbackTone`) with a centered lucide icon (`Clapperboard`/`Tv`/`Gamepad2`) via the static `CategoryIcon` component (avoids `react-hooks/static-components`). Aspect ratio is per category — **portrait `aspect-[2/3]`** for Film/Serie, **landscape `aspect-[460/215]`** for Videospiel (`coverAspectClass`). Below the cover: title (truncate) + optional note line + a compact status `Select` that routes through the shared `changeStatus` (so the card moves to the right shelf optimistically); clicking the card body opens the drawer, the status control uses `e.stopPropagation()`. The shared `CoverImage` + `CategoryIcon` components are exported from `FreizeitCard.tsx` and reused by the drawer. [FreizeitDrawer.tsx](app/freizeit/_components/FreizeitDrawer.tsx) now shows the cover at the top (same `CoverImage` fallback pattern; games capped at `max-w-[480px]` landscape, films/series `w-[200px]` portrait), everything else (editable status, loop-safe lazy block-fetch, `PageBodyRenderer`) unchanged. New presentation helpers live in [app/freizeit/_components/types.ts](app/freizeit/_components/types.ts): `sectionForCategory`, `coverAspectClass`, `categoryFallbackTone` (`FreizeitItem.cover` already carried `string | null`). New i18n keys (DE+EN): `freizeit.section.{filmSeries,games}`, `freizeit.shelf.{Offen,Läuft,Erledigt}`, `freizeit.cover.alt`.

**Tab 9 (Bücher) — personal library tracker, complete (2026-06-08):**
- A PARA-adjacent Notion DB "📚 09 Bücher" for tracking books with a reading status + tags + start/end dates. Modelled 1:1 on the Freizeit backend + card-grid UI (Notion DB → server-side cover resolver → API routes → cover-art card grid with status shelves). Unlike Freizeit there are **no category sections** — books are one collection, grouped only into the three status shelves; the status filter defaults to **"Alle"** (all three shelves visible), and covers are always portrait (`aspect-[2/3]`).
- **DB-creation script** [scripts/create-buecher-db.mjs](scripts/create-buecher-db.mjs) (one-shot, plain `.mjs` / node, run by Markus with `node --env-file=.env.local`, same parent page as the Areas/Freizeit DBs) creates the DB titled "📚 09 Bücher" + logs the 32-char ID + URL. Schema: `Name` (title), `Autor` (rich_text), `Status` (select: Gelesen/Aktuell/Demnächst), `Tags` (multi_select, seeded Business/Mindset/Fiction/Finance — extensible in Notion), `Startdatum` (date), `Enddatum` (date), `Link` (url), `Cover` (url), `Notiz` (rich_text). Capture time is the system `created_time`, not a property. `NOTION_BUCHER_DB_ID` is pasted into `.env.local` after running it.
- Constants: [constants/buecher.ts](constants/buecher.ts) (`BUCHER_STATUSES` + `BucherStatus`, `BUCHER_TAGS` + `BucherTag` — case-sensitive, must match Notion options; cover-endpoint constants `GOOGLE_BOOKS_SEARCH_URL`, `OPENLIBRARY_SEARCH_URL`, `OPENLIBRARY_COVER_URL(coverId,size)` — no inline URLs); `ROUTES.pages.buecher` (`/buecher`) + `ROUTES.api.buecher.{list, create, item(id), blocks(id)}` in [constants/routes.ts](constants/routes.ts).
- [lib/notion.ts](lib/notion.ts) additive helpers (existing exports unchanged): module-level `bucherDataSourceId` cache (lazy, resolved from `NOTION_BUCHER_DB_ID`, throws when unset), types `NotionBuch` (incl. `tags: string[]` + `cover: string | null`) / `BuchDraft` (incl. optional `tags`/`cover`) / `BuchUpdateField` (incl. `"Cover"`), `listBuecher()` (paginates, projects explicit fields incl. `Tags` multi_select + `Cover` url, sorts created_time desc), `getBuch(pageId)` (single-page read used by the PATCH route's "stamp date only if empty" logic), `createBuch(draft)` (data_source_id create, Status default "Demnächst", optional Tags/Link/Notiz/Cover, non-fatal body append), `updateBuch(pageId, patch)` (Status / Startdatum / Enddatum / Link / Notiz / Cover), `getBuchPageBlocks(pageId)` (alias over `getPageBlocks`), `ensureBuchCoverProperty()` (additive + idempotent — adds the `Cover` url property via `dataSources.update` if missing).
- **Cover resolver** [lib/buecher-covers.ts](lib/buecher-covers.ts) (`import "server-only"`): `resolveCover({ name, author })` — **best-effort, never throws**, returns `string | null`, 8s `AbortController` timeout, serial external calls. **Google Books primary** (`/books/v1/volumes?q=intitle:<title>+inauthor:<author>` → first `volumeInfo.imageLinks.thumbnail`, rewritten to https + `zoom=1`), **OpenLibrary fallback** on miss (`/search.json?title=&author=` → first `docs[].cover_i` → `covers.openlibrary.org/b/id/<id>-L.jpg`). Every failure (network, no hit, timeout) → `null` + `console.warn`. Both APIs are keyless; optional `GOOGLE_BOOKS_API_KEY` only raises the quota. Mirrors [lib/freizeit-covers.ts](lib/freizeit-covers.ts).
- Routes (all server, runtime `nodejs`, 503 when `NOTION_BUCHER_DB_ID` unset): `GET /api/buecher` → `{ ok, items }`; `POST /api/buecher/create` (body `{ name, author?, tags?, link?, note?, body? }`; 400 `missing_name`; after creating, best-effort `resolveCover` → `updateBuch({ cover })`, a miss/error logs `cover_resolve_failed` and the item is still returned — non-blocking); `PATCH /api/buecher/[id]` (body `{ status?, startDate?, endDate?, link?, note? }`; 400 `invalid_status`; **server-side reading-date tracker** — `status="Aktuell"` stamps `Startdatum` with today (in `settings.timezone`) only when currently empty, `status="Gelesen"` stamps `Enddatum` the same way, moving back to "Demnächst" leaves both dates untouched; the "only if empty" check reads the page via `getBuch` only for those two statuses, soft-failing the stamp on a read error); `GET /api/buecher/[id]/blocks` → `{ ok, blocks }`.
- **UI (Phase 2, 2026-06-08).** Server shell [app/buecher/page.tsx](app/buecher/page.tsx) (`force-dynamic`) calls `listBuecher()` and mounts [BuecherView.tsx](app/buecher/_components/BuecherView.tsx); falls back to `notConfigured` (missing env) / `error` (Notion throw) props without crashing — same posture as `app/freizeit/page.tsx`. [BuecherView.tsx](app/buecher/_components/BuecherView.tsx) is the card-grid client component: loads books into state, **three AND-composing filters** — search (case-insensitive over Name + Autor), Tag dropdown (`BUCHER_TAGS` + "Alle Tags"; matches when the book carries the tag), Status dropdown (**"Alle" = default**, plus Gelesen / Aktuell / Demnächst). Filtered books are grouped into **three status shelves** in `BUCHER_SHELF_ORDER` (top→bottom: **Aktuell → Demnächst → Gelesen** — i.e. "Lese ich gerade" → "Leseliste" → "Gelesen"; this display order is intentionally separate from `BUCHER_STATUSES`, which still drives validation + the Status-select option order), each with a label heading (`buecher.shelf.{Status}`) + count; empty shelves aren't rendered; a null/unknown status lands in the Demnächst shelf. `buecher.empty` shows when nothing matches. The "Hinzufügen" button (`ml-auto`) opens the add dialog. **Optimistic `changeStatus`** (shared by cards + drawer): local set + reading-date mirror (today on `startDate` when → Aktuell if empty, today on `endDate` when → Gelesen if empty), PATCH `ROUTES.api.buecher.item(id)`, sonner toast + revert on failure. Drawer source is the **full** `items` state (not the filtered list), so it stays open if a status/filter change would hide the card. [BuchCard.tsx](app/buecher/_components/BuchCard.tsx) is one card: a plain `<img loading="lazy">` portrait cover (**no next/image**) with `object-fit:cover`; on `onError` **or** a null `item.cover` it falls back to an amber-tinted block with a centered lucide `BookOpen` via the static `CategoryIcon` component. Below the cover: title (`line-clamp-2` — up to 2 lines before ellipsis) + author line (truncate, muted) + small Tag chips + a compact status `Select` routing through `changeStatus` (card moves to the right shelf optimistically); clicking the card body opens the drawer, the status control uses `e.stopPropagation()`. **Equal-height cards (Phase 3, 2026-06-08):** the card root is `h-full` (stretches in the `items-stretch` grid), the content area is `flex flex-1 flex-col`, and the status-`Select` wrapper is `mt-auto` — so every status dropdown in a shelf row sits at the same height regardless of whether the card has a Tag chip or a one- vs two-line title. The shared `CoverImage` + `CategoryIcon` are exported from `BuchCard.tsx` and reused by the drawer. [BuchDrawer.tsx](app/buecher/_components/BuchDrawer.tsx) — shadcn `Sheet` at `w-[min(90vw,1400px)]`, `MetaRow` 2-col pattern, portrait cover at top (`w-[200px]`). Rows: Autor (read-only), Status (editable `Select` → `changeStatus`), Startdatum / Enddatum (read-only dates), Tags (read-only chips), Link (read-only host `<a>`), Notiz (read-only), Hinzugefügt (read-only `createdTime`). Bottom zone lazy-fetches `ROUTES.api.buecher.blocks(id)` and renders via `<PageBodyRenderer />` **imported from [app/projects/_components/PageBodyRenderer.tsx](app/projects/_components/PageBodyRenderer.tsx)** (reused, not copied); 3-line skeleton on load, empty body → "Open in Notion" link. Block-fetch effect is loop-safe: deps `[buchId]` only, guard `if (!buchId || cache[buchId]) return`, `exhaustive-deps` suppressed with a comment. [AddBuchDialog.tsx](app/buecher/_components/AddBuchDialog.tsx) — shadcn Dialog (`sm:max-w-xl`): Name (required), Autor (input), **Tags as lightweight toggle-chips** over `BUCHER_TAGS` (multi-select, no new dependency, no multi-select package), Link (url input), Notiz (input), Body (textarea). **No Status field** — the server defaults new books to "Demnächst". Submit POSTs `ROUTES.api.buecher.create`; on success prepends the new book to local state via `onCreated`. Sonner toasts; no optimistic UI (like `AddFreizeitDialog`). Shared FE helpers/types in [app/buecher/_components/types.ts](app/buecher/_components/types.ts) (`Buch` alias, filter sentinels `FILTER_ALL`/`TAG_ALL`, `COVER_ASPECT_CLASS`, `COVER_FALLBACK_TONE`, `todayLocalIso`, `safeHostname`, `safeFormat`).
- TopNav: Bücher is the 9th tab in [components/TopNav.tsx](components/TopNav.tsx) (after Freizeit, before Inbox), lucide `BookMarked` icon, label `nav.buecher`. Constants: `nav.buecher` + ~50 `buecher.*` i18n keys in [constants/translations.ts](constants/translations.ts) (DE + EN). The seed `BUCHER_TAGS` are rendered verbatim (proper nouns — no per-tag translation key).

**Tab 10 (Development) — dev-work view over the Projects DB, complete (2026-06-13):**
- A planning view over the existing Notion **Projects DB**, filtered to `Department = "Development"`. Reads live from Notion (no mirror) and renders **product-first**: one section per product, each sub-grouped by Dev Type. No new Notion DB — dev items are normal projects carrying two added select properties (`Product`, `Dev Type`) plus the `Development` Department option. See the Projects DB table in PARA Data Model for the property definitions.
- **Project type + mapper (additive, [lib/notion.ts](lib/notion.ts)):** the shared `Project` type gained `product: string | null` + `devType: string | null`, read in `toProject` via `asSelect(p["Product"])` / `asSelect(p["Dev Type"])` — **without `requireProp`**, so the fields are purely additive (a page missing them maps to null; every existing helper — `listActiveProjects` / `listProjectsForViews` / `listProjectsByStatus` / `createProject` / `createClientProject` — keeps working and now just populates the two extra fields). New helper `listDevelopmentProjects()` queries the Projects data source with `filter: { property: "Department", select: { equals: "Development" } }` (Department is a `select`, not a `status`), paginates, and maps via `toProject` — same projection as `listActiveProjects`, all statuses.
- **Route:** `GET /api/development` ([app/api/development/route.ts](app/api/development/route.ts), runtime `nodejs`) → `{ ok: true, projects }` from `listDevelopmentProjects()`; 503 `{ error: "not_configured" }` when `NOTION_PROJECTS_DB_ID` is unset, 500 `list_failed` on a Notion throw. Mirrors the error posture of `/api/resources`.
- **UI:** server shell [app/development/page.tsx](app/development/page.tsx) (`force-dynamic`) calls `listDevelopmentProjects()` and mounts [DevelopmentView.tsx](app/development/_components/DevelopmentView.tsx); falls back to `notConfigured` / `error` props without crashing (same posture as `app/resources/page.tsx`). [DevelopmentView.tsx](app/development/_components/DevelopmentView.tsx) is the client component: seeds `items` from props, holds the drawer selection + three AND-composing filters — **Dev Type** dropdown (`DEV_TYPES` + "all"), a **5-bucket Status filter** (`DEV_STATUS_BUCKETS`: Alle / Aktiv / Backlog / Erledigt / Nicht relevant, **default `active`** via `DEFAULT_DEV_STATUS_BUCKET`; filtering is by `matchesDevStatusBucket` — `active` excludes Backlog/Done/Archived/Nicht relevant), and a **text search over Name**. No Product filter (products are the sections). `filteredItems` re-derives from the selected bucket, so an inline Status change that no longer matches the active bucket **drops the row** (same UX as the Projects view presets). It loads live Notion Status options (name + colour) once on mount from `/api/projects/options` (loop-safe: empty deps, non-fatal) into a `BadgeOption[]` (`statusBadgeOptions`) — the new `Nicht relevant` option appears automatically — used to feed the inline Status control on each row. Sections are built in `PRODUCTS` order + a trailing **"Ohne Produkt"** bucket for items whose `Product` is null / unknown (so nothing is hidden — `Sonstiges` is intentionally **not** a Notion option). [DevSection.tsx](app/development/_components/DevSection.tsx) renders one product section: a prominent header (text-lg + count pill + bottom divider), then the product's items grouped by Dev Type in `DEV_TYPES` order (plus a trailing **"Ohne Typ"** group) under a muted uppercase sub-header with a trailing divider line. **Each item is a distinct card** (`rounded-lg border border-border bg-card p-3 shadow-sm` + hover `border-foreground/20 bg-muted/40`, theme tokens only — no hardcoded hex): a clickable body button (Priority dot via `notionColour` + Name + Dev Type badge via `notionColourBg`/`notionColourText`) plus an **inline Status pill** that **reuses [OptionBadgeSelect](app/projects/_components/cells/OptionBadgeSelect.tsx) unchanged** (same component the Projects table uses). The inline control sits in a sibling `<div>` with `stopPropagation` (click + pointerdown) so editing Status never opens the drawer; its `onChange` routes through the existing optimistic `handleUpdate` → `postProjectUpdate` (`/api/projects/update`) + sonner toast + revert, **including the Status→Archived archive-and-drop path** (and `Nicht relevant`, which validates because it is in `PROJECT_VIEW_STATUSES`). Items sort by Priority (High → Medium → Low). Empty sections/types render nothing; an overall `development.empty` state shows when no item matches. Clicking a row body opens the **reused** [ProjectDrawer](app/projects/_components/ProjectDrawer.tsx) (no edits) for full detail + **title edit** (title stays drawer-only). So Status (inline + drawer) / Priority / Department / Name / Due Date / Next Action edits all work from this tab; the drawer body uses the existing `/api/projects/blocks` route. **`Product` / `Dev Type` are display-only here** (the reused drawer has no field for them — edit in Notion).
- TopNav: Development is the 2nd tab in [components/TopNav.tsx](components/TopNav.tsx), **directly after Projects**, lucide `Code2` icon, label `nav.development`. Constants: `ROUTES.pages.development` (`/development`) + `ROUTES.api.development.list` (`/api/development`) in [constants/routes.ts](constants/routes.ts); `constants/development.ts` (`PRODUCTS` / `DEV_TYPES` / `DEVELOPMENT_DEPARTMENT`); `nav.development` + ~13 `development.*` i18n keys in [constants/translations.ts](constants/translations.ts) (DE + EN).

**Tab 11 (Weekly Journal) — read-only weekly-wins view, complete (2026-06-13):**
- A **read-only** tab over two new Notion DBs — Weekly Journal (one row per ISO week: `Name` title, `Woche (Start)` date = the Monday, `Status` select Entwurf/Abgeschlossen) and Erfolge (one row per win: `Name` title, `Kategorie` select, `Area` select-tag, `Woche` relation→Weekly Journal, `Status` status Not started/In progress/Done). Capture stays in Notion — Business Hub never writes here (no create/update/PATCH). Mirrors the Development/Freizeit read-only posture.
- **Pure logic** lives in [lib/journal.ts](lib/journal.ts) (**no `import "server-only"`, no React, no Notion client** — framework-agnostic so it is unit-tested in plain node): DTO types `JournalWeek` / `Erfolg`; pure mappers `mapWeek(page)` / `mapErfolg(page)` (local `as*`-style extractors incl. a `relation`-id reader — the first relation reader in the repo) + `normalizeId`; `erfolgeForWeek(erfolge, weekId)` / `groupErfolgeByWeek` (win↔week join on the `Woche` relation, dash/case-insensitive); ISO-week helpers `isoWeekday` / `mondayOf` / `addDaysIso` / `isoWeekNumber` / `formatDmy` / `kwLabel` / `weekRangeLabel` (all UTC, **"today" is always a caller-supplied ISO param — never reads the wall clock**); `computeOverdue({ weeks, todayIso, thresholdWeekday })` → `{ ueberfaellig, fehlendeKw }` (overdue = the current ISO week has no `Abgeschlossen` Weekly-Journal row AND today's ISO weekday ≥ threshold; threshold defaults to `OVERDUE_THRESHOLD_WEEKDAY`=7/Sunday). Covered by **18 vitest unit tests** in [lib/journal.test.ts](lib/journal.test.ts) (mappers, win↔week assignment, ISO helpers, overdue with several fixed "today" dates).
- **Server reads** in [lib/notion.ts](lib/notion.ts) (additive — no existing export changed): module-level `journalWeeksDataSourceId` / `erfolgeDataSourceId` caches + resolvers (lazy `databases.retrieve` from `NOTION_WEEKLY_JOURNAL_DB_ID` / `NOTION_ERFOLGE_DB_ID`), `listJournalWeeks()` (sorts `Woche (Start)` desc, capped 5 pages) and `listErfolge()` (capped 10 pages) — both map each page via the pure `mapWeek` / `mapErfolg`. The pure mappers + types are imported from [lib/journal.ts](lib/journal.ts).
- **Route + page:** `GET /api/journal` ([app/api/journal/route.ts](app/api/journal/route.ts), `runtime nodejs`) returns `{ ok, weeks, erfolge }` in one shot; 503 `not_configured` when either env var is unset, 500 `list_failed` on a Notion throw (mirrors `/api/development`). Server shell [app/journal/page.tsx](app/journal/page.tsx) (`force-dynamic`) fetches both via `Promise.all` and degrades to `notConfigured` / `error` props without crashing.
- **UI** ([app/journal/_components/](app/journal/_components/)): [JournalView.tsx](app/journal/_components/JournalView.tsx) is the orchestrator (reads today's LOCAL date at the edge via `localTodayIso()` — the only wall-clock read — and passes it into the pure helpers). It renders an **overdue banner** (amber, links to `JOURNAL_NOTION_DB_URL` in Notion) when `computeOverdue` fires, a **Week ⇄ Bereich-Timeline** mode toggle, and either: (a) **Week mode** — a prev/next/"Diese Woche" switcher (default = current ISO week, week identity via the Monday from `Woche (Start)`) + [WeekKanban.tsx](app/journal/_components/WeekKanban.tsx) (the selected week's wins grouped into Business/Privat/Weiterbildung columns from `JOURNAL_KATEGORIEN` + a trailing "Ohne Kategorie"); or (b) **Timeline mode** — [AreaTimeline.tsx](app/journal/_components/AreaTimeline.tsx) (Area `Select` filter; all wins of that area grouped by week, newest week first via the win→week→`weekStart` resolution). [ErfolgCard.tsx](app/journal/_components/ErfolgCard.tsx) is the shared win card (name + Area tag + status dot, links out to the Notion page; the status→tint map is typed `Record<ErfolgStatus, string>` so a Notion option rename breaks the build). **No client fetch effects** — all data is server-fetched in `page.tsx`, so the loop-safety rules apply trivially (only `useMemo`/`useState` with primitive/prop deps).
- TopNav: Weekly Journal is the 11th tab in [components/TopNav.tsx](components/TopNav.tsx) (after Bücher, before Inbox), lucide `NotebookPen` icon, label `nav.journal`. Constants: `ROUTES.pages.journal` (`/journal`) + `ROUTES.api.journal.list` (`/api/journal`) in [constants/routes.ts](constants/routes.ts); `constants/journal.ts`; `nav.journal` + ~23 `journal.*` i18n keys in [constants/translations.ts](constants/translations.ts) (DE + EN). New env vars `NOTION_WEEKLY_JOURNAL_DB_ID` / `NOTION_ERFOLGE_DB_ID` (Markus pastes the two database ids — `9c8a7e60946d42f6994d977b432398e1` / `40f273bbe5714a589ce04feb0ecba6e0` — and shares the integration with both DBs). **Testing:** `npm test` (vitest, added as a devDependency 2026-06-13) runs the pure-logic suite; test files are excluded from the Next `tsconfig` so `next build` stays decoupled from the test runner.

**Archive automation (Phases 2–4) — Project + Resource archiving:**
- A project or a resource can be archived from Business Hub: a **metadata-only** entry is written to the Notion Archive DB (`NOTION_ARCHIVES_DB_ID`) and the source page is moved to Notion's trash.
- **v1 is metadata-only.** The source page's body blocks are NOT copied into the Archive entry — the body stays on the source page in Notion's 30-day trash window. Block-copy is deferred (see "Not yet built").
- New helpers in [lib/notion.ts](lib/notion.ts) (additive — no existing exports changed): module-level `archivesDataSourceId` cache; `ArchivePayload` / `ArchiveResult` types; `createArchiveEntry(payload)` (creates the Archive page via `pages.create` on the Archive data source; `Archived Date` = today UTC); `archiveProjectPage(pageId, { reason? })` and `archiveResourcePage(pageId, { reason? })` — each retrieves the source page, maps only the properties it needs, calls `createArchiveEntry`, then trashes the source via `pages.update({ in_trash: true })`. Project → `Origin`/`Type` = `"Project"`, carries `Department`. Resource → `Origin` = `"Resource"`, carries `Type` / `Area` / `Source` / `Summary` / `Tags`. **Failure handling:** if trashing the source fails *after* the Archive entry was created, both ids are logged and the helper throws — no rollback (the Archive entry is kept; the caller surfaces a 502).
- **Project archiving** — [app/api/projects/update/route.ts](app/api/projects/update/route.ts) intercepts `field === "Status" && value === "Archived"` *before* the normal validation/write path (it must — `Archived` is intentionally not in the `STATUSES` constant), calls `archiveProjectPage`, and returns `{ ok: true, archived: true, archiveId }`. Every non-Archived write is unchanged. `postProjectUpdate` surfaces `archived`/`archiveId`; `ProjectsClient.handleUpdate` optimistically drops the row, closes the drawer if open, and toasts `projects.archivedToast`. The Notion `Status` enum gained an `Archived` option (migration `scripts/migrations/2026-05-20-add-projects-status-archived.ts`) — the Table status cell offers it live from Notion, and the drawer Status select has an explicit `Archived` item. The Kanban has no Archived column, so archiving is not initiated from the Kanban (drag stays Active/On Hold/Done).
- **Resource archiving** — `POST /api/resources/[id]/archive` (optional body `{ reason? }`, validated against `REASONS_ARCHIVED`) calls `archiveResourcePage`; returns `{ ok: true, archiveId }`, or 502 on failure, or 400 `invalid_reason`. The [ResourceDrawer](app/resources/_components/ResourceDrawer.tsx) footer has a destructive **Archive** button opening a small Dialog with a reason `Select` (default `No longer relevant`); confirming calls `ResourcesView.archiveResource`, which optimistically removes the row + closes the drawer, POSTs, and reverts the list + toasts on failure.
- **Sweep (Phase 3)** — `POST /api/archive/sweep` ([app/api/archive/sweep/route.ts](app/api/archive/sweep/route.ts)) catches items flipped to `Status="Archived"` *directly in Notion* (bulk edits, the future AI roadmap task), which the immediate trigger never sees. It queries the Projects DB (`status` filter) and Resources DB (`select` filter — Resources `Status` is a `select`) for `Status="Archived"`, then calls `archiveProjectPage` / `archiveResourcePage` **serially** (200ms spacing when the combined batch exceeds 5, to respect Notion's ~3 req/sec limit). One item's failure is recorded and the sweep continues. Returns `{ ok, projects: { processed, errors }, resources: { processed, errors } }` — both categories always present. The route keeps its own Notion `Client` for the status queries (lib/notion.ts exposes no query-by-status helper) but reuses the Phase 2 archive helpers unchanged for the writes. **Unauthenticated in v1** — a same-origin POST from the Profile button is sufficient for the solo/local setup; a `TODO` at the top of the route marks `CRON_SECRET` bearer-token validation as a pre-deploy requirement.
- **Roadmap update (Phase 4)** — a preview-gated AI roadmap rewrite. `POST /api/roadmap/draft` ([app/api/roadmap/draft/route.ts](app/api/roadmap/draft/route.ts)) reads `roadmap.md` + every `Status="Done"` project, asks Sonnet (`roadmapDraft()` — sibling of `briefing()`, `max_tokens` 16384) for STRICT JSON `{ proposed_roadmap, projects_to_archive, summary }`, parses defensively (502 on parse failure, raw echoed), validates the shape (hallucinated pageIds and invalid reasons are dropped into a `warnings` array, reasons default to `Completed`), computes a server-side unified diff via the `diff` library's `createTwoFilesPatch`, and returns `{ ok, draft: { proposedRoadmap, projectsToArchive, summary, diff, warnings } }` — or `{ ok, draft: null, reason: "no_done_projects" }` when there are no Done projects, or 500 when `roadmap.md` is missing (never auto-created). **Draft performs no writes.** `POST /api/roadmap/apply` ([app/api/roadmap/apply/route.ts](app/api/roadmap/apply/route.ts)) takes `{ proposedRoadmap, approvedProjectIds }`, **re-verifies** each approved project is *still* `Status="Done"` and not already trashed at apply-time (status-changed / trashed projects go to `skipped`, never archived), then writes `roadmap.md` and archives the verified subset via `archiveProjectPage(pageId, { reason: "Completed" })` serially. **Ordering rationale — roadmap.md is written FIRST, before the archive loop:** the roadmap update is the primary intent; writing the file first means a downstream archive failure cannot lose the roadmap edit, and the Phase 3 sweep recovers any verified-Done project that failed to archive. The apply route keeps its own Notion `Client` for the re-verification retrieves. New additive helper `listProjectsByStatus(status)` in [lib/notion.ts](lib/notion.ts) (`listActiveProjects` parameterised on the Status value; returns `Project` + `lastEditedTime`). Surfaced on the Profile page via `RoadmapDraftSection` (see the Profile block). Manual trigger only — no cron.
- Constants: `constants/archive.ts` (reasons); `ROUTES.api.resources.archive(id)`, `ROUTES.api.archive.sweep`, and `ROUTES.api.roadmap.{draft,apply}`. i18n added (DE+EN): `projects.archivedToast`, `status.Archived`, `resources.archive.*` (button / title / body / reasonLabel / confirm / cancel / success / error), `profile.archive.*` (title / description / button / running / success / none / errorsTitle / errorItem / toastError), and `profile.roadmap.*` (21 keys — section / draft / preview / diff / checklist / apply / applied / discard / toast strings).
- **Out of scope (later phases):** copying body blocks into the Archive entry; a **cron auto-trigger + `CRON_SECRET` auth** for the sweep route (the manual sweep itself is built).

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
- **Archive sweep section** ([app/profile/_components/ArchiveSweepSection.tsx](app/profile/_components/ArchiveSweepSection.tsx)) — sibling component mounted below Settings. A "Run archive sweep" button POSTs `/api/archive/sweep` (no body; disabled + "Running…" label while in flight) and renders a result panel: "Nothing to archive" when nothing was processed, otherwise the archived counts plus a per-item Errors list (`<name> — <error>`). Sonner toast on completion (success / error variant). See Archive automation.
- **Roadmap draft section** ([app/profile/_components/RoadmapDraftSection.tsx](app/profile/_components/RoadmapDraftSection.tsx)) — sibling component below the Archive sweep. Preview-gated AI roadmap update with an `idle → drafting → preview → applying → applied | discarded` state machine (plus an empty branch when there are no Done projects). The preview shows Sonnet's summary, a colour-coded unified diff (`+` emerald, `-` red, `@@` / file headers muted; collapses by default past 80 lines with a show/hide toggle), any draft warnings, and a per-project archive checklist — one checkbox per recommended project (default checked; unchecking vetoes that project) with a reason badge. Apply sends only the checked subset to `/api/roadmap/apply`; Discard makes no request. Sonner toasts on draft error / apply success / apply error. See Archive automation.
- The digest routes and the Tab 3 calendar routes read `timezone` + `master_calendar_id ?? 'primary'` from `lib/settings`. The time-block planner now also reads `task_type_windows`: when any windows are configured the workday window is the union (min start, max end) across all entries; otherwise it falls back to 09:00–18:00. The route logs the resolved window (`[timeblocks] tz=… window=H:00-H:00 → ISO → ISO`) for verification. Per-task-type routing (matching a project's Task Type to its specific window) is still future work.
- The time-block UI formats start/end in `settings.timezone` (echoed in the `/api/digest/timeblocks` response) rather than the previously hardcoded `Europe/Berlin` — fixes the symptom where a 09:00 Dubai suggestion was displayed as 07:00.
- UI: server-shell `/digest` page mounts client component [app/digest/_components/DailyDigest.tsx](app/digest/_components/DailyDigest.tsx). On mount it GETs `/api/digest/daily` (204 → empty state with "Generate" button). Renders the cached markdown via `react-markdown` (no plugins) using custom `components` mapping for headings/lists/strong/em/a/code/blockquote. "Regenerate" button POSTs `?force=true`. Generated-at indicator shows "Just generated" or a localized relative time.
- New dependency: `react-markdown` ^10 (no remark/rehype plugins). i18n entries under `digest.*` in [constants/translations.ts](constants/translations.ts) (DE+EN).

**Google OAuth — scaffolded, not yet exercised:**
- Code path works end-to-end on paper. Awaiting (a) Markus running the migration, (b) Markus clicking "Connect Google" in the top nav once to grant consent.
- The daily digest gracefully proceeds without calendar context when not connected (`googleConnected: false` flag passed into the model prompt).

**Not yet built:**
- **WhatsApp template-overrides UI wire-up (half-built).** The full backend is in place — Supabase `client_template_overrides` table + migration `20260520120000_client_template_overrides.sql`, `/api/clients/[zohoId]/templates` GET/PUT/DELETE, `templateOverrides: Record<string, string>` on the `/api/clients/[zohoId]` detail payload + the shared `ClientDetail` type. **No UI consumes it:** [WhatsAppTemplates.tsx](app/clients/_components/WhatsAppTemplates.tsx) does not accept a `templateOverrides` prop, [ClientDetail.tsx](app/clients/_components/ClientDetail.tsx) does not pass it. Finishing means adding per-template Edit / Reset controls in `WhatsAppTemplates.tsx` that PUT/DELETE through the existing route. Until then, every client renders the default DE/EN strings from `constants/translations.ts`. **1.0 blocker** — either finish the UI or rip out the backend; do not ship half-built.
- **Notion property-type mismatch on three Clients-DB link fields (`Call Notes Link`, `Client Database Link`, `Dashboard Link`).** Read path in [lib/notion.ts](lib/notion.ts) treats them as `rich_text` (`asRichText` extractor with an inline comment "verified via the Clients DB schema, not `url` properties"). Write path in `updateClientField` still sends `{ type: "url", url }`. A user saving a link from the Tab 4 metadata grid may silently write to a property Notion ignores. Confirm the actual Notion DB schema first, then align both paths (and `/api/clients/[zohoId]/notion`'s validation). **1.0 blocker.**
- **Notion Clients DB schema verification.** The repo now uses `requireProp` on `Monthly Fee` (number) and `Person` (rich_text), plus reads `Status` (select), `Tier` (select), and `Acquisition Source` (select). If any of `Monthly Fee` / `Person` is missing in the actual Notion DB, `toClient` will throw at runtime and the Clients tab will crash. Confirm all five properties exist with the expected types before relying on Tab 4 daily. **1.0 blocker.**
- Archive **browsing** — viewing/searching the Archive DB inside Business Hub (Tab 6 surfaces only the Resources DB). Archiving *into* the Archive DB is built — see Archive automation.
- Archive body-copy — v1 is metadata only; the source page's body blocks are not copied to the Archive entry. The source body lives in Notion's trash for 30 days.
- Cron sweep auto-trigger + `CRON_SECRET` auth for `/api/archive/sweep` — the sweep route and its manual Profile button are built; the scheduled auto-run is deferred to 1.1, but **bearer-token authentication is a 1.0 blocker** (per the 2026-05-24 launch-readiness decision).
- Tab 2 weekly plan. **1.0 blocker.**
- Per-task-type window *routing*: the planner reads the union (min start / max end) across all configured `task_type_windows`, but does not yet match a project's Task Type to that type's specific window.
- Supabase tables beyond `google_oauth_tokens`, `briefings`, `time_block_suggestions`, `user_settings`, `client_template_overrides`.
- Any agents or sub-agents.
- **RLS on `google_oauth_tokens` / `briefings` / `time_block_suggestions` / `user_settings` / `client_template_overrides`** (currently relying on service-role-only access). **1.0 blocker.**
- **Inbox triage view** — Quick Capture writes raw entries into the Notion Inbox DB, but there is no surface in Business Hub to process them (classify + route an Inbox item to a Project / Resource / Area, then flip `Processed`). This is the natural next step now that capture exists; triage today happens manually in Notion.
- **`/api/calls/create` authentication** — the route is deliberately left ungated by the password proxy (the external Call Miner skill posts to it without a session cookie). It currently has no auth of its own; a shared-secret / bearer token for this endpoint is an open hardening item before relying on it from outside.

**Next planned step:** in order — (1) resolve the WhatsApp template-overrides UI (finish wire-up or rip out the backend); (2) fix the URL/rich_text property-type mismatch on the three Clients-DB link fields once the Notion schema is confirmed; (3) confirm the Notion Clients DB has every property the code expects (`Monthly Fee`, `Person`, `Status`, `Tier`, `Acquisition Source`); (4) build the Tab 2 weekly plan (extends `/digest` with a 5-day Sonnet view over Active projects + deadlines).

### Hub 1.0 launch readiness

Snapshot taken 2026-05-24. This sub-section is the launch checklist. A future Cowork session can read each must-have, turn it into a Claude Code prompt, and verify with the linked step. Update as items land.

**Must-have before launch** (every item is testable; the verification step is something Markus can perform himself):

- **Resolve WhatsApp template-overrides.** Decide: finish the UI (per-template Edit / Reset controls in [WhatsAppTemplates.tsx](app/clients/_components/WhatsAppTemplates.tsx), writing through `/api/clients/[zohoId]/templates` PUT/DELETE) or rip out the route + migration + `templateOverrides` field. Do not ship half-built. *Verify:* open Tab 4, customise a template for one client, reload the page — the override persists; reset it, reload — the default returns. (Or: route + migration + types are gone from the repo.)
- **Fix the URL/rich_text property mismatch on `Call Notes Link` / `Client Database Link` / `Dashboard Link`.** Inspect the actual Notion Clients DB schema first; align the read path and the write path (and `/api/clients/[zohoId]/notion`'s validation) to whichever is correct. *Verify:* save a link in Tab 4's metadata grid for one client, refresh, open the client's Notion page directly — the link is visible there and matches what was entered in BH.
- **Confirm the Notion Clients DB has every property the code expects.** Required: `Name`, `Zoho Contact ID`, `Industry`, `Employees`, `Monthly Revenue`, `Monthly Fee`, `Person`, `Status`, `Call Notes Link`, `Client Database Link`, `Dashboard Link`, `Tier`, `Acquisition Source`. *Verify:* open `/clients` — the page renders without a server error and every client row appears with the expected metadata (no "property missing" exception in the browser console / server logs).
- **Apply all six Supabase migrations to production.** Files: `20260515120000_google_oauth_tokens.sql`, `20260516120000_briefings.sql`, `20260517120000_briefings_append_only.sql`, `20260518120000_time_block_suggestions.sql`, `20260519120000_user_settings.sql`, `20260520120000_client_template_overrides.sql`. *Verify:* open `/profile`, click "Re-check all" — Supabase row shows **Connected**. Then `curl -X PUT '/api/clients/<any-zoho-id>/templates' -d '{"template_key":"Book a Call","custom_text":"test"}'` — response is `{ "ok": true }`, not `503 migration_not_run`. Clean up the test row after via DELETE.
- **End-to-end integration smoke test from `/profile`.** *Verify:* click "Re-check all" — all five integrations (Notion, Google, Zoho, Anthropic, Supabase) show **Connected**. Then run the happy path: `/projects` loads and a project drawer opens with the page body rendered; `/digest` generates a daily briefing (or returns the cached one) and time-block suggestions, then confirms one block and the new event appears on `/calendar`; `/clients` loads, save a metadata field on one client and confirm in Notion; `/areas` loads, the AI focus banner renders, edit one milestone inline and confirm in Notion; `/resources` loads, archive a throwaway test note and confirm the Archive DB has a new entry plus the source is trashed.
- **Tab 2 weekly plan built.** Extends `/digest`: Sonnet over Active projects + 5-day deadline window, separate cache row in `briefings` (`kind='weekly'`). UI sits below the daily briefing on the same page. *Verify:* on `/digest`, click "Generate weekly plan" — five day sections render with project names + Next Actions assigned to each day; reload the page — the cached plan returns without re-prompting Sonnet.
- **RLS enabled on `google_oauth_tokens`, `briefings`, `time_block_suggestions`, `user_settings`, `client_template_overrides`.** Every table gets RLS on + the appropriate policy that limits writes to the service role (the app uses the service-role key on the server; no end-user-facing anon auth). *Verify:* in Supabase Dashboard → Table Editor → each of the five tables — "RLS enabled" badge is on. From `/profile` → Re-check all → Supabase still **Connected** (sanity check that the policies don't break the service-role path).
- **`/api/archive/sweep` authenticated via `CRON_SECRET` bearer token.** Add a `CRON_SECRET` env var; route returns 401 when the `Authorization: Bearer <CRON_SECRET>` header is missing or wrong; the `/profile` "Run archive sweep" button sends the header. *Verify:* `curl -X POST '/api/archive/sweep'` without the header — 401. With the wrong token — 401. From the `/profile` UI — 200 + the usual `{ ok, projects, resources }` result.

**Out of scope for 1.0** — explicitly deferred to 1.1 (do not block launch on these):

- Archive body-copy — the source page's body blocks are still not copied into the Archive entry; v1 stays metadata-only (source body lives in Notion's 30-day trash window).
- Archive browsing inside Tab 6 — Tab 6 still surfaces only the Resources DB; viewing/searching the Archive DB in BH is 1.1.
- Cron auto-trigger for `/api/archive/sweep` — the manual Profile button stays the only entry point in 1.0. (The `CRON_SECRET` bearer-token check, by contrast, is a 1.0 blocker above so that 1.1 can wire up the scheduled run.)
- Per-task-type *routing* in the time-block planner — the union-window logic (min start, max end across all configured `task_type_windows`) ships in 1.0; matching a project's Notion `Task Type` to its specific window is 1.1.
- Restated for clarity (already deferred elsewhere in this file): multi-user / client portal, embedded WhatsApp UI, notification system, editing existing Resources/Archive notes inline, two-way EasyFinance integration. *(Mobile-optimized layouts are no longer in this list — built 2026-06-06, commit `b4a7743`.)*

## Start-of-Session Checklist

Run this every session before touching code:

1. Read this CLAUDE.md in full.
2. Check the current branch. It should be `dev`. If it is `main`, switch before making changes.
3. Confirm where the requested work sits in the [Capability Priority Order](#capability-priority-order). If it does not appear there, ask before building.
4. If the task looks large or expensive (many files, broad rewrites, full-codebase reads), propose a narrower scope first and wait for confirmation.
5. Check `supabase/migrations/MIGRATION_LOG.md` if the task touches the database.
