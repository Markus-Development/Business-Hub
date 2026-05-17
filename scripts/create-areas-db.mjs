#!/usr/bin/env node
// One-off setup script: creates the Notion Areas database and seeds it with
// the eight areas from /roadmap.md. Run once via:
//   node --env-file=.env.local scripts/create-areas-db.mjs
// Safe to delete after a successful run.

import { Client } from "@notionhq/client";

const PARENT_PAGE_ID = "361dbb6a-cff7-8026-ad69-e96b87a5a0d4";
const RICH_TEXT_LIMIT = 2000;

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error("NOTION_TOKEN missing from environment. Run with: node --env-file=.env.local scripts/create-areas-db.mjs");
  process.exit(1);
}

const notion = new Client({ auth: token });

// ---------- rich-text + block helpers ----------

function chunkText(text, limit = RICH_TEXT_LIMIT) {
  if (!text) return [];
  const chunks = [];
  let rest = text;
  while (rest.length > limit) {
    let cut = rest.lastIndexOf(" ", limit);
    if (cut < limit * 0.5) cut = limit;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest.length) chunks.push(rest);
  return chunks;
}

function rt(text) {
  if (!text) return [];
  return chunkText(text).map((content) => ({
    type: "text",
    text: { content },
  }));
}

function richTextProperty(text) {
  return { rich_text: rt(text) };
}

function titleProperty(text) {
  return { title: rt(text) };
}

function selectProperty(name) {
  return { select: { name } };
}

function paragraphBlocks(text) {
  return chunkText(text).map((content) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content } }],
    },
  }));
}

function headingBlock(text) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  };
}

function bulletBlock(text) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  };
}

function emptyParagraphBlock() {
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: [] },
  };
}

// ---------- area data (extracted from /roadmap.md) ----------

