import { NextResponse } from "next/server";
import { createCallNote, listNotionClients, type CallNoteDraft } from "@/lib/notion";
import {
  ALL_OUTCOMES,
  CALL_TYPES,
  ENGAGEMENT_LEVELS,
  OBJECTION_TAGS,
  OUTCOMES_CLIENT,
  OUTCOMES_COACHING,
  OUTCOMES_SALES,
  type CallType,
  type EngagementLevel,
  type ObjectionTag,
  type Outcome,
} from "@/constants/call-notes";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Body = {
  name?: unknown;
  callType?: unknown;
  date?: unknown;
  duration?: unknown;
  outcome?: unknown;
  engagement?: unknown;
  objectionsCount?: unknown;
  objectionsTags?: unknown;
  body?: unknown;
  clientZohoId?: unknown;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// POST /api/calls/create — writes a page into the Notion Call Notes DB.
// Called by the external "Call Miner" Cowork skill, not by Business Hub UI.
// The Client relation is resolved server-side from a Zoho contact id; a
// client-supplied Notion page id is never trusted.
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const {
    name,
    callType,
    date,
    duration,
    outcome,
    engagement,
    objectionsCount,
    objectionsTags,
    body: pageBody,
    clientZohoId,
  } = body;

  // --- required fields ---
  if (typeof name !== "string" || name.trim().length === 0) return bad("missing_name");
  if (typeof callType !== "string" || !(CALL_TYPES as readonly string[]).includes(callType)) {
    return bad("invalid_call_type");
  }
  if (typeof date !== "string" || !DATE_RE.test(date)) return bad("invalid_date");

  // --- duration (optional): number >= 0 ---
  if (duration !== undefined && duration !== null) {
    if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0) {
      return bad("invalid_duration");
    }
  }

  // --- outcome (optional): in ALL_OUTCOMES, and the family must match the call
  //     type. Each call type has its own allowed set; "At Risk" is shared by the
  //     Client and Coaching sets, so it is valid for either of those call types.
  //     "Other" has no outcome family — any in-family outcome mismatches. ---
  if (outcome !== undefined && outcome !== null) {
    if (typeof outcome !== "string" || !(ALL_OUTCOMES as readonly string[]).includes(outcome)) {
      return bad("invalid_outcome");
    }
    const ALLOWED_OUTCOMES: Record<string, readonly string[]> = {
      Sales: OUTCOMES_SALES,
      Client: OUTCOMES_CLIENT,
      Coaching: OUTCOMES_COACHING,
      Other: [],
    };
    if (!(ALLOWED_OUTCOMES[callType] ?? []).includes(outcome)) {
      return bad("outcome_type_mismatch");
    }
  }

  // --- engagement (optional) ---
  if (engagement !== undefined && engagement !== null) {
    if (
      typeof engagement !== "string" ||
      !(ENGAGEMENT_LEVELS as readonly string[]).includes(engagement)
    ) {
      return bad("invalid_engagement");
    }
  }

  // --- objectionsCount (optional): integer >= 0 ---
  if (objectionsCount !== undefined && objectionsCount !== null) {
    if (
      typeof objectionsCount !== "number" ||
      !Number.isInteger(objectionsCount) ||
      objectionsCount < 0
    ) {
      return bad("invalid_objections_count");
    }
  }

  // --- objectionsTags (optional): array of known tags ---
  if (objectionsTags !== undefined && objectionsTags !== null) {
    if (!Array.isArray(objectionsTags)) return bad("invalid_tag");
    for (const tag of objectionsTags) {
      if (typeof tag !== "string" || !(OBJECTION_TAGS as readonly string[]).includes(tag)) {
        return bad("invalid_tag");
      }
    }
  }

  // --- body (optional) ---
  if (pageBody !== undefined && pageBody !== null && typeof pageBody !== "string") {
    return bad("invalid_body");
  }

  // --- clientZohoId (optional) ---
  if (clientZohoId !== undefined && clientZohoId !== null) {
    if (typeof clientZohoId !== "string" || clientZohoId.trim().length === 0) {
      return bad("invalid_client_zoho_id");
    }
  }

  if (!process.env.NOTION_CALL_NOTES_DB_ID) return bad("not_configured", 503);

  try {
    // Resolve the Notion Client relation server-side from the Zoho contact id —
    // never trust a caller-supplied Notion page id. Same resolver pattern as
    // /api/clients/[zohoId]/notion.
    let clientNotionPageId: string | null = null;
    if (typeof clientZohoId === "string" && clientZohoId.trim().length > 0) {
      const zid = clientZohoId.trim();
      const all = await listNotionClients();
      const record = all.find((c) => c.zohoContactId === zid);
      if (!record) return bad("notion_not_linked", 404);
      clientNotionPageId = record.pageId;
    }

    const draft: CallNoteDraft = {
      name: name.trim(),
      callType: callType as CallType,
      date,
      clientNotionPageId,
      duration: typeof duration === "number" ? duration : null,
      outcome: typeof outcome === "string" ? (outcome as Outcome) : null,
      engagement: typeof engagement === "string" ? (engagement as EngagementLevel) : null,
      // Coaching calls don't track objections: a missing count defaults to 0
      // (so the Notion entry records 0, not an empty cell) and missing tags to
      // []. Sales/Client behaviour is unchanged (missing → null / undefined).
      objectionsCount:
        typeof objectionsCount === "number"
          ? objectionsCount
          : callType === "Coaching"
            ? 0
            : null,
      objectionsTags: Array.isArray(objectionsTags)
        ? (objectionsTags as ObjectionTag[])
        : callType === "Coaching"
          ? []
          : undefined,
      body: typeof pageBody === "string" ? pageBody : undefined,
    };

    const { id, url } = await createCallNote(draft);
    return NextResponse.json({ ok: true, id, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // Defensive: createCallNote also guards the env var.
    if (message === "call_notes_not_configured") return bad("not_configured", 503);
    // eslint-disable-next-line no-console
    console.error("call_note_create_failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
