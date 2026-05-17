import { NextResponse } from "next/server";
import { getAreaPageBlocks } from "@/lib/notion";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ areaId: string }> }) {
  const { areaId } = await ctx.params;
  if (typeof areaId !== "string" || areaId.length === 0) {
    return NextResponse.json({ ok: false, error: "missing_areaId" }, { status: 400 });
  }
  try {
    const blocks = await getAreaPageBlocks(areaId);
    return NextResponse.json({ ok: true, blocks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