const areas = [
  {
    name: "Fulfillment",
    status: "Active",
    standardShort:
      "Clients proactively book calls — no chasing, no skipped calls. Transactions sent on time.",
    standardFull:
      "Clients proactively book calls — no chasing, no skipped calls. Transactions sent on time. Communication is open (clients ask questions, don't go quiet). Super healthy = bank accounts connected so Markus can pull data directly without waiting for CSVs.",
    currentMilestoneShort:
      "Migrate all active clients to EasyFinance (the separate app on Railway with its own Supabase DB).",
    nextSteps:
      "Execute client-by-client migration to EasyFinance once app is stable. Verify CSV import flow works end-to-end per client.",
    nextFocus:
      "Optimize pre-categorization rules per client — target 90%+ auto-categorization accuracy so bookkeeping time per client drops significantly.",
    goal: "Fulfillment fully in-app (EasyFinance). AI-assisted pre-categorization at scale. Client migrations are effortless and the monthly bookkeeping loop takes minimal manual effort.",
    healthMetric:
      "Calls prebooked and on time (zero last-minute bookings). Bank accounts connected per client (%). No skipped calls.",
    blocker: "None currently — dependent on EasyFinance v1.0 (Development area).",
    connectedProjects: [
      "Migrate [Client Name] to EasyFinance (one project per active client)",
      "Pre-categorization pass — all clients to 90% (next month)",
    ],
  },
  {
    name: "Accounting",
    status: "Needs Attention",
    standardShort:
      "Clients pay on time, in full, automatically. Healthy = recurring invoice in Zoho Books running without manual trigger, client on Stripe (card on file) or SEPA direct debit.",
    standardFull:
      "Clients pay on time, in full, automatically. Healthy = recurring invoice in Zoho Books running without manual trigger, client on Stripe (card on file) or SEPA direct debit. Unhealthy = overdue payments, clients reducing their monthly amount, manual invoice chasing.",
    currentMilestoneShort: "Move every client onto Stripe or SEPA recurring.",
    nextSteps:
      "In every upcoming client call: ask them to switch to Stripe or set up SEPA recurring. Identify which clients are currently overdue and set a follow-up sequence.",
    nextFocus:
      "Invoice forecasting dashboard — past + future invoices synced with Zoho Books API, projected income if clients continue at current rate.",
    goal: "Near-zero manual invoicing. Almost everyone on Stripe or SEPA. One monthly check is enough. Full projected income overview available in Business Hub (Zoho data already flows through the Clients tab) or a standalone Excel dashboard.",
    healthMetric:
      "% clients on Stripe. % clients with active recurring invoice in Zoho. Overdue invoice count (target: zero).",
    blocker:
      "No payment reminder system set up. Not enforcing overdue payments strictly. Clients resistant to committing to recurring payments. Markus forgetting to raise it in calls.",
    connectedProjects: [
      "Stripe/SEPA migration per client (one project per client)",
      "Payment reminder system setup",
      "Invoice forecasting dashboard (Zoho Books API — partially built)",
    ],
  },
  {
    name: "Marketing",
    status: "Needs Attention",
    standardShort:
      "Reliable, profitable inflow of high-quality leads who want to become clients at €500–€1000/month. Comes through Facebook ads, Instagram organic, and instant forms — multiple funnels.",
    standardFull:
      "Reliable, profitable inflow of high-quality leads who want to become clients at €500–€1000/month. Comes through Facebook ads, Instagram organic, and instant forms — multiple funnels. At least €1k/month ad spend running profitably, producing 1–2 new clients per month. Funnels are regularly reviewed and refined.",
    currentMilestoneShort: "Get funnel 1 live.",
    nextSteps:
      "Launch funnel 1 (move from testing to live). Activate instant forms.",
    nextFocus:
      "Test additional funnels. Once paid ads are stable and profitable, build organic content layer (Instagram).",
    goal: "Four-digit monthly ad spend running profitably. 1–2 new clients per month as a reliable, predictable rhythm.",
    healthMetric:
      "Ad spend ROI (profitable = positive). New leads per week. Lead show-up rate for calls (target: >50%).",
    blocker:
      "Markus is the blocker. Not implementing business coach feedback. Getting distracted by other tasks instead of following through. This area needs proactive AI Digest nudging when not touched for 2+ days.",
    connectedProjects: [
      "Funnel 1 launch",
      "Instant forms test",
      "Lead calling process / same-day follow-up",
      "Business coach feedback implementation",
    ],
  },
  {
    name: "Sales",
    status: "Needs Attention",
    standardShort:
      "Calendly booking fully streamlined. Clean call structure with scripts for both the analysis call and the sales call, stored in Notion.",
    standardFull:
      "Calendly booking fully streamlined. Clean call structure with scripts for both the analysis call and the sales call, stored in Notion. KPIs tracked. Markus knows his closing rate at all times and is actively improving it.",
    currentMilestoneShort:
      "Not yet defined — suggested sequence starts with documenting analysis and sales call scripts in Notion, then establishing a KPI baseline.",
    nextSteps:
      "Write analysis call script in Notion. Write sales call script in Notion.",
    nextFocus:
      "Upsell process for existing clients. Systematically identify clients ready to expand scope and build a script for that conversation.",
    goal: "3–4 sales calls per week. Closing rate tracked and improving. Upsell process active.",
    healthMetric:
      "Calls booked per week. Show-up rate. Closing rate (target to be defined after first 10 calls).",
    blocker: "No scripts or KPI tracking in place yet.",
    connectedProjects: [
      "Analysis call script (Notion)",
      "Sales call script (Notion)",
      "KPI tracking setup",
      "Upsell process design",
    ],
  },
  {
    name: "Development",
    status: "Needs Attention",
    standardShort:
      "Both apps (EasyFinance + Business Hub) in a working, stable state. Development happens on scheduled days every week — always moving forward.",
    standardFull:
      "Both apps (EasyFinance + Business Hub) in a working, stable state. Development happens on scheduled days every week — always moving forward. A clear feature roadmap exists with a timeline, not just a wishlist. Markus finishes features before starting new ones.",
    currentMilestoneShort: "EasyFinance v1.0 — currently ~70% complete.",
    nextSteps:
      "Write v1.0 acceptance criteria for EasyFinance (what must work before it's done). Write v1.0 acceptance criteria for Business Hub (tab-by-tab — use Capability Priority Order in CLAUDE.md).",
    nextFocus:
      "Establish a 2-features-per-week shipping rhythm. Improve EasyFinance dashboard. Incorporate client feedback as a regular input.",
    goal: "Both apps fully functional and actively used. Business Hub providing full operational clarity across all 6 tabs. EasyFinance running smoothly in client calls. Client login rate tracked.",
    healthMetric:
      "Features shipped per week (target: 2). Open bug count (target: trending to zero). EasyFinance client login rate (once migrations done).",
    blocker:
      "Shiny object syndrome — jumping to new features while existing sections remain unfinished and untested. Needs a rule: if open bug count > 3, next session is fixes-only. No new features.",
    connectedProjects: [
      "EasyFinance v1.0 completion (bugs, CSV upload, migration)",
      "Business Hub v1.0 completion (Tabs 1–6)",
      "EasyFinance dashboard improvement",
    ],
  },
  {
    name: "Operations",
    status: "Active",
    standardShort:
      "All tasks in one centralized Notion PARA database. Working by priority and importance, not impulse.",
    standardFull:
      "All tasks in one centralized Notion PARA database. Working by priority and importance, not impulse. Deadlines met. System is maintained, not just set up. Always know where to find everything. New inputs are captured and classified without friction.",
    currentMilestoneShort:
      "Complete the PARA migration — move all notes, tasks, ideas, and backlog items into Notion (Projects, Areas, Resources, Archive) so Business Hub's AI Digest can read and act on them.",
    nextSteps:
      "Finish Business Hub (prerequisite for AI to read PARA). Migrate existing projects into Notion Projects DB.",
    nextFocus:
      "Activate the capture formula: any new note, idea, or task goes into the Notion Inbox → Claude (Haiku) classifies it (Task / Idea / Reference / Someday) → routed to the right place automatically.",
    goal: "Fully structured PARA. Every input captured, classified, and routed without friction. Weekly review in place. Overdue task count near zero. Tasks always aligned with current roadmap priorities.",
    healthMetric:
      "Overdue task count (target: zero or near-zero). % of tasks aligned with current roadmap priorities. Inbox items unprocessed >48 hours (target: zero).",
    blocker: "None — dependent on Business Hub completion.",
    connectedProjects: [
      "Business Hub — all 6 tabs",
      "Notion PARA migration (projects, areas, resources, archive)",
      "Inbox + AI classification setup (Haiku routing — planned in Business Hub)",
      "This Areas brain dump and Notion Areas DB creation",
    ],
  },
  {
    name: "Content",
    status: "Paused",
    standardShort:
      "Active Instagram with regular posts on a consistent schedule. Incoming DMs answered — by Markus or automation.",
    standardFull:
      "Active Instagram with regular posts on a consistent schedule. Incoming DMs answered — by Markus or automation. Content drives real engagement: comments, saves, shares — not just passive views. Content also generates leads and sales, not just awareness.",
    currentMilestoneShort:
      "None active — area is fully and intentionally paused.",
    nextSteps:
      "Mine customer audience language — how clients actually talk about their problems (raw material for the AI system). Build inspiration and idea library in Notion.",
    nextFocus:
      "Repurposing pipeline — one piece of source content becomes multiple formats (carousel, reel, story, caption).",
    goal: "Fully automated content pipeline. Markus drops inspiration into a folder, AI generates drafts, 5 posts per week go live. Content drives measurable leads and sales alongside paid ads.",
    healthMetric:
      "Posts published per week (target: 5). Engagement rate (comments + saves + shares — not views alone). DM response time (target: <24h via automation).",
    blocker:
      "Waiting on Marketing funnel stability and Development milestone. Do not reactivate until both are unblocked.",
    connectedProjects: [
      "Customer voice / audience language research",
      "Inspiration library setup (Notion)",
      "AI content generation system (new build — Business Hub feature or standalone tool TBD)",
      "Instagram DM automation setup",
      "Content calendar (Notion)",
    ],
  },
  {
    name: "Personal",
    // Roadmap says "Mostly active, but uneven — some sub-areas slipping (dating, some
    // personal projects)". Mapping to Needs Attention so the AI Digest treats it as
    // a watch-area rather than a green light.
    status: "Needs Attention",
    standardShort:
      "Three evenings per week + one weekend day fully free — for personal projects, rest, or doing nothing. Gym 4x per week (1.5h each).",
    standardFull:
      "Three evenings per week + one weekend day fully free — for personal projects, rest, or doing nothing. Gym 4x per week (1.5h each). Supplements and nutrition plan on track. Body measurements and progress photos maintained (health coach program). Personal projects move forward — nothing gets neglected for several weeks. Family called at least once a week. Friends checked in on regularly. At least one date per week (Bumble). At least one trip every six months.",
    currentMilestoneShort: "No single milestone — maintain across all sub-areas.",
    nextSteps:
      "Open Bumble actively this week. Set up at least one date.",
    nextFocus:
      "The AI Digest should surface a different neglected personal activity every 1–2 weeks as a gentle reminder. Suggested rotation: card magic → Spanish/Japanese → dancing → dating → travel planning → reading → friends check-in → pool.",
    goal: "Flexible but nothing neglected. 1 trip booked and done. Dating active (1 date/week rhythm). Health program on track with measurable progress. Personal projects feel alive, not like a to-do list.",
    healthMetric:
      "Gym — 4x per week. Free evenings — 3 evenings + 1 weekend day. Dating (Bumble) — 1 date per week.",
    blocker:
      "Forgetting. Not remembering that card magic or dancing exists as an option until weeks have passed. The fix is reminders, not motivation.",
    connectedProjects: [
      "Book next trip (within 6 months)",
      "Establish Bumble weekly date habit",
      "Learn one new card trick (ongoing)",
      "Reach next milestone on health coach program",
      "Continue Spanish (level TBD)",
      "Start Japanese (beginner — no timeline pressure)",
    ],
    habits: [
      "Gym — 4x per week (nudge after 5 days)",
      "Free evenings — 3 evenings + 1 weekend day (flag if a week has none)",
      "Dating (Bumble) — 1 date per week (nudge after 10 days)",
      "Family call — 1x per week (nudge after 8 days)",
      "Card magic — At least 1x per 2 weeks (nudge after 14 days)",
      "Spanish — At least 1x per 2 weeks (nudge after 14 days)",
      "Japanese — At least 1x per 2 weeks (nudge after 14 days)",
      "Dancing — At least 1x per month (nudge after 25 days)",
      "Pool — At least 1x per month (nudge after 25 days)",
      "Friends check-in — At least 2x per month (nudge after 18 days)",
      "Travel — 1x per 6 months (if none booked by month 4)",
      "Progress photos — Monthly (nudge after 35 days)",
    ],
  },
];

