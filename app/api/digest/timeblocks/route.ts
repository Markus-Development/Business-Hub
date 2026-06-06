import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { listActiveProjects } from "@/lib/notion";
import {
  getPrimaryBusy,
  isGoogleConnected,
  listEvents,
  type BusyInterval,
} from "@/lib/google";
import { briefing, extractText } from "@/lib/anthropic";
import { supabaseServer } from "@/lib/supabase-server";
import { getUserSettings } from "@/lib/settings";
import { localHourToIso, todayInTz } from "@/lib/tz";
import { TABLES } from "@/constants/tables";
import { MODELS } from "@/constants/models";
import { ROW_COLS, type SuggestionRow } from "./_lib";

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

const SYSTEM_PROMPT_MULTI = `You are Markus's multi-day time-block planner for Business Hub.
You will be given Active projects and, for each viable day in a forward-looking horizon, the calendar events on that day plus the FREE intervals available, all in Markus's configured timezone.

Return STRICT JSON only — no markdown, no prose, no code fences. Schema:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "work_day": true,
      "suggestions": [
        { "project_name": string, "start": "<ISO>", "end": "<ISO>", "rationale": string }
      ]
    },
    { "date": "YYYY-MM-DD", "work_day": false }
  ]
}

Determining work_day:
- Mark work_day false if the day's events suggest a non-work day — travel, family outing, leisure activities, holiday, full-day personal events.
- Mark work_day true if the day is open or has normal work-adjacent events (meetings, calls, focused-work blocks). When in doubt, mark true.
- When work_day is false, omit "suggestions" (or return an empty array).

Suggestions on work days:
- 1 to 4 blocks per day, ordered by start ascending. Prefer 2-4 when the free intervals comfortably allow it; never fabricate to hit a count.
- Each block 25-90 minutes long.
- start and end must be ISO-8601 timestamps with timezone offset, strictly inside one of the provided free intervals for THAT day.
- Pick projects from the provided list. Use the project's exact Name.
- rationale: under 20 words; explain why this project deserves this slot.
- Prefer high-priority and near-deadline projects. Do not stack two blocks for the same project on the same day unless inputs strongly justify it.
- Do not invent projects, dates, or slots.

You must include an entry in the "days" array for every date provided in the input. Your entire response must be valid JSON. Do not write any text before or after the JSON object.`;

type TrimmedProject = {
  dueDate: string | null;
  estimatedMinutes: number | null;
  name: string;
  nextAction: string;
  priority: string | null;
};

// Add `n` calendar days to a YYYY-MM-DD string. Uses UTC noon as the pivot so
// DST shifts (±1 h) can't roll the date forward or backward. Independent of TZ
// because we're operating on a label, not an instant.
function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const pivot = Date.UTC(y, m - 1, d, 12, 0, 0);
  const next = new Date(pivot + n * 86_400_000);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

// Renders an ISO instant as HH:mm in the given timezone — used to give Sonnet
// human-readable event timestamps without leaking raw UTC strings into the prompt.
function formatLocalTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
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

type ModelDay = {
  date: string;
  work_day: boolean;
  suggestions: ModelSuggestion[];
};

function parseMultiDay(raw: string): ModelDay[] {
  // Strip optional ```json fences defensively even though the prompt forbids them.
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  // Second safety net: if the model wrapped JSON in prose, extract the first `{...}`
  // block. Greedy match across newlines, grabs to the LAST `}` — correct for a
  // single top-level object literal.
  if (!cleaned.startsWith("{")) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no_json_object_found");
    cleaned = match[0];
  }
  const parsed: unknown = JSON.parse(cleaned);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { days?: unknown }).days)
  ) {
    throw new Error("missing_days_array");
  }
  const out: ModelDay[] = [];
  for (const item of (parsed as { days: unknown[] }).days) {
    if (!item || typeof item !== "object") throw new Error("invalid_day_shape");
    const d = item as Record<string, unknown>;
    if (typeof d.date !== "string") throw new Error("invalid_day_date");
    if (typeof d.work_day !== "boolean") throw new Error("invalid_day_workday");
    const suggestions: ModelSuggestion[] = [];
    if (d.work_day && Array.isArray(d.suggestions)) {
      for (const s of d.suggestions) {
        if (!s || typeof s !== "object") throw new Error("invalid_suggestion_shape");
        const obj = s as Record<string, unknown>;
        if (
          typeof obj.project_name !== "string" ||
          typeof obj.start !== "string" ||
          typeof obj.end !== "string" ||
          typeof obj.rationale !== "string"
        ) {
          throw new Error("invalid_suggestion_fields");
        }
        if (Number.isNaN(Date.parse(obj.start)) || Number.isNaN(Date.parse(obj.end))) {
          throw new Error("invalid_suggestion_dates");
        }
        if (Date.parse(obj.end) <= Date.parse(obj.start)) {
          throw new Error("end_before_start");
        }
        suggestions.push({
          project_name: obj.project_name,
          start_iso: obj.start,
          end_iso: obj.end,
          rationale: obj.rationale,
        });
      }
    }
    out.push({ date: d.date, work_day: d.work_day, suggestions });
  }
  return out;
}

