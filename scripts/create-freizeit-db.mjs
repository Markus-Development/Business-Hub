#!/usr/bin/env node
// One-off setup script: creates the Notion "Freizeit" database (Filme, Serien,
// Videospiele) under the same parent page as the Areas DB. Run once via:
//   node --env-file=.env.local scripts/create-freizeit-db.mjs
// Then paste the logged ID into .env.local as NOTION_FREIZEIT_DB_ID.
// Safe to delete after a successful run.

import { Client } from "@notionhq/client";

// Same parent page as the Areas DB (scripts/create-areas-db.mjs) — keep the new
// PARA-adjacent DB co-located with the rest of the BH-managed Notion DBs.
const PARENT_PAGE_ID = "361dbb6a-cff7-8026-ad69-e96b87a5a0d4";

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error(
    "NOTION_TOKEN missing from environment. Run with: node --env-file=.env.local scripts/create-freizeit-db.mjs",
  );
  process.exit(1);
}

const notion = new Client({ auth: token });

async function main() {
  console.log("Creating Freizeit database under parent page:", PARENT_PAGE_ID);

  // Notion API 2025-09-03+: schema lives inside `initial_data_source.properties`,
  // not at the top level of the request body. Top-level `properties` is silently
  // ignored by the SDK (it warns and creates a database with only Name).
  const created = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    title: [{ type: "text", text: { content: "Freizeit" } }],
    initial_data_source: {
      properties: {
        Name: { title: {} },
        Kategorie: {
          select: {
            options: [
              { name: "Film", color: "blue" },
              { name: "Serie", color: "purple" },
              { name: "Videospiel", color: "green" },
            ],
          },
        },
        Status: {
          select: {
            options: [
              // "Offen" is the default state for newly captured items.
              { name: "Offen", color: "default" },
              { name: "Läuft", color: "yellow" },
              { name: "Erledigt", color: "gray" },
            ],
          },
        },
        "Erledigt am": { date: {} },
        Link: { url: {} },
        Notiz: { rich_text: {} },
      },
    },
  });

  const databaseId = created.id;
  console.log("\n✅ Created Freizeit database");
  console.log("   ID:", databaseId);
  console.log("   ID (no dashes):", databaseId.replace(/-/g, ""));
  console.log("   URL:", created.url ?? "(no url returned)");
  console.log("\n--------------------------------------------------");
  console.log("Add this to .env.local:");
  console.log(`NOTION_FREIZEIT_DB_ID=${databaseId.replace(/-/g, "")}`);
  console.log("--------------------------------------------------\n");
}

main().catch((err) => {
  console.error("\n❌ Script failed:");
  console.error(err?.body ?? err);
  process.exit(1);
});
