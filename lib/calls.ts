import "server-only";
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// A validation / resolution error carrying the exact wire code and HTTP status
// that the route should surface. Callers map `code` → `{ ok: false, error: code }`
// and `status` → the response status. The codes are identical to the ones the
// original /api/calls/create route returned inline.
export class CallNoteError extends Error {
  status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.name = "CallNoteError";
    this.status = status;
  }
}

// Loose input shape — every field is validated below before use. This mirrors the
// body the /api/calls/create route used to parse inline; /api/calls/mine feeds
// the same shape from the analysed transcript.
export type PersistCallNoteInput = {
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

// Validates the input, resolves the Notion Client relation server-side from a
// Zoho contact id (never trusting a caller-supplied Notion page id), and writes
// the Call Notes page. Throws `CallNoteError` for every coded validation /
// resolution failure; lets `createCallNote` errors bubble unchanged so the
// caller can map `call_notes_not_configured` itself (preserving the original
// route's catch behaviour).
export async function persistCallNote(
  input: PersistCallNoteInput,
): Promise<{ id: string; url: string }> {
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
  } = input;

  // --- required fields ---
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new CallNoteError("missing_name");
  }
  if (typeof callType !== "string" || !(CALL_TYPES as readonly string[]).includes(callType)) {
    throw new CallNoteError("invalid_call_type");
  }
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    throw new CallNoteError("invalid_date");
  }

  // --- duration (optional): number >= 0 ---
  if (duration !== undefined && duration !== null) {
    if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0) {
      throw new CallNoteError("invalid_duration");
    }
  }

  // --- outcome (optional): in ALL_OUTCOMES, and the family must match the call
  //     type. Each call type has its own allowed set; "At Risk" is shared by the
  //     Client and Coaching sets, so it is valid for either of those call types.
  //     "Other" has no outcome family — any in-family outcome mismatches. ---
  if (outcome !== undefined && outcome !== null) {
    if (typeof outcome !== "string" || !(ALL_OUTCOMES as readonly string[]).includes(outcome)) {
      throw new CallNoteError("invalid_outcome");
    }
    const ALLOWED_OUTCOMES: Record<string, readonly string[]> = {
      Sales: OUTCOMES_SALES,
      Client: OUTCOMES_CLIENT,
      Coaching: OUTCOMES_COACHING,
      Other: [],
    };
    if (!(ALLOWED_OUTCOMES[callType] ?? []).includes(outcome)) {
      throw new CallNoteError("outcome_type_mismatch");
    }
  }

  // --- engagement (optional) ---
  if (engagement !== undefined && engagement !== null) {
    if (
      typeof engagement !== "string" ||
      !(ENGAGEMENT_LEVELS as readonly string[]).includes(engagement)
    ) {
      throw new CallNoteError("invalid_engagement");
    }
  }

  // --- objectionsCount (optional): integer >= 0 ---
  if (objectionsCount !== undefined && objectionsCount !== null) {
    if (
      typeof objectionsCount !== "number" ||
      !Number.isInteger(objectionsCount) ||
      objectionsCount < 0
    ) {
      throw new CallNoteError("invalid_objections_count");
    }
  }

  // --- objectionsTags (optional): array of known tags ---
  if (objectionsTags !== undefined && objectionsTags !== null) {
    if (!Array.isArray(objectionsTags)) throw new CallNoteError("invalid_tag");
    for (const tag of objectionsTags) {
      if (typeof tag !== "string" || !(OBJECTION_TAGS as readonly string[]).includes(tag)) {
        throw new CallNoteError("invalid_tag");
      }
    }
  }

  // --- body (optional) ---
  if (pageBody !== undefined && pageBody !== null && typeof pageBody !== "string") {
    throw new CallNoteError("invalid_body");
  }

  // --- clientZohoId (optional) ---
  if (clientZohoId !== undefined && clientZohoId !== null) {
    if (typeof clientZohoId !== "string" || clientZohoId.trim().length === 0) {
      throw new CallNoteError("invalid_client_zoho_id");
    }
  }

  if (!process.env.NOTION_CALL_NOTES_DB_ID) {
    throw new CallNoteError("not_configured", 503);
  }

  // Resolve the Notion Client relation server-side from the Zoho contact id —
  // never trust a caller-supplied Notion page id. Same resolver pattern as
  // /api/clients/[zohoId]/notion.
  let clientNotionPageId: string | null = null;
  if (typeof clientZohoId === "string" && clientZohoId.trim().length > 0) {
    const zid = clientZohoId.trim();
    const all = await listNotionClients();
    const record = all.find((c) => c.zohoContactId === zid);
    if (!record) throw new CallNoteError("notion_not_linked", 404);
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
    // Coaching calls don't track objections: a missing count defaults to 0 (so
    // the Notion entry records 0, not an empty cell) and missing tags to []. The
    // Sales/Client behaviour is unchanged (missing → null / undefined).
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

  return createCallNote(draft);
}
