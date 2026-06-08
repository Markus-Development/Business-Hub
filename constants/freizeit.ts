// Freizeit (leisure) taxonomy — Filme, Serien, Videospiele. Values are
// case-sensitive and MUST match the Notion "Freizeit" DB select options exactly
// (created by scripts/create-freizeit-db.mjs). Mirrors the constants pattern of
// constants/call-notes.ts and constants/priorities.ts.

export const FREIZEIT_CATEGORIES = ["Film", "Serie", "Videospiel"] as const;
export type FreizeitCategory = (typeof FREIZEIT_CATEGORIES)[number];

export const FREIZEIT_STATUSES = ["Offen", "Läuft", "Erledigt"] as const;
export type FreizeitStatus = (typeof FREIZEIT_STATUSES)[number];

// ===== Cover-art resolution endpoints =======================================
// Steam (Videospiel) needs no API key; TMDB (Film/Serie) needs TMDB_API_KEY.
// Never inline these URLs in code — import from here so an endpoint change is a
// one-line edit (mirrors the constants discipline in CLAUDE.md).

// Steam Storefront search — first result yields the app id.
export const STEAM_SEARCH_URL = "https://store.steampowered.com/api/storesearch/";
// Steam header image for a resolved app id.
export const STEAM_HEADER_URL = (appid: number | string): string =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;

// TMDB v3 search endpoints (Film → movie, Serie → tv).
export const TMDB_API_BASE = "https://api.themoviedb.org/3";
export const TMDB_SEARCH_MOVIE_PATH = "/search/movie";
export const TMDB_SEARCH_TV_PATH = "/search/tv";
// TMDB image CDN base + the poster size used for cover art.
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";
