import "server-only";
import {
  STEAM_SEARCH_URL,
  STEAM_HEADER_URL,
  TMDB_API_BASE,
  TMDB_SEARCH_MOVIE_PATH,
  TMDB_SEARCH_TV_PATH,
  TMDB_IMAGE_BASE,
} from "@/constants/freizeit";

// ===========================================================================
// Cover-art resolution for the Freizeit tab.
//
//   Videospiel → Steam Storefront search → header.jpg (no API key)
//   Film       → TMDB /search/movie → first poster_path → w342 poster
//   Serie      → TMDB /search/tv    → first poster_path → w342 poster
//
// BEST-EFFORT: every failure (network, no hit, missing TMDB_API_KEY, timeout)
// resolves to `null` and logs a console.warn — resolveCover never throws and
// never blocks the create flow. External calls are kept serial (one HTTP call
// per resolve), no parallel bursts.
// ===========================================================================

const FETCH_TIMEOUT_MS = 8000;

// fetch with an AbortController timeout — returns null on any failure instead
// of throwing, so callers stay best-effort.
async function fetchJson(url: string, init?: RequestInit): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      console.warn(`[freizeit-covers] non-ok response ${res.status} for ${url}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[freizeit-covers] fetch failed for ${url}`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// The DB display names carry prefixes ("Movie", "Anime Movie", "Series") plus a
// leading "Film "/"Serie " label. Strip those before searching, otherwise TMDB
// fails to match. The stored display name is left untouched — this only affects
// the search query.
function cleanName(raw: string): string {
  let s = raw.trim();
  // Strip a leading category word the title may be prefixed with.
  s = s.replace(/^(anime\s+movie|movie|anime\s+series|series|film|serie)\s+/i, "");
  return s.trim();
}

async function resolveSteamCover(name: string): Promise<string | null> {
  const url = `${STEAM_SEARCH_URL}?term=${encodeURIComponent(name)}&cc=us&l=en`;
  const data = await fetchJson(url);
  // The storesearch endpoint returns `{ total, items: [{ id, name, ... }] }`.
  const first = Array.isArray(data?.items) ? data.items[0] : null;
  const appid = first?.id;
  if (appid === undefined || appid === null) return null;
  return STEAM_HEADER_URL(appid);
}

async function resolveTmdbCover(name: string, kind: "movie" | "tv"): Promise<string | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn("[freizeit-covers] TMDB_API_KEY not set — skipping TMDB resolve");
    return null;
  }
  const path = kind === "movie" ? TMDB_SEARCH_MOVIE_PATH : TMDB_SEARCH_TV_PATH;
  const url = `${TMDB_API_BASE}${path}?query=${encodeURIComponent(name)}`;
  // TMDB accepts a v4 read-access token as a Bearer header. (It also accepts a
  // v3 ?api_key= param, but Bearer is the documented modern path.)
  const data = await fetchJson(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  const posterPath = data?.results?.[0]?.poster_path;
  if (typeof posterPath !== "string" || posterPath.length === 0) return null;
  return `${TMDB_IMAGE_BASE}${posterPath}`;
}

// Resolve a cover image URL for a Freizeit item. Returns null on miss/error —
// never throws.
export async function resolveCover(input: {
  name: string;
  category: string | null | undefined;
}): Promise<string | null> {
  try {
    const query = cleanName(input.name);
    if (!query) return null;
    switch (input.category) {
      case "Videospiel":
        return await resolveSteamCover(query);
      case "Film":
        return await resolveTmdbCover(query, "movie");
      case "Serie":
        return await resolveTmdbCover(query, "tv");
      default:
        // Unknown / unset category — nothing to resolve against.
        return null;
    }
  } catch (err) {
    // Defensive — cleanName/switch shouldn't throw, but the contract is "never
    // throw" so we guard anyway.
    console.warn("[freizeit-covers] resolveCover failed", err);
    return null;
  }
}
