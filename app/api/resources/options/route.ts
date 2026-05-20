import { NextResponse } from "next/server";
import { fetchResourceSelectOptions, type SelectOption } from "@/lib/notion";

export const runtime = "nodejs";

// Returns the Notion option list (with `color`) for the Resources DB's `Area`
// property — its own 18-value taxonomy, distinct from the Projects departments.
// The Add-Note dialog uses this so it offers the correct Area values rather
// than the (wrong) `DEPARTMENTS` constant. Mirrors /api/projects/options.
//
// `null` from fetchResourceSelectOptions means the property is missing or of
// the wrong type — surfaced as an empty array so the caller degrades cleanly.
export async function GET() {
  try {
    const area = await fetchResourceSelectOptions("Area");
    return NextResponse.json({ area: (area ?? []) as SelectOption[] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
