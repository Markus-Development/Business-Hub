/**
 * One-off Notion schema migration — 2026-05-20
 * Phase 2 of the archive-automation work.
 *
 * Adds an "Archived" option to the Projects DB `Status` property. Setting a
 * project's Status to "Archived" from Business Hub triggers an immediate move
 * to the Archive DB (see lib/notion.ts `archiveProjectPage` and the intercept
 * in app/api/projects/update/route.ts).
 *
 * `Status` is a `status`-type property. Some Notion plans treat `status`
 * options as API-immutable; on this workspace the API add succeeded. If a
 * future re-run is rejected, add "Archived" to the Status property by hand in
 * the Notion UI (1 click) — the script is idempotent and will then no-op.
 *
 * Schema edits use the 2025-09-03 API: `properties` lives on a DATA SOURCE, so
 * the update goes through `notion.dataSources.update`.
 *
 * Run once, from the repo root:
 *   npx tsx scripts/migrations/2026-05-20-add-projects-status-archived.ts
 *
 * Kept in the repo as an audit trail. Idempotent — safe to re-run.
 */

import { Client } from "@notionhq/client";

// Load .env.local (Node >= 22 built-in — no dotenv dependency added).
process.loadEnvFile(".env.local");

const token = process.env.NOTION_TOKEN;
const projectsDbId = process.env.NOTION_PROJECTS_DB_ID;

if (!token) fail("NOTION_TOKEN is not set in .env.local");
if (!projectsDbId) fail("NOTION_PROJECTS_DB_ID is not set in .env.local");

const notion = new Client({ auth: token });

const NEW_OPTION = "Archived";

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

function assert(condition: boolean, message: string): void {
  if (!condition) fail(`Assertion failed: ${message}`);
}

type StatusOption = { name: string; color?: string };

async function firstDataSourceId(databaseId: string): Promise<string> {
  const db = (await notion.databases.retrieve({ database_id: databaseId })) as unknown as {
    data_sources?: { id: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) fail(`Projects DB (${databaseId}) has no data_sources — is the integration shared with it?`);
  return ds.id;
}

async function statusOptions(dataSourceId: string): Promise<StatusOption[]> {
  const ds = (await notion.dataSources.retrieve({
    data_source_id: dataSourceId,
  })) as unknown as { properties?: Record<string, { type?: string; status?: { options?: StatusOption[] } }> };
  const status = ds.properties?.Status;
  if (!status) fail("Projects DB has no 'Status' property.");
  if (status.type !== "status") fail(`Projects DB 'Status' is '${status.type}', expected 'status'.`);
  return status.status?.options ?? [];
}

async function main(): Promise<void> {
  console.log("\n=== Notion schema migration: add 'Archived' to Projects.Status ===\n");

  const projectsDsId = await firstDataSourceId(projectsDbId!);
  console.log(`  Projects data source: ${projectsDsId}`);

  const before = await statusOptions(projectsDsId);
  console.log(`  Current Status options: ${before.map((o) => o.name).join(", ")}`);

  if (before.some((o) => o.name === NEW_OPTION)) {
    console.log(`\n  '${NEW_OPTION}' is already present — no change.\n`);
    return;
  }

  console.log(`  Adding '${NEW_OPTION}'…`);
  try {
    await notion.dataSources.update({
      data_source_id: projectsDsId,
      properties: {
        Status: {
          status: {
            options: [
              ...before.map((o) => ({ name: o.name, color: o.color })),
              { name: NEW_OPTION, color: "default" },
            ],
          },
        },
      },
    } as never);
  } catch (err) {
    console.error(`\n  ✗ The Notion API rejected the Status option update.`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    console.error(
      `\n  ACTION REQUIRED: open the Projects database in Notion, edit the\n` +
        `  'Status' property, and add an option named '${NEW_OPTION}'. Then re-run\n` +
        `  this script to verify.\n`,
    );
    process.exit(1);
  }

  const after = await statusOptions(projectsDsId);
  assert(
    after.some((o) => o.name === NEW_OPTION),
    `Projects DB 'Status' should contain '${NEW_OPTION}' after the update`,
  );
  console.log(`  ✓ Status options now: ${after.map((o) => o.name).join(", ")}`);
  console.log("\n=== Migration complete. ===\n");
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
