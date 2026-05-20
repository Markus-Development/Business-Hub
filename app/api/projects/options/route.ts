import { NextResponse } from "next/server";
import { fetchSelectOptions, type SelectOption } from "@/lib/notion";

export const runtime = "nodejs";

// Returns the Notion option lists (with `color`) for the Projects DB's
// Status and Department properties. Used by the Projects table to colour
// badges from live Notion data rather than hardcoded enum-based colours.
//
// `null` from fetchSelectOptions means the property is missing or of the
// wrong type — surfaced as an empty array so the UI just falls back to the
// muted default colour without surfacing an error toast.
export async function GET() {
  try {
    const [status, department] = await Promise.all([
      fetchSelectOptions("Status"),
      fetchSelectOptions("Department"),
    ]);
    return NextResponse.json({
      status: (status ?? []) as SelectOption[],
      department: (department ?? []) as SelectOption[],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
