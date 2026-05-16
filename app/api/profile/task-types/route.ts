import { NextResponse } from "next/server";
import { fetchSelectOptions } from "@/lib/notion";

export const runtime = "nodejs";

const PROPERTY_NAME = "Task Type";

export async function GET() {
  try {
    const options = await fetchSelectOptions(PROPERTY_NAME);
    if (options === null) {
      return NextResponse.json({ options: [], missing: true });
    }
    return NextResponse.json({
      options: options.map((o) => ({ id: o.id, name: o.name })),
      missing: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
