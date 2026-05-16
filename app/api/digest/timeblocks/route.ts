import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { listActiveProjects } from "@/lib/notion";
import { getPrimaryBusy, isGoogleConnected, type BusyInterval } from "@/lib/google";
import { briefing } from "@/lib/anthropic";
import { supabaseServer } from "@/lib/supabase-server";
import { getUserSettings } from "@/lib/settings";
import { TABLES } from "@/constants/tables";
import { MODELS } from "@/constants/models";

export const runtime = "nodejs";

const DEFAULT_WORK_DAY_START_HOUR = 9;
const DEFAULT_WORK_DAY_END_HOUR = 18;

type TaskTypeWindow = { task_type: string; start_hour: number; end_hour: number };

// Returns the overall window to scan for free slots. If the user has configured
// task_type_windows, take the union of all entries (min start_hour, max end_hour).
// This is a first-pass wire-through — per-task-type routing is a future task.
// Falls back to 09–18 when no windows are configured.
function resolveWorkdayHours(
  windows: TaskTypeWindow[],
): { startHour: number; endHour: number } {
  if (!Array.isArray(windows) || windows.length === 0) {
    return {
      startHour: DEFAULT_WORK_DAY_START_HOUR,
      endHour: DEFAULT_WORK_DAY_END_HOUR,
    };
  }
  let startHour = 23;
  let endHour = 0;
  for (const w of windows) {
    if (typeof w.start_hour === "number" && w.start_hour < startHour) startHour = w.start_hour;
    if (typeof w.end_hour === "number" && w.end_hour > endHour) endHour = w.end_hour;
  }
  if (startHour >= endHour) {
    return {
      startHour: DEFAULT_WORK_DAY_START_HOUR,
      endHour: DEFAULT_WORK_DAY_END_HOUR,
    };
  }
  return { startHour, endHour };
}

const SYSTEM_PROMPT = `You are Markus's time-block planner for Business Hub.
You will be given Active projects and a list of FREE intervals on today's calendar in Markus's configured timezone.
You may also be given a daily briefing for context.

Return STRICT JSON only — no markdown, no prose, no code fences. Schema:
{ "suggestions": [ { "project_name": string, "start_iso": string, "end_iso": string, "rationale": string } ] }

Rules:
- 2 to 4 suggestions, ordered by start_iso ascending.
- Each block 25-90 minutes long.
- start_iso and end_iso must be ISO-8601 timestamps with timezone offset, strictly inside one of the provided free intervals.
- Pick projects from the provided list. Use the project's exact Name.
- rationale: under 20 words; explain why this project deserves this slot today.
- Prefer high-priority and near-deadline projects. Do not stack two blocks for the same project unless inputs strongly justify it.
- Do not invent projects or slots.`;

type TrimmedProject = {
  dueDate: string | null;
  estimatedMinutes: number | null;
  name: string;
  nextAction: string;
  priority: string | null;
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

function tzOffsetMs(at: Date, timezone: string): number {
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

function localHourToIso(date: string, hour: number, timezone: string): string {
  // hour is 0-23 in the given timezone. Returns UTC ISO string for that instant.
  const naive = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`);
  const offset = tzOffsetMs(naive, timezone);
  return new Date(naive.getTime() - offset).toISOString();
}

function subtractBusy(
  windowStart: string,
  windowEnd: string,
  busy: BusyInterval[],
): BusyInterval[] {
  const winStart = Date.parse(windowStart);
  const winEnd = Date.parse(windowEnd);
  const sorted = busy
    .map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
    .filter((b) => b.end > winStart && b.start < winEnd)
    .sort((a, b) => a.start - b.start);

  const free: BusyInterval[] = [];
  let cursor = winStart;
  for (const b of sorted) {
    const s = Math.max(b.start, winStart);
    const e = Math.min(b.end, winEnd);
    if (s > cursor) {
      free.push({ start: new Date(cursor).toISOString(), end: new Date(s).toISOString() });
    }
    cursor = Math.max(cursor, e);
  }
  if (cursor < winEnd) {
    free.push({ start: new Date(cursor).toISOString(), end: new Date(winEnd).toISOString() });
  }
  return free;
}

type ModelSuggestion = {
  project_name: string;
  start_iso: string;
  end_iso: string;
  rationale: string;
};

function parseSuggestions(raw: string): ModelSuggestion[] {
  // Strip optional ```json fences defensively even though the prompt forbids them.
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  const parsed: unknown = JSON.parse(cleaned);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { suggestions?: unknown }).suggestions)
  ) {
    throw new Error("missing_suggestions_array");
  }
  const out: ModelSuggestion[] = [];
  for (const item of (parsed as { suggestions: unknown[] }).suggestions) {
    if (!item || typeof item !== "object") throw new Error("invalid_suggestion_shape");
    const s = item as Record<string, unknown>;
    if (
      typeof s.project_name !== "string" ||
      typeof s.start_iso !== "string" ||
      typeof s.end_iso !== "string" ||
      typeof s.rationale !== "string"
    ) {
      throw new Error("invalid_suggestion_fields");
    }
    if (Number.isNaN(Date.parse(s.start_iso)) || Number.isNaN(Date.parse(s.end_iso))) {
      throw new Error("invalid_suggestion_dates");
    }
    if (Date.parse(s.end_iso) <= Date.parse(s.start_iso)) {
      throw new Error("end_before_start");
    }
    out.push({
      project_name: s.project_name,
      start_iso: s.start_iso,
      end_iso: s.end_iso,
      rationale: s.rationale,
    });
  }
  if (out.length < 2 || out.length > 4) throw new Error("out_of_range_suggestion_count");
  return out.sort((a, b) => Date.parse(a.start_iso) - Date.parse(b.start_iso));
}

