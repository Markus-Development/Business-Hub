import { NextResponse } from "next/server";
import { CallNoteError, persistCallNote, type PersistCallNoteInput } from "@/lib/calls";

export const runtime = "nodejs";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// POST /api/calls/create — writes a page into the Notion Call Notes DB.
// Called by the external "Call Miner" Cowork skill, not by Business Hub UI.
// The Client relation is resolved server-side from a Zoho contact id; a
// client-supplied Notion page id is never trusted.
//
// Validation + client resolution + the Notion write all live in
// `persistCallNote` (lib/calls.ts), shared with /api/calls/mine. The responses
// and error codes here are unchanged from the original inline implementation.
export async function POST(req: Request) {
  let body: PersistCallNoteInput;
  try {
    body = (await req.json()) as PersistCallNoteInput;
  } catch {
    return bad("invalid_json");
  }

  try {
    const { id, url } = await persistCallNote(body);
    return NextResponse.json({ ok: true, id, url });
  } catch (err) {
    if (err instanceof CallNoteError) return bad(err.message, err.status);
    const message = err instanceof Error ? err.message : "unknown_error";
    // Defensive: createCallNote also guards the env var.
    if (message === "call_notes_not_configured") return bad("not_configured", 503);
    // eslint-disable-next-line no-console
    console.error("call_note_create_failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
