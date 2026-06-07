import {
  CALL_TYPES,
  ENGAGEMENT_LEVELS,
  OBJECTION_TAGS,
  OUTCOMES_CLIENT,
  OUTCOMES_COACHING,
  OUTCOMES_SALES,
} from "@/constants/call-notes";

// Call Miner analysis prompt. Turns a pasted call transcript into the STRICT
// JSON shape consumed by lib/calls.persistCallNote. Mirrors the rules of the
// external "Call Miner — Geldstruktur" Cowork skill, but Phase 1 only:
// detection + deliverable body + Call-Notes write. No 06-Brand writes.

// The strict-JSON schema the model must return.
export type CallMinerResult = {
  callType: string;
  date: string;
  durationMinutes: number;
  outcome: string | null;
  engagement: string;
  objectionsCount: number;
  objectionsTags: string[];
  suggestedTitle: string;
  body: string;
};

const SETS = {
  callTypes: CALL_TYPES.join(", "),
  sales: OUTCOMES_SALES.join(", "),
  client: OUTCOMES_CLIENT.join(", "),
  coaching: OUTCOMES_COACHING.join(", "),
  engagement: ENGAGEMENT_LEVELS.join(", "),
  tags: OBJECTION_TAGS.join(", "),
};

export const CALL_MINER_SYSTEM_PROMPT = [
  "You are the Call Miner for Markus's business (brand: EasyFinance). You receive",
  "a raw call transcript and turn it into one structured Call Notes entry.",
  "",
  "Return STRICT JSON ONLY. No prose, no markdown code fences, no commentary",
  "outside the JSON object. The object MUST have exactly these keys:",
  "{",
  '  "callType": one of [' + SETS.callTypes + "],",
  '  "date": "YYYY-MM-DD",',
  '  "durationMinutes": a number (estimate from the transcript; 0 if unknown),',
  '  "outcome": a string from the set that matches callType (see below), or null,',
  '  "engagement": one of [' + SETS.engagement + "],",
  '  "objectionsCount": a non-negative integer,',
  '  "objectionsTags": an array of strings, each one of [' + SETS.tags + "],",
  '  "suggestedTitle": "<CallType> — <Client or Prospect name> — <YYYY-MM-DD>",',
  '  "body": "<the full deliverable as a single Markdown string>"',
  "}",
  "",
  "OUTCOME SETS (the outcome MUST belong to the set matching the detected callType):",
  "- Sales: [" + SETS.sales + "]",
  "- Client: [" + SETS.client + "]",
  "- Coaching: [" + SETS.coaching + "]",
  '- Other: no outcome family — use null for "outcome".',
  "",
  "DETECTION:",
  "- callType: Sales = a prospect / new lead; Client = an existing paying client;",
  "  Coaching = a coaching or mentoring session; Other = anything else.",
  "- If a callType hint is provided in the user message, trust it.",
  "- objectionsCount / objectionsTags: ONLY for Sales and Client calls. For",
  "  Coaching calls ALWAYS set objectionsCount to 0 and objectionsTags to [].",
  "- Only use objection tags from the allowed set; never invent new tags.",
  "",
  "BODY — Sales and Client calls: write exactly 6 Markdown sections, each a level-2",
  "heading (## ), in this order:",
  "  1. Anrufzusammenfassung / Call summary",
  "  2. Schmerzpunkte und Verbatims / Pain points and verbatim quotes",
  "  3. Einwände und Antworten / Objections and responses",
  "  4. Social-Content-Ideen / Social content ideas",
  "  5. Case-Study-Material / Case study material",
  "  6. Recap und Action Items / Recap and action items",
  "",
  "BODY — Coaching calls: write exactly 3 Markdown sections, each a level-2",
  "heading (## ), in this order:",
  "  1. Anrufzusammenfassung / Call summary",
  "  2. Recap",
  "  3. Action Items",
  "  Do NOT include Social, Objection, or Case-Study sections for Coaching calls.",
  "",
  "STYLE RULES:",
  "- Write in the language of the transcript. Default to German if ambiguous.",
  "- Do NOT use em-dashes anywhere in the body prose. Use commas or periods.",
  "- Never put a person's name in the Social-Content-Ideen / Social content ideas",
  "  section — social ideas must be anonymised and generalised.",
  "- Verbatim quotes must stay verbatim; do not paraphrase customer wording.",
  "- Keep the JSON valid: escape newlines inside the body string as \\n.",
].join("\n");

export type BuildCallMinerInput = {
  transcript: string;
  date?: string; // YYYY-MM-DD; defaults to today (caller-provided)
  callTypeHint?: string | null;
  clientName?: string | null;
};

// Builds the user-message content for the analysis call: transcript + today's
// date (the default the model should use unless the transcript states another)
// + optional hints (detected callType, known client name).
export function buildCallMinerUserContent(input: BuildCallMinerInput): string {
  const { transcript, date, callTypeHint, clientName } = input;
  const lines: string[] = [];
  if (date) lines.push(`TODAY'S DATE (use as "date" unless the transcript states another): ${date}`);
  if (callTypeHint) lines.push(`CALL TYPE HINT (trust this over your own detection): ${callTypeHint}`);
  if (clientName) lines.push(`KNOWN CLIENT / PROSPECT NAME (use in the title): ${clientName}`);
  if (lines.length > 0) lines.push("");
  lines.push("TRANSCRIPT:");
  lines.push("");
  lines.push(transcript);
  return lines.join("\n");
}
