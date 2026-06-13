import { NextResponse } from "next/server";
import { fetchResourceSelectOptions, type SelectOption } from "@/lib/notion";

export const runtime = "nodejs";

// Returns the Notion option lists (each entry with its `color`) for the
// Resources DB's `Area`, `Type` and `Status` properties — the Resources DB's
// own taxonomies, distinct from the Projects departments. The Add-Note dialog
// uses `area`; the table uses all three to paint read-only colour pills.
// Mirrors /api/projects/options.
//
// `null` from fetchResourceSelectOptions means the property is missing or of
// the wrong type — surfaced as an empty array so the caller degrades cleanly.
export async function GET() {
  try {
    const [area, type, status] = await Promise.all([
      fetchResourceSelectOptions("Area"),
      fetchResourceSelectOptions("Type"),
      fetchResourceSelectOptions("Status"),
    ]);
    return NextResponse.json({
      area: (area ?? []) as SelectOption[],
      type: (type ?? []) as SelectOption[],
      status: (status ?? []) as SelectOption[],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
