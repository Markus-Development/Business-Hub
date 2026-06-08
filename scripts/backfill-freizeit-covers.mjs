#!/usr/bin/env node
// One-off backfill: resolves cover art for existing Freizeit items that don't
// have a "Cover" yet, and writes the URL back to Notion. Run once via:
//   node --env-file=.env.local scripts/backfill-freizeit-covers.mjs
//
// Requires NOTION_TOKEN + NOTION_FREIZEIT_DB_ID, and TMDB_API_KEY for film/series
// posters (games resolve via Steam and need no key). Existing covers are NEVER
// overwritten — manual overrides are preserved. Safe to re-run.
//
// The resolution logic mirrors lib/freizeit-covers.ts and the endpoints in
// constants/freizeit.ts; this script is plain .mjs (node, no tsx) so it cannot
// import those .ts modules and replicates them inline.

import { Client } from "@notionhq/client";

// ---- endpoints (mirror constants/freizeit.ts) -----------------------------
const STEAM_SEARCH_URL = "https://store.steampowered.com/api/storesearch/";
const STEAM_HEADER_URL = (appid) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_SEARCH_MOVIE_PATH = "/search/movie";
const TMDB_SEARCH_TV_PATH = "/search/tv";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

const FETCH_TIMEOUT_MS = 8000;
const PAUSE_MS = 300; // gentle spacing against rate limits

const token = process.env.NOTION_TOKEN;
const dbId = process.env.NOTION_FREIZEIT_DB_ID;
const tmdbKey = process.env.TMDB_API_KEY;

if (!token || !dbId) {
  console.error(
    "NOTION_TOKEN and NOTION_FREIZEIT_DB_ID are required. Run with: node --env-file=.env.local scripts/backfill-freizeit-covers.mjs",
  );
  process.exit(1);
}
if (!tmdbKey) {
  console.warn(
    "⚠️  TMDB_API_KEY not set — Film/Serie items will MISS (only Videospiel/Steam will resolve).\n",
  );
}

const notion = new Client({ auth: token });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      console.warn(`  · non-ok ${res.status} for ${url}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`  · fetch failed for ${url}: ${err?.message ?? err}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Strip category prefixes ("Movie", "Anime Movie", "Series") + leading
// "Film "/"Serie " before searching. Display name is untouched.
function cleanName(raw) {
  return raw
    .trim()
    .replace(/^(anime\s+movie|movie|anime\s+series|series|film|serie)\s+/i, "")
    .trim();
}

async function resolveSteamCover(name) {
  const url = `${STEAM_SEARCH_URL}?term=${encodeURIComponent(name)}&cc=us&l=en`;
  const data = await fetchJson(url);
  // storesearch returns `{ total, items: [{ id, name, ... }] }`.
  const first = Array.isArray(data?.items) ? data.items[0] : null;
  if (first?.id === undefined || first?.id === null) return null;
  return STEAM_HEADER_URL(first.id);
}

async function resolveTmdbCover(name, kind) {
  if (!tmdbKey) return null;
  const path = kind === "movie" ? TMDB_SEARCH_MOVIE_PATH : TMDB_SEARCH_TV_PATH;
  const url = `${TMDB_API_BASE}${path}?query=${encodeURIComponent(name)}`;
  const data = await fetchJson(url, {
    headers: { Authorization: `Bearer ${tmdbKey}`, Accept: "application/json" },
  });
  const posterPath = data?.results?.[0]?.poster_path;
  if (typeof posterPath !== "string" || posterPath.length === 0) return null;
  return `${TMDB_IMAGE_BASE}${posterPath}`;
}

async function resolveCover(name, category) {
  const query = cleanName(name);
  if (!query) return null;
  switch (category) {
    case "Videospiel":
      return resolveSteamCover(query);
    case "Film":
      return resolveTmdbCover(query, "movie");
    case "Serie":
      return resolveTmdbCover(query, "tv");
    default:
      return null;
  }
}

async function firstDataSourceId() {
  const db = await notion.databases.retrieve({ database_id: dbId });
  const ds = db.data_sources?.[0];
  if (!ds) throw new Error("Freizeit DB has no data_sources — share the integration with the DB.");
  return ds.id;
}

// Idempotent: add the "Cover" (url) property if missing.
async function ensureCoverProperty(dataSourceId) {
  const ds = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  const props = ds.properties ?? {};
  if (props.Cover && props.Cover.type === "url") {
    console.log("  'Cover' property already exists — no schema change.");
    return;
  }
  console.log("  Adding 'Cover' (url) property…");
  await notion.dataSources.update({
    data_source_id: dataSourceId,
    properties: { Cover: { url: {} } },
  });
}

function readTitle(props) {
  const t = props?.Name;
  if (!t || t.type !== "title") return "";
  return t.title?.[0]?.plain_text ?? "";
}
function readSelect(props, key) {
  const s = props?.[key];
  if (!s || s.type !== "select") return null;
  return s.select?.name ?? null;
}
function readUrl(props, key) {
  const u = props?.[key];
  if (!u || u.type !== "url") return null;
  return typeof u.url === "string" && u.url.length > 0 ? u.url : null;
}

async function loadAllItems(dataSourceId) {
  const items = [];
  let cursor = undefined;
  do {
    const resp = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    });
    for (const page of resp.results ?? []) {
      if (page?.object === "page" && "properties" in page) {
        items.push({
          id: page.id,
          name: readTitle(page.properties),
          category: readSelect(page.properties, "Kategorie"),
          cover: readUrl(page.properties, "Cover"),
        });
      }
    }
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  return items;
}

async function main() {
  console.log("\n=== Freizeit cover backfill ===\n");
  const dataSourceId = await firstDataSourceId();
  console.log("  Data source:", dataSourceId);

  await ensureCoverProperty(dataSourceId);

  const all = await loadAllItems(dataSourceId);
  const todo = all.filter((i) => !i.cover); // never overwrite an existing cover
  console.log(
    `\n  ${all.length} items total, ${todo.length} without a cover (${all.length - todo.length} already set, skipped).\n`,
  );

  const hits = [];
  const misses = [];

  for (const item of todo) {
    const cover = await resolveCover(item.name, item.category);
    if (cover) {
      try {
        await notion.pages.update({
          page_id: item.id,
          properties: { Cover: { type: "url", url: cover } },
        });
        hits.push(item);
        console.log(`  ✅ ${item.category ?? "?"} — ${item.name}`);
      } catch (err) {
        misses.push(item);
        console.warn(`  ⚠️  write failed for ${item.name}: ${err?.message ?? err}`);
      }
    } else {
      misses.push(item);
      console.log(`  ❌ MISS — ${item.category ?? "?"} — ${item.name}`);
    }
    await sleep(PAUSE_MS);
  }

  console.log("\n--------------------------------------------------");
  console.log(`SUMMARY: ${hits.length} hits, ${misses.length} misses\n`);
  if (hits.length) {
    console.log("Hits:");
    for (const h of hits) console.log(`  ✅ [${h.category ?? "?"}] ${h.name}`);
  }
  if (misses.length) {
    console.log("\nMisses (set these manually in Notion):");
    for (const m of misses) console.log(`  ❌ [${m.category ?? "?"}] ${m.name}`);
  }
  console.log("--------------------------------------------------\n");
}

main().catch((err) => {
  console.error("\n❌ Backfill failed:");
  console.error(err?.body ?? err);
  process.exit(1);
});
