import "server-only";
import {
  GOOGLE_BOOKS_SEARCH_URL,
  OPENLIBRARY_SEARCH_URL,
  OPENLIBRARY_COVER_URL,
} from "@/constants/buecher";

// ===========================================================================
// Cover-art resolution for the Bücher tab.
//
//   1. Google Books  → q=intitle:<title>+inauthor:<author> → imageLinks.thumbnail
//   2. OpenLibrary   → ?title=<title>&author=<author> → docs[0].cover_i → -L.jpg
//
// Google Books is primary; OpenLibrary is the fallback when Google misses. Both
// are keyless (GOOGLE_BOOKS_API_KEY is optional — it only raises the quota).
//
// BEST-EFFORT: every failure (network, no hit, timeout) resolves to `null` and
// logs a console.warn — resolveCover never throws and never blocks the create
// flow. External calls are kept serial (Google first, OpenLibrary only on miss),
// no parallel bursts. Mirrors lib/freizeit-covers.ts.
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
      console.warn(`[buecher-covers] non-ok response ${res.status} for ${url}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[buecher-covers] fetch failed for ${url}`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Google Books returns thumbnails as http:// with a small zoom. Force https and
// bump zoom=1 → a slightly larger image when a zoom param is present.
function normalizeGoogleThumb(raw: string): string {
  let url = raw.replace(/^http:\/\//i, "https://");
  url = url.replace(/([?&]zoom=)\d+/i, "$11");
  return url;
}

async function resolveGoogleBooksCover(title: string, author: string): Promise<string | null> {
  const q = author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`;
  const params = new URLSearchParams({ q, maxResults: "1" });
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) params.set("key", apiKey);
  const data = await fetchJson(`${GOOGLE_BOOKS_SEARCH_URL}?${params.toString()}`);
  const thumb = data?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
  if (typeof thumb !== "string" || thumb.length === 0) return null;
  return normalizeGoogleThumb(thumb);
}

async function resolveOpenLibraryCover(title: string, author: string): Promise<string | null> {
  const params = new URLSearchParams({ title });
  if (author) params.set("author", author);
  params.set("limit", "1");
  const data = await fetchJson(`${OPENLIBRARY_SEARCH_URL}?${params.toString()}`);
  const coverId = data?.docs?.[0]?.cover_i;
  if (coverId === undefined || coverId === null) return null;
  return OPENLIBRARY_COVER_URL(coverId, "L");
}

// Resolve a cover image URL for a book. Returns null on miss/error — never
// throws.
export async function resolveCover(input: {
  name: string;
  author?: string | null;
}): Promise<string | null> {
  try {
    const title = input.name.trim();
    if (!title) return null;
    const author = (input.author ?? "").trim();

    // Google Books first.
    const google = await resolveGoogleBooksCover(title, author);
    if (google) return google;

    // OpenLibrary fallback.
    const openLibrary = await resolveOpenLibraryCover(title, author);
    if (openLibrary) return openLibrary;

    return null;
  } catch (err) {
    // Defensive — the helpers above already swallow their own errors, but the
    // contract is "never throw" so we guard anyway.
    console.warn("[buecher-covers] resolveCover failed", err);
    return null;
  }
}
