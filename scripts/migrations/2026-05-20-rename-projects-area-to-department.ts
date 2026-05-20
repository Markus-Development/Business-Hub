/**
 * One-off Notion schema migration — 2026-05-20
 * Phase 1 of the archive-automation work.
 *
 * Runs the coordinated Notion schema edits that pair with the codebase rename
 * (Projects.Area -> Department). Execute AFTER the code rename has shipped:
 *
 *   4A  Rename the Projects DB "Area" select property to "Department".
 *   4B  Resync the Archive DB "Area" select to the 18 canonical Resources
 *       values (the Archive DB had drifted to 10 stale values; it has zero
 *       rows, so no row migration is needed).
 *   4C  Add a new "Department" select to the Archive DB so archived Projects
 *       can carry their department value (consumed in Phase 2).
 *
 * IMPORTANT — API version: under Notion API 2025-09-03 the schema (`properties`)
 * lives on a DATA SOURCE, not the database. Every edit therefore goes through
 * `notion.dataSources.update`, NOT `notion.databases.update`. (The snippet in
 * the original task brief used `databases.update`; that predates the
 * 2025-09-03 database/data-source split — verified against the Notion docs.)
 *
 * Each step re-fetches the data source and asserts the result. A failed
 * assertion throws and aborts the run — there is no automatic cleanup.
 *
 * Run once, from the repo root:
 *   npx tsx scripts/migrations/2026-05-20-rename-projects-area-to-department.ts
 *
 * Kept in the repo as an audit trail.
 */

import { Client } from "@notionhq/client";

// Load .env.local (Node >= 22 built-in — no dotenv dependency added).
process.loadEnvFile(".env.local");

const token = process.env.NOTION_TOKEN;
const projectsDbId = process.env.NOTION_PROJECTS_DB_ID;
const archivesDbId = process.env.NOTION_ARCHIVES_DB_ID;

if (!token) fail("NOTION_TOKEN is not set in .env.local");
if (!projectsDbId) fail("NOTION_PROJECTS_DB_ID is not set in .env.local");
if (!archivesDbId) fail("NOTION_ARCHIVES_DB_ID is not set in .env.local");

const notion = new Client({ auth: token });

// The 18 canonical Resources "Area" options (name + color), verbatim.
const RESOURCE_AREA_OPTIONS: { name: string; color: string }[] = [
  { name: "EasyFinance", color: "blue" },
  { name: "Geldstruktur", color: "purple" },
  { name: "Client Delivery", color: "orange" },
  { name: "Dance Business", color: "pink" },
  { name: "Marketing", color: "red" },
  { name: "Sales", color: "yellow" },
  { name: "Wealth & Finance", color: "green" },
  { name: "Crypto & Trading", color: "orange" },
  { name: "Legal & Tax", color: "gray" },
  { name: "AI & Prompting", color: "purple" },
  { name: "Tech/Dev", color: "blue" },
  { name: "Productivity & Systems", color: "brown" },
  { name: "Languages", color: "yellow" },
  { name: "Card Magic", color: "red" },
  { name: "Health & Body", color: "green" },
  { name: "Mindset & Reflection", color: "default" },
  { name: "Education", color: "purple" },
  { name: "Movies", color: "blue" },
];

// The 8 Projects "Department" values — added as the new Archive "Department"
// select. Colors are left to Notion's auto-assignment (the assertion checks
// names only).
const DEPARTMENT_OPTIONS: { name: string }[] = [
  { name: "Fulfillment" },
  { name: "Marketing" },
  { name: "Sales" },
  { name: "Development" },
  { name: "Operations" },
  { name: "Content" },
  { name: "Personal" },
  { name: "Accounting" },
];

// ---------- helpers ----------

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

function assert(condition: boolean, message: string): void {
  if (!condition) fail(`Assertion failed: ${message}`);
}

function log(message: string): void {
  console.log(`  ${message}`);
}

/** Resolves a database id to its first data source id (single-source DB). */
async function firstDataSourceId(databaseId: string, label: string): Promise<string> {
  const db = (await notion.databases.retrieve({ database_id: databaseId })) as unknown as {
    data_sources?: { id: string; name: string }[];
  };
  const ds = db.data_sources?.[0];
  if (!ds) {
    fail(`${label} DB (${databaseId}) has no data_sources — is the integration shared with it?`);
  }
  return ds.id;
}

type PropertySchema = { type?: string; select?: { options?: { name: string }[] } };

/** Re-fetches a data source and returns its property schema map. */
async function fetchProperties(dataSourceId: string): Promise<Record<string, PropertySchema>> {
  const ds = (await notion.dataSources.retrieve({
    data_source_id: dataSourceId,
  })) as unknown as { properties?: Record<string, PropertySchema> };
  return ds.properties ?? {};
}

function optionNames(prop: PropertySchema | undefined): string[] {
  return (prop?.select?.options ?? []).map((o) => o.name).sort();
}