// ---------- page-body builder ----------

function buildAreaBlocks(area) {
  const blocks = [
    headingBlock("Standard"),
    ...paragraphBlocks(area.standardFull),
    headingBlock("Blocker"),
    ...paragraphBlocks(area.blocker),
    headingBlock("Connected Projects"),
    ...area.connectedProjects.map((p) => bulletBlock(p)),
    headingBlock("Notes"),
    emptyParagraphBlock(),
  ];

  if (area.habits && area.habits.length) {
    blocks.push(headingBlock("Habit Targets"));
    for (const h of area.habits) blocks.push(bulletBlock(h));
  }

  return blocks;
}

// ---------- main ----------

async function main() {
  console.log("Creating Areas database under parent page:", PARENT_PAGE_ID);

  // Notion API 2025-09-03+: schema lives inside `initial_data_source.properties`,
  // not at the top level of the request body. Top-level `properties` is silently
  // ignored by the SDK (it warns and creates a database with only Name).
  const created = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    title: [{ type: "text", text: { content: "Areas" } }],
    initial_data_source: {
      properties: {
        Name: { title: {} },
        Status: {
          select: {
            options: [
              { name: "Active", color: "green" },
              { name: "Needs Attention", color: "yellow" },
              { name: "Paused", color: "gray" },
            ],
          },
        },
        Standard: { rich_text: {} },
        "Current Milestone": { rich_text: {} },
        "Milestone Due Date": { date: {} },
        "Next Steps": { rich_text: {} },
        "Next Focus": { rich_text: {} },
        Goal: { rich_text: {} },
        "Health Metric": { rich_text: {} },
      },
    },
  });

  const databaseId = created.id;
  console.log("\n✅ Created Areas database");
  console.log("   ID:", databaseId);
  console.log("   URL:", created.url ?? "(no url returned)");
  console.log("");

  // Seed each area as a page.
  for (const area of areas) {
    console.log(`→ Creating page: ${area.name}`);
    await notion.pages.create({
      parent: { type: "database_id", database_id: databaseId },
      properties: {
        Name: titleProperty(area.name),
        Status: selectProperty(area.status),
        Standard: richTextProperty(area.standardShort),
        "Current Milestone": richTextProperty(area.currentMilestoneShort),
        "Next Steps": richTextProperty(area.nextSteps),
        "Next Focus": richTextProperty(area.nextFocus),
        Goal: richTextProperty(area.goal),
        "Health Metric": richTextProperty(area.healthMetric),
      },
      children: buildAreaBlocks(area),
    });
  }

  console.log("\n✅ All 8 areas seeded.");
  console.log("\n--------------------------------------------------");
  console.log("Add this to .env.local:");
  console.log(`NOTION_AREAS_DB_ID=${databaseId.replace(/-/g, "")}`);
  console.log("--------------------------------------------------\n");
}

main().catch((err) => {
  console.error("\n❌ Script failed:");
  console.error(err?.body ?? err);
  process.exit(1);
});
