import { NextResponse } from "next/server";
import { createBuch, updateBuch, type BuchDraft } from "@/lib/notion";
import { resolveCover } from "@/lib/buecher-covers";

export const runtime = "nodejs";

type Body = {
  name?: unknown;
  author?: unknown;
  tags?: unknown;
  link?: unknown;
  note?: unknown;
  body?: unknown;
};

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: Request) {
  if (!process.env.NOTION_BUCHER_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const { name, author, tags, link, note, body: pageBody } = body;
  if (typeof name !== "string" || name.trim().length === 0) return bad("missing_name");
  if (author !== undefined && author !== null && typeof author !== "string") {
    return bad("invalid_author");
  }
  if (
    tags !== undefined &&
    tags !== null &&
    !(Array.isArray(tags) && tags.every((t) => typeof t === "string"))
  ) {
    return bad("invalid_tags");
  }
  if (link !== undefined && link !== null && typeof link !== "string") return bad("invalid_link");
  if (note !== undefined && note !== null && typeof note !== "string") return bad("invalid_note");
  if (pageBody !== undefined && pageBody !== null && typeof pageBody !== "string") {
    return bad("invalid_body");
  }

  const draft: BuchDraft = {
    name: name.trim(),
    author: typeof author === "string" && author.length > 0 ? author : null,
    tags: Array.isArray(tags) ? (tags as string[]).filter((t) => t.length > 0) : null,
    link: typeof link === "string" && link.length > 0 ? link : null,
    note: typeof note === "string" && note.length > 0 ? note : null,
    body: typeof pageBody === "string" ? pageBody : "",
  };

  try {
    const item = await createBuch(draft);
    // Best-effort cover resolution — never blocks or fails the create. A miss or
    // any error just leaves the book without a cover (a future re-resolve can
    // fill it later).
    try {
      const cover = await resolveCover({ name: item.name, author: item.author });
      if (cover) {
        await updateBuch(item.id, { cover });
        item.cover = cover;
      }
    } catch (coverErr) {
      console.warn("[buecher] cover_resolve_failed", coverErr);
    }
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
