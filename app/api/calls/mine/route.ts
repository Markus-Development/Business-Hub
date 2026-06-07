import { NextResponse } from "next/server";
import { roadmapDraft, extractText } from "@/lib/anthropic";
import { CallNoteError, persistCallNote, type PersistCallNoteInput } from "@/lib/calls";
import {
  CALL_MINER_SYSTEM_PROMPT,
  buildCallMinerUserContent,
  type CallMinerResult,
} from "@/lib/call-miner-prompt";
import { todayInTz } from "@/lib/tz";
import { getUserSettings } from "@/lib/settings";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Body = {
  loomUrl?: unknown;
  transcript?: unknown;
  callTypeHint?: unknown;
  clientZohoId?: unknown;
  date?: unknown;
};

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// Defensive JSON parse: direct JSON.parse first, then fall back to slicing the
// first {...} block if the model wrapped the JSON in prose / a ```json fence.
function parseMinerJson(text: string): Partial<CallMinerResult> | null {
  const tryParse = (s: string): Partial<CallMinerResult> | null => {
    try {
      const obj = JSON.parse(s);
      return obj && typeof obj === "object" ? (obj as Partial<CallMinerResult>) : null;
    } catch {
      return null;
    }
  };
  const fenced = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const direct = tryParse(fenced);
  if (direct) return direct;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start >= 0 && end > start) return tryParse(fenced.slice(start, end + 1));
  return null;
}

// POST /api/calls/mine — analyses a pasted call transcript with Anthropic, then
// writes the resulting Call Notes entry. Loom links are NOT scraped server-side
// (JS-rendered, no stable API): the transcript is pasted into the form. A loom
// URL, when supplied, is prepended to the page body as a reference line.
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const { loomUrl, transcript, callTypeHint, clientZohoId, date } = body;

  if (typeof transcript !== "string" || transcript.trim().length === 0) {
    return bad("missing_transcript");
  }

  // Today's date (in the user's timezone) is the model's default; the form can
  // override it via `date`.
  const settings = await getUserSettings();
  const today = todayInTz(settings.timezone);
  const overrideDate =
    typeof date === "string" && DATE_RE.test(date) ? date : null;
  const hint = typeof callTypeHint === "string" && callTypeHint.length > 0 ? callTypeHint : null;

  // --- Anthropic analysis (soft-fail on provider error) ---
  let raw: string;
  try {
    const userContent = buildCallMinerUserContent({
      transcript: transcript.trim(),
      date: overrideDate ?? today,
      callTypeHint: hint,
    });
    const response = await roadmapDraft(CALL_MINER_SYSTEM_PROMPT, userContent);
    raw = extractText(response);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("call_mine_generation_failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 200 });
  }

  const parsed = parseMinerJson(raw);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "parse_failed", raw }, { status: 502 });
  }

  // Build the page body: prepend a Loom reference line when a URL was supplied.
  const modelBody = typeof parsed.body === "string" ? parsed.body : "";
  const loom =
    typeof loomUrl === "string" && loomUrl.trim().length > 0 ? loomUrl.trim() : null;
  const pageBody = loom ? `Loom: ${loom}\n\n${modelBody}` : modelBody;

  // Hints (callTypeHint / clientZohoId / date) override the model where set.
  const input: PersistCallNoteInput = {
    name: parsed.suggestedTitle,
    callType: hint ?? parsed.callType,
    date: overrideDate ?? parsed.date,
    duration: typeof parsed.durationMinutes === "number" ? parsed.durationMinutes : null,
    outcome: parsed.outcome ?? null,
    engagement: parsed.engagement,
    objectionsCount:
      typeof parsed.objectionsCount === "number" ? parsed.objectionsCount : undefined,
    objectionsTags: Array.isArray(parsed.objectionsTags) ? parsed.objectionsTags : undefined,
    body: pageBody,
    clientZohoId:
      typeof clientZohoId === "string" && clientZohoId.trim().length > 0
        ? clientZohoId.trim()
        : undefined,
  };

  try {
    const { id, url } = await persistCallNote(input);
    return NextResponse.json({
      ok: true,
      id,
      url,
      callType: input.callType,
      outcome: input.outcome,
    });
  } catch (err) {
    if (err instanceof CallNoteError) return bad(err.message, err.status);
    const message = err instanceof Error ? err.message : "unknown_error";
    if (message === "call_notes_not_configured") return bad("not_configured", 503);
    // eslint-disable-next-line no-console
    console.error("call_mine_persist_failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
