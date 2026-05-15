import { NextResponse } from "next/server";
import { getPageBlocks } from "@/lib/notion";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get("pageId");
  if (!pageId) {
    return NextResponse.json({ ok: false, error: "missing_pageId" }, { status: 400 });
  }
  try {
    const blocks = await getPageBlocks(pageId);
    return NextResponse.json({ ok: true, blocks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
