import { NextResponse } from "next/server";
import { getResourcePageBlocks } from "@/lib/notion";

export const runtime = "nodejs";

// Next.js 16: dynamic-segment params is a Promise. Matches the other dynamic
// routes in this repo (/api/areas/[areaId]/blocks, /api/clients/[zohoId], etc.).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }
  try {
    const blocks = await getResourcePageBlocks(id);
    return NextResponse.json({ ok: true, blocks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
