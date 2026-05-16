import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { listActiveProjects } from "@/lib/notion";
import { getAuthorizedCalendarClient, isGoogleConnected } from "@/lib/google";
import { briefing } from "@/lib/anthropic";
import { supabaseServer } from "@/lib/supabase-server";
import { getUserSettings } from "@/lib/settings";
import { TABLES } from "@/constants/tables";
import { MODELS } from "@/constants/models";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are Markus's daily focus coach for Business Hub. Markus is a solo founder.
Return a concise daily briefing in plain markdown with EXACTLY these three H2 sections, in this order:

## Focus today
## Overdue / urgent
## Defer

Rules:
- Total length under 400 words. Be terse.
- Use short bullet lists. Reference projects by Name. Mention Due Date only when relevant.
- "Focus today": 2-4 projects that deserve attention now, with a one-line why.
- "Overdue / urgent": projects whose Due Date is past or imminent. Empty bullet "- None" if nothing qualifies.
- "Defer": projects that can wait this week. Empty bullet "- None" if nothing qualifies.
- Do not invent projects. Only reference what the input contains.
- Plain markdown only. No tables, no images, no HTML.`;

type TrimmedProject = {
  area: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  name: string;
  nextAction: string;
  priority: string | null;
  status: string | null;
};

type TrimmedEvent = {
  end: string | null;
  start: string | null;
  title: string;
};

type Inputs = {
  date: string;
  timezone: string;
  googleConnected: boolean;
  projects: TrimmedProject[];
  events: TrimmedEvent[] | null;
};

function todayInTz(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

function endOfTodayIso(timezone: string): string {
  // 23:59:59.999 local time of today in `timezone`, returned as UTC ISO.
  const date = todayInTz(timezone);
  const utcMidnightEnd = new Date(`${date}T23:59:59.999Z`);
  const offsetMs = tzOffsetMs(utcMidnightEnd, timezone);
  return new Date(utcMidnightEnd.getTime() - offsetMs).toISOString();
}

function tzOffsetMs(at: Date, timezone: string): number {
  // Returns the given timezone's local offset from UTC in ms at the given instant.
  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(localParts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - at.getTime();
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
  return `{${parts.join(",")}}`;
}

function hashInputs(inputs: Inputs): string {
  return createHash("sha256").update(canonicalStringify(inputs)).digest("hex");
}

async function gatherInputs(timezone: string, calendarId: string): Promise<Inputs> {
  const date = todayInTz(timezone);
  const projects = await listActiveProjects();
  const trimmedProjects: TrimmedProject[] = projects.map((p) => ({
    area: p.area,
    dueDate: p.dueDate,
    estimatedMinutes: p.estimatedMinutes,
    name: p.name,
    nextAction: p.nextAction,
    priority: p.priority,
    status: p.status,
  }));

  const connected = await isGoogleConnected();
  let events: TrimmedEvent[] | null = null;
  if (connected) {
    try {
      const calendar = await getAuthorizedCalendarClient();
      // Today window in the configured timezone.
      const startLocal = new Date(`${date}T00:00:00.000Z`);
      const startOffset = tzOffsetMs(startLocal, timezone);
      const timeMin = new Date(startLocal.getTime() - startOffset).toISOString();
      const endLocal = new Date(`${date}T23:59:59.999Z`);
      const endOffset = tzOffsetMs(endLocal, timezone);
      const timeMax = new Date(endLocal.getTime() - endOffset).toISOString();
      const resp = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
      });
      events = (resp.data.items ?? []).map((e) => ({
        end: e.end?.dateTime ?? e.end?.date ?? null,
        start: e.start?.dateTime ?? e.start?.date ?? null,
        title: e.summary ?? "(no title)",
      }));
    } catch {
      // Google connected but call failed — proceed as if disconnected for input purposes.
      events = null;
    }
  }

  return {
    date,
    timezone,
    googleConnected: connected && events !== null,
    projects: trimmedProjects,
    events,
  };
}

function buildUserPrompt(inputs: Inputs): string {
  const eventLine = inputs.googleConnected
    ? `Today's calendar events (${inputs.events?.length ?? 0}):`
    : "Google Calendar is not connected — no calendar context available. Plan from projects only.";
  return [
    `Date: ${inputs.date} (${inputs.timezone})`,
    "",
    `Active projects (${inputs.projects.length}):`,
    JSON.stringify(inputs.projects, null, 2),
    "",
    eventLine,
    inputs.googleConnected ? JSON.stringify(inputs.events, null, 2) : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

type CachedRow = {
  created_at: string;
  input_hash: string;
  summary: string;
};

// Briefings are append-only; the "current" briefing for a (date, kind) is the most
// recent row. Returns null when no row exists yet for today.
async function readLatest(date: string): Promise<CachedRow | null> {
  const db = supabaseServer();
  const { data, error } = await db
    .from(TABLES.BRIEFINGS)
    .select("created_at, input_hash, summary")
    .eq("date", date)
    .eq("kind", "daily")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to read latest briefing: ${error.message}`);
  }
  return (data as CachedRow | null) ?? null;
}

async function insertBriefing(row: {
  date: string;
  summary: string;
  input_hash: string;
  expires_at: string;
}): Promise<string> {
  const db = supabaseServer();
  const { data, error } = await db
    .from(TABLES.BRIEFINGS)
    .insert({
      date: row.date,
      kind: "daily",
      summary: row.summary,
      model: MODELS.BRIEFING,
      input_hash: row.input_hash,
      expires_at: row.expires_at,
      created_at: new Date().toISOString(),
    })
    .select("created_at")
    .single();
  if (error) throw new Error(`Failed to persist briefing: ${error.message}`);
  return (data as { created_at: string }).created_at;
}

function extractText(response: Awaited<ReturnType<typeof briefing>>): string {
  return response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n")
    .trim();
}

export async function GET() {
  try {
    const settings = await getUserSettings();
    const date = todayInTz(settings.timezone);
    const latest = await readLatest(date);
    if (!latest) return new NextResponse(null, { status: 204 });
    return NextResponse.json({
      summary: latest.summary,
      cached: true,
      generatedAt: latest.created_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";

  try {
    const settings = await getUserSettings();
    const calendarId = settings.master_calendar_id ?? "primary";
    const inputs = await gatherInputs(settings.timezone, calendarId);
    const inputHash = hashInputs(inputs);

    const latest = await readLatest(inputs.date);
    if (!force && latest && latest.input_hash === inputHash) {
      return NextResponse.json({
        summary: latest.summary,
        cached: true,
        generatedAt: latest.created_at,
      });
    }

    const response = await briefing(buildUserPrompt(inputs), SYSTEM_PROMPT);
    const summary = extractText(response);
    if (!summary) {
      return NextResponse.json(
        { ok: false, error: "empty_model_response" },
        { status: 502 },
      );
    }

    const createdAt = await insertBriefing({
      date: inputs.date,
      summary,
      input_hash: inputHash,
      expires_at: endOfTodayIso(settings.timezone),
    });

    return NextResponse.json({
      summary,
      cached: false,
      generatedAt: createdAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
