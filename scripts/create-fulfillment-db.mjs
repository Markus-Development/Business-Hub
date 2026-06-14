#!/usr/bin/env node
// One-off setup script: creates the Notion "🚚 10 Fulfillment" database under the
// same parent page as the Areas / Freizeit / Bücher DBs. One page per client per
// month tracks the four fulfillment stages as checkboxes; the Client property is a
// relation back into the Clients DB. Run once via:
//   node --env-file=.env.local scripts/create-fulfillment-db.mjs
// Then paste the logged ID into .env.local as NOTION_FULFILLMENT_DB_ID, and share
// the Notion integration with the new database.
// Safe to delete after a successful run.

import { Client } from "@notionhq/client";

// Same parent page as the Areas/Freizeit/Bücher DBs — keep the new PARA-adjacent
// DB co-located with the rest of the BH-managed Notion DBs.
const PARENT_PAGE_ID = "361dbb6a-cff7-8026-ad69-e96b87a5a0d4";

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error(
    "NOTION_TOKEN missing from environment. Run with: node --env-file=.env.local scripts/create-fulfillment-db.mjs",
  );
  process.exit(1);
}

const clientsDbId = process.env.NOTION_CLIENTS_DB_ID;
if (!clientsDbId) {
  console.error(
    "NOTION_CLIENTS_DB_ID missing — the Fulfillment DB's Client relation points at the Clients DB, so its data source id must be resolved first.",
  );
  process.exit(1);
}

const notion = new Client({ auth: token });

async function main() {
  console.log("Resolving Clients DB data source for the Client relation…");
  // API 2025-09-03+: a relation property must reference a `data_source_id`, not a
  // `database_id`. Retrieve the Clients DB and take its first data source.
  const clientsDb = await notion.databases.retrieve({ database_id: clientsDbId });
  const clientsDataSourceId = clientsDb?.data_sources?.[0]?.id;
  if (!clientsDataSourceId) {
    throw new Error(
      "Clients DB has no data_sources — is the integration shared with the Clients database?",
    );
  }
  console.log("   Clients data source:", clientsDataSourceId);

  console.log("Creating Fulfillment database under parent page:", PARENT_PAGE_ID);

  // Notion API 2025-09-03+: schema lives inside `initial_data_source.properties`,
  // not at the top level of the request body.
  const created = await notion.databases.create({
    parent: { type: "page_id", page_id: PARENT_PAGE_ID },
    title: [{ type: "text", text: { content: "🚚 10 Fulfillment" } }],
    initial_data_source: {
      properties: {
        Name: { title: {} },
        Client: {
          relation: {
            data_source_id: clientsDataSourceId,
            single_property: {},
          },
        },
        // The month the fulfillment cycle belongs to — stored as the 1st of the
        // month so a `date.equals` filter pins a row to exactly one month.
        Monat: { date: {} },
        // The four fulfillment stages — case-sensitive, must match
        // FULFILLMENT_STAGES in constants/fulfillment.ts.
        "Call Termin": { checkbox: {} },
        Transaktionen: { checkbox: {} },
        Ready: { checkbox: {} },
        Fertig: { checkbox: {} },
        Notiz: { rich_text: {} },
      },
    },
  });

  const databaseId = created.id;
  console.log("\n✅ Created Fulfillment database");
  console.log("   ID:", databaseId);
  console.log("   ID (no dashes):", databaseId.replace(/-/g, ""));
  console.log("   URL:", created.url ?? "(no url returned)");
  console.log("\n--------------------------------------------------");
  console.log("Add this to .env.local:");
  console.log(`NOTION_FULFILLMENT_DB_ID=${databaseId.replace(/-/g, "")}`);
  console.log("--------------------------------------------------");
  console.log(
    "Then share the Notion integration with the new database (•••  → Connections) so queries don't return empty.\n",
  );
}

main().catch((err) => {
  console.error("\n❌ Script failed:");
  console.error(err?.body ?? err);
  process.exit(1);
});
