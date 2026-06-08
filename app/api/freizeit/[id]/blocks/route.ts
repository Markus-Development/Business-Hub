import { NextResponse } from "next/server";
import { getFreizeitPageBlocks } from "@/lib/notion";

export const runtime = "nodejs";

// Next.js 16: dynamic-segment params is a Promise. Matches the other dynamic
// routes in this repo (/api/resources/[id]/blocks, /api/areas/[areaId]/blocks).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!process.env.NOTION_FREIZEIT_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }
  try {
    const blocks = await getFreizeitPageBlocks(id);
    return NextResponse.json({ ok: true, blocks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
