# Business Roadmap — Areas, Milestones & Priorities

> Generated from Markus's brain dump session — 2026-05-17.
> Reference this file at the start of any session involving Areas (Tab 5), the AI Digest, or strategic planning.
> Update after each session that changes an area's status, milestone, or projects.

---

## How to read this file

Each area follows the PARA definition: an **Area** is an ongoing responsibility with a standard to maintain — no end date. Areas connect to **Projects** (which do have end dates). When a project finishes, the area's milestone and next focus should be reviewed and updated.

Fields per area:
- **Standard** — what "healthy" looks like. The AI Digest uses this to assess health.
- **Current Milestone** — what Markus is working toward right now.
- **Next Steps** — 1–2 concrete actions this week.
- **Next Focus** — what the AI should suggest after the current milestone completes.
- **Goal (3–6 mo)** — medium-term direction.
- **Health** — Active / Needs Attention / Paused. Updated as reality changes.
- **Blocker** — what is stopping progress (including Markus himself).
- **Metric** — the signal that tells us this area is on track.
- **Connected Projects** — Notion project names that belong to this area.

---

## Areas

### 1. Fulfillment

**Standard:**
Clients proactively book calls — no chasing, no skipped calls. Transactions sent on time. Communication is open (clients ask questions, don't go quiet). Super healthy = bank accounts connected so Markus can pull data directly without waiting for CSVs.

**Current Milestone:**
Migrate all active clients to EasyFinance (the separate app on Railway with its own Supabase DB). Enables smooth CSV import and sets the foundation for pre-categorization. Has a dependency on Development — EasyFinance must be v1.0-stable first.

**Next Steps:**
- Execute client-by-client migration to EasyFinance once app is stable.
- Verify CSV import flow works end-to-end per client.

**Next Focus (AI suggestion after milestone):**
Optimize pre-categorization rules per client — target 90%+ auto-categorization accuracy so bookkeeping time per client drops significantly.

**Goal (3–6 mo):**
Fulfillment fully in-app (EasyFinance). AI-assisted pre-categorization at scale. Client migrations are effortless and the monthly bookkeeping loop takes minimal manual effort.

**Health:** Active
**Blocker:** None currently — dependent on EasyFinance v1.0 (Development area).

**Metric:**
- Calls prebooked and on time (zero last-minute bookings)
- Bank accounts connected per client (%)
- No skipped calls
- Transactions received on time
- Pre-categorization accuracy per client (target: 90%+)

**Connected Projects:**
- Migrate [Client Name] to EasyFinance (one project per active client)
- Pre-categorization pass — all clients to 90% (next month)

> Note: EasyFinance is a separate codebase and separate Supabase instance from Business Hub. Business Hub only links out to EasyFinance URLs — no two-way data sync.

---

### 2. Accounting

**Standard:**
Clients pay on time, in full, automatically. Healthy = recurring invoice in Zoho Books running without manual trigger, client on Stripe (card on file) or SEPA direct debit. Unhealthy = overdue payments, clients reducing their monthly amount, manual invoice chasing.

**Current Milestone:**
Move every client onto Stripe or SEPA recurring. Has been losing focus — not raising it consistently in calls. This needs to be a standing agenda item in every client call until it's done.

**Next Steps:**
- In every upcoming client call: ask them to switch to Stripe or set up SEPA recurring.
- Identify which clients are currently overdue and set a follow-up sequence.

**Next Focus (AI suggestion after milestone):**
Invoice forecasting dashboard — past + future invoices synced with Zoho Books API, projected income if clients continue at current rate. Something already partially built; needs refinement.

**Goal (3–6 mo):**
Near-zero manual invoicing. Almost everyone on Stripe or SEPA. One monthly check is enough. Full projected income overview available in Business Hub (Zoho data already flows through the Clients tab) or a standalone Excel dashboard.

**Health:** Needs Attention
**Blocker:** No payment reminder system set up. Not enforcing overdue payments strictly. Clients resistant to committing to recurring payments. Markus forgetting to raise it in calls.

**Metric:**
- % clients on Stripe
- % clients with active recurring invoice in Zoho
- Overdue invoice count (target: zero)
- Average days-to-payment

**Connected Projects:**
- Stripe/SEPA migration per client (one project per client)
- Payment reminder system setup
- Invoice forecasting dashboard (Zoho Books API — partially built)

> Note: Upsell process flagged here but belongs in Sales. Cross-reference Sales area.
> Note: Forecasting dashboard could live inside Business Hub's Clients tab (Zoho data already flowing) — decide when building that feature.

---

### 3. Marketing

**Standard:**
Reliable, profitable inflow of high-quality leads who want to become clients at €500–€1000/month. Comes through Facebook ads, Instagram organic, and instant forms — multiple funnels. At least €1k/month ad spend running profitably, producing 1–2 new clients per month. Funnels are regularly reviewed and refined.

**Current Milestone:**
Funnel 1 is live and performing. Coach feedback has been implemented and show-up rate is above 50%. New ads with phone number capture are running. Focus now shifts to maintaining momentum, iterating on ad performance, and activating instant forms fully.

**Accomplishments:**
- ✅ Business coach feedback implemented — show-up rate above 50% achieved.
- ✅ New ads with phone number capture launched.

**Next Steps:**
- Monitor show-up rate and ad ROI weekly — iterate quickly on underperforming ad sets.
- Fully activate instant forms and ensure same-day lead calling process is running consistently.
- Schedule regular check-ins with business coaches to maintain the feedback loop.

**Next Focus (AI suggestion after milestone):**
Test additional funnels. Once paid ads are stable and profitable, build organic content layer (Instagram). Content area is a downstream dependency of Marketing being established.

**Goal (3–6 mo):**
Four-digit monthly ad spend running profitably. 1–2 new clients per month as a reliable, predictable rhythm.

**Health:** Active
**Blocker:** Markus is the blocker. Getting distracted by other tasks instead of following through. This area needs proactive AI Digest nudging when not touched for 2+ days.

**Metric:**
- Ad spend ROI (profitable = positive)
- New leads per week
- Lead show-up rate for calls (target: >50%)
- New clients closed per month (target: 1–2)

**Connected Projects:**
- Instant forms activation
- Lead calling process / same-day follow-up

> Note: Content area is dependent on Marketing being established. Do not build Content until funnel is live and stable.

---

### 4. Sales

**Standard:**
Calendly booking fully streamlined. Clean call structure with scripts for both the analysis call and the sales call, stored in Notion. KPIs tracked. Markus knows his closing rate at all times and is actively improving it.

**Current Milestone:**
Not yet defined. Suggested sequence (approved or adjust):

1. **Scripts documented** — Analysis call + sales call scripts written and stored in Notion. One living document, refined after every call.
2. **KPI baseline established** — Track: calls booked, calls held, proposals made, closed, closing rate, average deal value.
3. **2 calls/week rhythm** — Sustainable starting cadence fed by Marketing funnel.
4. **Closing rate review** — After 10+ calls, identify drop-off points and refine scripts.
5. **3–4 calls/week + upsell layer** — Scale cadence. Introduce structured upsell process for existing clients (cross-references Accounting and Fulfillment).

**Next Steps:**
- Write analysis call script in Notion.
- Write sales call script in Notion.
- Define which KPIs to track and where (Notion table or Business Hub dashboard).

**Next Focus (AI suggestion after milestone):**
Upsell process for existing clients. Systematically identify clients ready to expand scope and build a script for that conversation.

**Goal (3–6 mo):**
3–4 sales calls per week. Closing rate tracked and improving. Upsell process active.

**Health:** Needs Attention (nascent — no active structure yet)
**Blocker:** No scripts or KPI tracking in place yet.

**Metric:**
- Calls booked per week
- Show-up rate
- Closing rate (target to be defined after first 10 calls)
- Average deal value

**Connected Projects:**
- Analysis call script (Notion)
- Sales call script (Notion)
- KPI tracking setup
- Upsell process design

---

### 5. Development

**Standard:**
Both apps (EasyFinance + Business Hub) in a working, stable state. Development happens on scheduled days every week — always moving forward. A clear feature roadmap exists with a timeline, not just a wishlist. Markus finishes features before starting new ones.

**Current Milestone:**
EasyFinance v1.0 — currently ~70% complete. Remaining: bug fixes, CSV upload, client migration flow. Also: define explicit v1.0 acceptance criteria for both EasyFinance and Business Hub so there is a clear finish line.

**Accomplishments:**
- ✅ Areas populated with long-term roadmap and connected to projects.
- ✅ Client Notion list populated.
- ✅ Business OS Workshop prepared and delivered.

**Next Steps:**
- Write v1.0 acceptance criteria for EasyFinance (what must work before it's "done").
- Write v1.0 acceptance criteria for Business Hub (tab-by-tab — use Capability Priority Order in CLAUDE.md).
- Work through the list systematically. No new features until the checklist is green.

**Next Focus (AI suggestion after milestone):**
Establish a 2-features-per-week shipping rhythm. Improve EasyFinance dashboard (currently basic). Incorporate client feedback as a regular input. Weekly dev log in Notion — one line per session.

**Goal (3–6 mo):**
Both apps fully functional and actively used. Business Hub providing full operational clarity across all 6 tabs. EasyFinance running smoothly in client calls. Client login rate tracked.

**Health:** Needs Attention
**Blocker:** Shiny object syndrome — jumping to new features while existing sections remain unfinished and untested. Needs a rule: if open bug count > 3, next session is fixes-only. No new features.

**Metric:**
- Features shipped per week (target: 2)
- Open bug count (target: trending to zero)
- EasyFinance client login rate (once migrations done)
- % of v1.0 checklist complete

**Connected Projects:**
- EasyFinance v1.0 completion (bugs, CSV upload, migration)
- Business Hub v1.0 completion (Tabs 1–6)
- EasyFinance dashboard improvement

> Note: Business Hub build is tracked in detail in CLAUDE.md. Cross-reference Capability Priority Order there.

---

### 6. Operations

**Standard:**
All tasks in one centralized Notion PARA database. Working by priority and importance, not impulse. Deadlines met. System is maintained, not just set up. Always know where to find everything. New inputs are captured and classified without friction.

**Current Milestone:**
Complete the PARA migration — move all notes, tasks, ideas, and backlog items into Notion (Projects, Areas, Resources, Archive) so Business Hub's AI Digest can read and act on them. This brain dump session is part of that migration.

**Accomplishments:**
- ✅ Weekly tracking for week 10.05–17.05 completed.
- ✅ Establishment card renewed.

**Next Steps:**
- Finish Business Hub (prerequisite for AI to read PARA).
- Migrate existing projects into Notion Projects DB.
- Migrate areas (this file + Notion Areas DB).
- Migrate resources and archive items.

**Next Focus (AI suggestion after milestone):**
Activate the capture formula: any new note, idea, or task goes into the Notion Inbox → Claude (Haiku) classifies it (Task / Idea / Reference / Someday) → routed to the right place automatically. Already planned as the Inbox DB in Business Hub. Once running, Operations basically maintains itself. Pair with a weekly review habit — 15 minutes every Monday to process inbox and align tasks with the roadmap.

**Goal (3–6 mo):**
Fully structured PARA. Every input captured, classified, and routed without friction. Weekly review in place. Overdue task count near zero. Tasks always aligned with current roadmap priorities.

**Health:** Active (currently being worked on)
**Blocker:** None — dependent on Business Hub completion.

**Metric:**
- Overdue task count (target: zero or near-zero)
- % of tasks aligned with current roadmap priorities
- Inbox items unprocessed >48 hours (target: zero)
- Time to classify a new input (target: <1 min with AI assist)

**Connected Projects:**
- Business Hub — all 6 tabs
- Notion PARA migration (projects, areas, resources, archive)
- Inbox + AI classification setup (Haiku routing — planned in Business Hub)
- This Areas brain dump and Notion Areas DB creation

---

### 7. Content

**Standard:**
Active Instagram with regular posts on a consistent schedule. Incoming DMs answered — by Markus or automation. Content drives real engagement: comments, saves, shares — not just passive views. Content also generates leads and sales, not just awareness.

**Current Milestone:**
None active — area is fully and intentionally paused. Marketing funnel and Development must be stable before this activates. This is the last area to reactivate.

**Next Steps (when unpaused):**
- Mine customer audience language — how clients actually talk about their problems (raw material for the AI system).
- Build inspiration and idea library in Notion (a folder Markus drops raw ideas into).
- Build the AI content generation system: customer voice input → AI drafts posts → Markus reviews → publishes.
- Activate Instagram DM automation for incoming messages.

**Next Focus (AI suggestion after milestone):**
Repurposing pipeline — one piece of source content becomes multiple formats (carousel, reel, story, caption). High output volume without proportionally more input effort.

**Goal (3–6 mo):**
Fully automated content pipeline. Markus drops inspiration into a folder, AI generates drafts, 5 posts per week go live. Content drives measurable leads and sales alongside paid ads.

**Health:** Paused (intentional — correct priority call)
**Blocker:** Waiting on Marketing funnel stability and Development milestone. Do not reactivate until both are unblocked.

**Metric:**
- Posts published per week (target: 5)
- Engagement rate (comments + saves + shares — not views alone)
- DM response time (target: <24h via automation)
- Leads generated from organic content per month

**Connected Projects:**
- Customer voice / audience language research
- Inspiration library setup (Notion)
- AI content generation system (new build — Business Hub feature or standalone tool TBD)
- Instagram DM automation setup
- Content calendar (Notion)

---

### 8. Personal

**Standard:**
Three evenings per week + one weekend day fully free — for personal projects, rest, or doing nothing. Gym 4x per week (1.5h each). Supplements and nutrition plan on track. Body measurements and progress photos maintained (health coach program). Personal projects move forward — nothing gets neglected for several weeks. Family called at least once a week. Friends checked in on regularly. At least one date per week (Bumble). At least one trip every six months.

> This area is different from the others. There are no milestones to complete — the goal is to keep everything alive and rotating. Nothing should go completely dark for more than 2–3 weeks.

**Current Milestone:**
No single milestone — maintain across all sub-areas.

**Accomplishments:**
- ✅ Bumble weekly date habit established — 1 date per week as a consistent rhythm.
- ✅ Virgin SIM card obtained for Mo.
- ✅ Mo referred to 3S Money.
- ✅ Final massage sessions in Dubai booked.
- ✅ Insurance claim registered for dentist appointment.

**Next Steps:**
- Maintain Bumble weekly date habit — do not let it lapse now that it is established.
- Schedule family call if more than 7 days since last one.
- Check: when was the last card trick practiced? Dancing? Spanish session? If >2 weeks — do one this week.

**Next Focus (AI suggestion — rotating nudges):**
The AI Digest should surface a different neglected personal activity every 1–2 weeks as a gentle reminder. Suggested rotation: card magic → Spanish/Japanese → dancing → dating → travel planning → reading → friends check-in → pool. Nothing gets a permanent slot — it rotates so nothing stays forgotten.

**Goal (3–6 mo):**
Flexible but nothing neglected. 1 trip booked and done. Dating active (1 date/week rhythm — now established, maintain it). Health program on track with measurable progress. Personal projects feel alive, not like a to-do list.

**Health:** Active — dating habit now established; continue maintaining all sub-areas.
**Blocker:** Forgetting. Not remembering that card magic or dancing exists as an option until weeks have passed. The fix is reminders, not motivation.

**Habits to track (suggested metrics):**
| Habit | Target | Nudge if neglected |
|-------|--------|-------------------|
| Gym | 4x per week | After 5 days without |
| Free evenings | 3 evenings + 1 weekend day | Flag if a week has none |
| Dating (Bumble) | 1 date per week | After 10 days without |
| Family call | 1x per week | After 8 days without |
| Card magic | At least 1x per 2 weeks | After 14 days |
| Spanish | At least 1x per 2 weeks | After 14 days |
| Japanese | At least 1x per 2 weeks | After 14 days |
| Dancing | At least 1x per month | After 25 days |
| Pool | At least 1x per month | After 25 days |
| Friends check-in | At least 2x per month | After 18 days |
| Travel | 1x per 6 months | If none booked by month 4 |
| Progress photos | Monthly | After 35 days |

**Connected Projects / One-off goals:**
- Book next trip (within 6 months)
- Learn one new card trick (ongoing)
- Reach next milestone on health coach program
- Continue Spanish (level TBD)
- Start Japanese (beginner — no timeline pressure)

---

## Cross-Area Dependencies

| Area | Depends On | Notes |
|------|-----------|-------|
| Fulfillment | Development | EasyFinance must be v1.0 before client migration |
| Marketing | — | Funnel 1 is live; focus now on stability and iteration |
| Content | Marketing | Do not build until funnel is live |
| Sales | Marketing | Calls fed by funnel — ramp up in parallel |
| Accounting | Sales + Fulfillment | Stripe migration best raised in client calls |
| Operations | Development | Business Hub must be functional for AI to read PARA |
| Development | — | Foundation for everything |

---

## Projects Mentioned Across All Areas

| Project | Area | Status | Notes |
|---------|------|--------|-------|
| EasyFinance v1.0 completion | Development | In Progress (~70%) | Bugs, CSV upload, migration flow |
| Business Hub v1.0 (Tabs 1–6) | Development | In Progress | See CLAUDE.md for tab status |
| Client migration to EasyFinance | Fulfillment | Blocked | Blocked by EasyFinance v1.0 |
| Pre-categorization to 90% | Fulfillment | Planned | After migration |
| Stripe/SEPA migration per client | Accounting | Needs Attention | Raise in every call |
| Payment reminder system | Accounting | Planned | Not started |
| Invoice forecasting dashboard | Accounting | Partially built | Zoho API — needs refinement |
| Instant forms activation | Marketing | In Progress | Activate and monitor |
| Lead calling process | Marketing | In Progress | Same-day follow-up on new leads |
| Analysis call script | Sales | Not started | Notion doc |
| Sales call script | Sales | Not started | Notion doc |
| Sales KPI tracking | Sales | Not started | |
| Upsell process | Sales | Deferred | After cadence established |
| Notion PARA migration | Operations | In Progress | This session is part of it |
| Inbox + AI classification | Operations | Planned | Depends on Business Hub |
| EasyFinance dashboard | Development | Planned | Currently basic |

---

## AI Digest Notes

These are instructions for how the AI Digest should treat each area:

- **Marketing:** Nudge proactively if not touched in 2+ days. Markus is the bottleneck — he needs reminders to maintain the feedback loop with coaches and keep iterating on ad performance.
- **Development:** Discourage new features when open bugs exist. Push toward finishing sections, not starting new ones.
- **Accounting:** Surface overdue clients regularly. Remind to raise Stripe/SEPA in upcoming calls.
- **Sales:** Once scripts exist, prompt for post-call KPI logging.
- **Fulfillment:** Flag if a client has not submitted transactions within expected window.
- **Operations:** Flag inbox items older than 48 hours.
- **Personal:** Rotate a neglected personal activity as a gentle nudge every 1–2 weeks (card magic, Spanish, Japanese, dancing, dating, travel, friends, pool). Never nag — one nudge per digest, quietly. Flag dating if no date in 10+ days. Flag family call if 8+ days since last.

---

## Session Log

| Date | What changed |
|------|-------------|
| 2026-05-17 | Full brain dump complete — all 8 areas captured: Fulfillment, Accounting, Marketing, Sales, Development, Operations, Content, Personal. |
| 2026-05-17 | Notion Areas DB created (ID: 5506c6ea1e3e4c00af5795b73c3fc451) under "02 - Areas". All 8 areas seeded with properties + page body. NOTION_AREAS_DB_ID in .env.local. |
| 2026-05-20 | 13 projects marked Done. Marketing: coach feedback implemented (show-up rate >50%), new ads with phone number capture launched — milestone updated to active iteration phase. Development: Areas populated with roadmap, client Notion list populated, Business OS Workshop completed. Operations: weekly tracking (10.05–17.05) done, establishment card renewed. Personal: Bumble weekly date habit established, Virgin SIM obtained for Mo, Mo referred to 3S Money, Dubai massage sessions booked, insurance claim registered. Roadmap updated accordingly. |
| 2026-05-20 | 13 Done projects archived. TEST project (Phase 4) archived as Completed. All accomplishments already reflected in area Accomplishments sections. No milestone or next-step changes required — current milestones and next steps remain valid. |
| 2026-05-20 | 14 Done projects archived. All 13 previously logged projects re-confirmed as Completed, plus TEST — Roadmap project B (Phase 4, re-verify) archived as Completed. No area milestones or next steps required changes — all accomplishments already reflected in area Accomplishments sections. |

---

_Update this file at the end of any session that changes an area's milestone, status, or connected projects._