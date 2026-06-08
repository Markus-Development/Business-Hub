import { NextResponse } from "next/server";
import { createFreizeitItem, updateFreizeitItem, type FreizeitDraft } from "@/lib/notion";
import { resolveCover } from "@/lib/freizeit-covers";
import { FREIZEIT_CATEGORIES, type FreizeitCategory } from "@/constants/freizeit";

export const runtime = "nodejs";

type Body = {
  name?: unknown;
  category?: unknown;
  link?: unknown;
  note?: unknown;
  body?: unknown;
};

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: Request) {
  if (!process.env.NOTION_FREIZEIT_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const { name, category, link, note, body: pageBody } = body;
  if (typeof name !== "string" || name.trim().length === 0) return bad("missing_name");
  if (
    category !== undefined &&
    category !== null &&
    !FREIZEIT_CATEGORIES.includes(category as FreizeitCategory)
  ) {
    return bad("invalid_category");
  }
  if (link !== undefined && link !== null && typeof link !== "string") return bad("invalid_link");
  if (note !== undefined && note !== null && typeof note !== "string") return bad("invalid_note");
  if (pageBody !== undefined && pageBody !== null && typeof pageBody !== "string") {
    return bad("invalid_body");
  }

  const draft: FreizeitDraft = {
    name: name.trim(),
    category: typeof category === "string" && category.length > 0 ? category : null,
    link: typeof link === "string" && link.length > 0 ? link : null,
    note: typeof note === "string" && note.length > 0 ? note : null,
    body: typeof pageBody === "string" ? pageBody : "",
  };

  try {
    const item = await createFreizeitItem(draft);
    // Best-effort cover resolution — never blocks or fails the create. A miss or
    // any error just leaves the item without a cover (the backfill script and a
    // future re-resolve can fill it later).
    try {
      const cover = await resolveCover({ name: item.name, category: item.category });
      if (cover) {
        await updateFreizeitItem(item.id, { cover });
        item.cover = cover;
      }
    } catch (coverErr) {
      console.warn("[freizeit] cover_resolve_failed", coverErr);
    }
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