export async function GET() {
  try {
    const settings = await getUserSettings();
    const today = todayInTz(settings.timezone);
    const horizonEnd = addDaysYmd(today, 6);
    const nowIso = new Date().toISOString();
    const db = supabaseServer();
    const { data, error } = await db
      .from(TABLES.TIME_BLOCK_SUGGESTIONS)
      .select(ROW_COLS)
      .eq("status", "pending")
      .gte("start_at", nowIso)
      .lte("date", horizonEnd)
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

const MIN_FREE_MINUTES_PER_DAY = 60;
const DEFAULT_HORIZON_DAYS = 5;
const MAX_HORIZON_DAYS = 7;

type DaySkipped = { date: string; reason: string };

type ViableDay = {
  date: string;
  windowStart: string;
  windowEnd: string;
  freeIntervals: BusyInterval[];
  events: { title: string; local_start: string; local_end: string }[];
};

export async function POST(req: Request) {
  try {
    const connected = await isGoogleConnected();
    if (!connected) {
      return NextResponse.json(
        { ok: false, error: "google_not_connected" },
        { status: 409 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { horizon_days?: unknown };
    const horizonRaw =
      typeof body.horizon_days === "number" && Number.isFinite(body.horizon_days)
        ? Math.floor(body.horizon_days)
        : DEFAULT_HORIZON_DAYS;
    const horizonDays = Math.min(MAX_HORIZON_DAYS, Math.max(1, horizonRaw));

    const settings = await getUserSettings();
    const calendarId = settings.master_calendar_id ?? "primary";
    const today = todayInTz(settings.timezone);
    const { startHour, endHour } = resolveWorkdayHours(
      settings.task_type_windows as TaskTypeWindow[],
    );
    const nowIso = new Date().toISOString();

    // Pass 1: compute window per day, drop past-workday days up front.
    type Candidate = { date: string; windowStart: string; windowEnd: string };
    const candidates: Candidate[] = [];
    const daysSkipped: DaySkipped[] = [];
    for (let i = 0; i < horizonDays; i++) {
      const date = addDaysYmd(today, i);
      const windowStart = localHourToIso(date, startHour, settings.timezone);
      const windowEnd = localHourToIso(date, endHour, settings.timezone);
      // Only today's window can have already started; clamp to now so we never
      // propose past blocks. Z-suffixed ISO strings compare lexicographically.
      const effectiveStart = i === 0 && nowIso > windowStart ? nowIso : windowStart;
      if (effectiveStart >= windowEnd) {
        daysSkipped.push({ date, reason: "workday_past" });
        continue;
      }
      candidates.push({ date, windowStart: effectiveStart, windowEnd });
    }

    // Pass 2: fetch freebusy + events for each candidate in parallel.
    // Solo-user workload (≤7 days × 2 calls) sits well inside Google's quotas.
    const fetched = await Promise.all(
      candidates.map(async (c) => {
        const [busy, events] = await Promise.all([
          getPrimaryBusy(c.windowStart, c.windowEnd, calendarId),
          listEvents(calendarId, c.windowStart, c.windowEnd),
        ]);
        return { candidate: c, busy, events };
      }),
    );

    // Pass 3: derive free intervals; drop days with < MIN_FREE_MINUTES_PER_DAY free.
    const viableDays: ViableDay[] = [];
    for (const { candidate, busy, events } of fetched) {
      const free = subtractBusy(candidate.windowStart, candidate.windowEnd, busy);
      const totalFreeMs = free.reduce(
        (sum, f) => sum + (Date.parse(f.end) - Date.parse(f.start)),
        0,
      );
      if (totalFreeMs < MIN_FREE_MINUTES_PER_DAY * 60_000) {
        daysSkipped.push({ date: candidate.date, reason: "insufficient_free_time" });
        continue;
      }
      const dayEvents = events
        .filter((e): e is typeof e & { start: string; end: string } =>
          typeof e.start === "string" && typeof e.end === "string",
        )
        .map((e) => ({
          title: e.summary,
          local_start: formatLocalTime(e.start, settings.timezone),
          local_end: formatLocalTime(e.end, settings.timezone),
        }));
      viableDays.push({
        date: candidate.date,
        windowStart: candidate.windowStart,
        windowEnd: candidate.windowEnd,
        freeIntervals: free,
        events: dayEvents,
      });
    }

    if (viableDays.length === 0) {
      return NextResponse.json(
        { ok: false, error: "no_viable_days", days_skipped: daysSkipped },
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

    // One prompt for all viable days — keeps Sonnet aware of cross-day prioritisation
    // (e.g. don't burn the urgent project's only slot on day 1 if day 2 is wide open).
    const promptLines: string[] = [
      `Timezone: ${settings.timezone}`,
      `Today: ${today}`,
      "",
      `Active projects (${projects.length}):`,
      JSON.stringify(projects, null, 2),
      "",
      "Days to plan:",
    ];
    for (const day of viableDays) {
      promptLines.push("");
      promptLines.push(`--- ${day.date} ---`);
      promptLines.push(`Workday window: ${day.windowStart} → ${day.windowEnd}`);
      if (day.events.length > 0) {
        promptLines.push(`Events (${day.events.length}):`);
        for (const ev of day.events) {
          promptLines.push(`  - ${ev.local_start}–${ev.local_end} ${ev.title}`);
        }
      } else {
        promptLines.push("Events: none");
      }
      promptLines.push(`Free intervals (${day.freeIntervals.length}):`);
      promptLines.push(JSON.stringify(day.freeIntervals, null, 2));
    }
    const userPrompt = promptLines.join("\n");

    const response = await briefing(userPrompt, SYSTEM_PROMPT_MULTI);
    const raw = extractText(response);
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "empty_model_response" },
        { status: 502 },
      );
    }

    let days: ModelDay[];
    try {
      days = parseMultiDay(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : "parse_failed";
      return NextResponse.json(
        { ok: false, error: `model_json_parse_failed:${message}`, raw },
        { status: 502 },
      );
    }

    const db = supabaseServer();
    const insertedRows: SuggestionRow[] = [];
    const viableDates = new Set(viableDays.map((v) => v.date));

    for (const day of days) {
      if (!viableDates.has(day.date)) continue; // ignore hallucinated dates
      if (!day.work_day) {
        daysSkipped.push({ date: day.date, reason: "non_work_day" });
        continue;
      }
      if (day.suggestions.length === 0) continue;

      // Truncate to 4 per day in start order; the prompt allows 1-4 but defends against drift.
      const sorted = day.suggestions
        .slice()
        .sort((a, b) => Date.parse(a.start_iso) - Date.parse(b.start_iso));
      const truncated = sorted.length > 4 ? sorted.slice(0, 4) : sorted;
      if (sorted.length > 4) {
        // eslint-disable-next-line no-console
        console.warn(
          `[timeblocks] date=${day.date} model returned ${sorted.length} suggestions; truncating to 4`,
        );
      }

      const batchId = randomUUID();
      const rows = truncated.map((s) => ({
        date: day.date,
        project_name: s.project_name,
        start_at: new Date(s.start_iso).toISOString(),
        end_at: new Date(s.end_iso).toISOString(),
        rationale: s.rationale,
        status: "pending",
        batch_id: batchId,
      }));

      const { data, error } = await db
        .from(TABLES.TIME_BLOCK_SUGGESTIONS)
        .insert(rows)
        .select(ROW_COLS);
      if (error) throw new Error(`Failed to persist suggestions: ${error.message}`);

      // eslint-disable-next-line no-console
      console.log(
        `[timeblocks] date=${day.date} tz=${settings.timezone} blocks=${rows.length}`,
      );
      insertedRows.push(...((data ?? []) as SuggestionRow[]));
    }

    return NextResponse.json({
      suggestions: insertedRows,
      timezone: settings.timezone,
      days_processed: viableDays.length,
      days_skipped: daysSkipped,
      model: MODELS.BRIEFING,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