function sameSet(actual: string[], expected: string[]): boolean {
  const a = [...actual].sort();
  const e = [...expected].sort();
  return a.length === e.length && a.every((v, i) => v === e[i]);
}

// ---------- migration ----------

async function main(): Promise<void> {
  console.log("\n=== Notion schema migration: Projects.Area -> Department ===\n");

  const projectsDsId = await firstDataSourceId(projectsDbId!, "Projects");
  const archivesDsId = await firstDataSourceId(archivesDbId!, "Archive");
  log(`Projects data source: ${projectsDsId}`);
  log(`Archive  data source: ${archivesDsId}`);

  // ---- 4A — Rename Projects "Area" -> "Department" -----------------------
  console.log("\n[4A] Rename Projects DB property: Area -> Department");
  {
    const before = await fetchProperties(projectsDsId);
    if (before.Department && !before.Area) {
      log("Already renamed (Department present, Area absent) — skipping the update.");
    } else if (!before.Area) {
      fail("Projects DB has neither an 'Area' nor a 'Department' property — cannot rename.");
    } else {
      await notion.dataSources.update({
        data_source_id: projectsDsId,
        properties: { Area: { name: "Department" } },
      } as never);
      log("Update sent.");
    }

    const after = await fetchProperties(projectsDsId);
    assert("Department" in after, "Projects DB should have a 'Department' property after rename");
    assert(!("Area" in after), "Projects DB should no longer have an 'Area' property after rename");
    assert(
      after.Department?.type === "select",
      `Projects DB 'Department' should be a select property (got '${after.Department?.type}')`,
    );
    log("✓ Assertion passed: Projects DB property is now 'Department' (select).");
  }

  // ---- 4B — Resync Archive "Area" options to the 18 Resources values -----
  // Notion's API forbids changing the COLOR of an existing select option. The
  // Archive 'Area' select had drifted to 10 stale options, some of whose names
  // (e.g. "Marketing") collide with the canonical 18 but carry a different
  // color — an in-place option update is therefore rejected. So we clear the
  // option set first, then recreate all 18 fresh (a brand-new option may take
  // any color). Safe: the Archive DB has zero rows, so clearing loses nothing.
  console.log("\n[4B] Resync Archive DB 'Area' select to the 18 canonical Resources options");
  {
    // 4B-i — clear every existing option so no name/color collision remains.
    await notion.dataSources.update({
      data_source_id: archivesDsId,
      properties: {
        Area: { select: { options: [] } },
      },
    } as never);
    const cleared = await fetchProperties(archivesDsId);
    assert(
      optionNames(cleared.Area).length === 0,
      `Archive 'Area' should have 0 options after the clear step (got ${optionNames(cleared.Area).length})`,
    );
    log("Cleared existing (stale) options.");

    // 4B-ii — recreate all 18 canonical options with their spec colors.
    await notion.dataSources.update({
      data_source_id: archivesDsId,
      properties: {
        Area: { select: { options: RESOURCE_AREA_OPTIONS } },
      },
    } as never);
    log("Update sent.");

    const after = await fetchProperties(archivesDsId);
    assert("Area" in after, "Archive DB should have an 'Area' property");
    assert(
      after.Area?.type === "select",
      `Archive DB 'Area' should be a select property (got '${after.Area?.type}')`,
    );
    const expected = RESOURCE_AREA_OPTIONS.map((o) => o.name);
    const actual = optionNames(after.Area);
    assert(
      sameSet(actual, expected),
      `Archive 'Area' option set mismatch.\n     expected (${expected.length}): ${[...expected].sort().join(", ")}\n     actual   (${actual.length}): ${actual.join(", ")}`,
    );
    log(`✓ Assertion passed: Archive 'Area' has exactly the 18 Resources options.`);
  }

  // ---- 4C — Add new Archive "Department" select -------------------------
  console.log("\n[4C] Add Archive DB 'Department' select (8 Projects department values)");
  {
    await notion.dataSources.update({
      data_source_id: archivesDsId,
      properties: {
        Department: { select: { options: DEPARTMENT_OPTIONS } },
      },
    } as never);
    log("Update sent.");

    const after = await fetchProperties(archivesDsId);
    assert("Department" in after, "Archive DB should have a 'Department' property");
    assert(
      after.Department?.type === "select",
      `Archive DB 'Department' should be a select property (got '${after.Department?.type}')`,
    );
    const expected = DEPARTMENT_OPTIONS.map((o) => o.name);
    const actual = optionNames(after.Department);
    assert(
      sameSet(actual, expected),
      `Archive 'Department' option set mismatch.\n     expected (${expected.length}): ${[...expected].sort().join(", ")}\n     actual   (${actual.length}): ${actual.join(", ")}`,
    );
    log("✓ Assertion passed: Archive 'Department' select created with the 8 department values.");
  }

  console.log("\n=== Migration complete — all three steps verified. ===\n");
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