function extractText(response: Awaited<ReturnType<typeof briefing>>): string {
  return response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n")
    .trim();
}

async function readLatestBriefingSummary(date: string): Promise<string | null> {
  const db = supabaseServer();
  const { data, error } = await db
    .from(TABLES.BRIEFINGS)
    .select("summary")
    .eq("date", date)
    .eq("kind", "daily")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to read briefing: ${error.message}`);
  return (data as { summary: string } | null)?.summary ?? null;
}

type SuggestionRow = {
  id: string;
  created_at: string;
  date: string;
  project_name: string;
  start_at: string;
  end_at: string;
  rationale: string;
  status: string;
  google_event_id: string | null;
  batch_id: string;
};

const ROW_COLS =
  "id, created_at, date, project_name, start_at, end_at, rationale, status, google_event_id, batch_id";

export async function GET() {
  try {
    const settings = await getUserSettings();
    const date = todayInTz(settings.timezone);
    const db = supabaseServer();
    const { data, error } = await db
      .from(TABLES.TIME_BLOCK_SUGGESTIONS)
      .select(ROW_COLS)
      .eq("date", date)
      .eq("status", "pending")
      .order("start_at", { ascending: true });
    if (error) throw new Error(`Failed to read suggestions: ${error.message}`);
    // Echo the configured timezone so the client can format start/end times
    // in the user's actual timezone rather than a hardcoded one.
    return NextResponse.json({
      suggestions: (data ?? []) as SuggestionRow[],
      timezone: settings.timezone,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const connected = await isGoogleConnected();
    if (!connected) {
      return NextResponse.json(
        { ok: false, error: "google_not_connected" },
        { status: 409 },
      );
    }

    const settings = await getUserSettings();
    const calendarId = settings.master_calendar_id ?? "primary";
    const date = todayInTz(settings.timezone);
    const { startHour, endHour } = resolveWorkdayHours(
      settings.task_type_windows as TaskTypeWindow[],
    );
    const windowStart = localHourToIso(date, startHour, settings.timezone);
    const windowEnd = localHourToIso(date, endHour, settings.timezone);

    // Debug aid: confirm the workday window resolves to the right UTC instants
    // for the configured timezone. Surfaces silent timezone drift in the server log.
    // eslint-disable-next-line no-console
    console.log(
      `[timeblocks] tz=${settings.timezone} date=${date} window=${startHour}:00-${endHour}:00 → ${windowStart} → ${windowEnd}`,
    );

    const busy = await getPrimaryBusy(windowStart, windowEnd, calendarId);
    const free = subtractBusy(windowStart, windowEnd, busy);
    if (free.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no_free_slots" },
        { status: 409 },
      );
    }

    const projectsAll = await listActiveProjects();
    const projects: TrimmedProject[] = projectsAll.map((p) => ({
      dueDate: p.dueDate,
      estimatedMinutes: p.estimatedMinutes,
      name: p.name,
      nextAction: p.nextAction,
      priority: p.priority,
    }));

    const briefingSummary = await readLatestBriefingSummary(date);

    const userPrompt = [
      `Date: ${date} (${settings.timezone})`,
      `Workday window: ${windowStart} → ${windowEnd}`,
      "",
      `Free intervals (${free.length}):`,
      JSON.stringify(free, null, 2),
      "",
      `Active projects (${projects.length}):`,
      JSON.stringify(projects, null, 2),
      briefingSummary
        ? `\nToday's briefing for context:\n${briefingSummary}`
        : "\n(No daily briefing for today.)",
    ].join("\n");

    const response = await briefing(userPrompt, SYSTEM_PROMPT);
    const raw = extractText(response);
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "empty_model_response" },
        { status: 502 },
      );
    }

    let suggestions: ModelSuggestion[];
    try {
      suggestions = parseSuggestions(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : "parse_failed";
      return NextResponse.json(
        { ok: false, error: `model_json_parse_failed:${message}`, raw },
        { status: 502 },
      );
    }

    const batchId = randomUUID();
    const rows = suggestions.map((s) => ({
      date,
      project_name: s.project_name,
      start_at: new Date(s.start_iso).toISOString(),
      end_at: new Date(s.end_iso).toISOString(),
      rationale: s.rationale,
      status: "pending",
      batch_id: batchId,
    }));

    const db = supabaseServer();
    const { data, error } = await db
      .from(TABLES.TIME_BLOCK_SUGGESTIONS)
      .insert(rows)
      .select(ROW_COLS);
    if (error) throw new Error(`Failed to persist suggestions: ${error.message}`);

    return NextResponse.json({
      suggestions: (data ?? []) as SuggestionRow[],
      timezone: settings.timezone,
      batch_id: batchId,
      model: MODELS.BRIEFING,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
