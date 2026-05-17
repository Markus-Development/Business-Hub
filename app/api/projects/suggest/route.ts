import "server-only";
import { NextResponse } from "next/server";
import { briefing, extractText } from "@/lib/anthropic";
import { isGoogleConnected, listEvents, type CalendarEvent } from "@/lib/google";
import { listAreas, type NotionArea } from "@/lib/notion";
import { getUserSettings } from "@/lib/settings";
import { localHourToIso, todayInTz } from "@/lib/tz";

export const runtime = "nodejs";

type IncomingProject = {
  name?: unknown;
  area?: unknown;
  priority?: unknown;
  dueDate?: unknown;
  nextAction?: unknown;
  estimatedMinutes?: unknown;
};

type Body = {
  project?: IncomingProject;
  context?: unknown;
};

const SYSTEM_PROMPT = `You are a sharp productivity assistant for a solo business owner. Given a project and context, return ONLY a valid JSON object in this exact shape:
{"steps":["...","...","..."]}
— 3 to 5 steps, each a single concrete action sentence of <= 15 words.
— Steps must be specific to the context (mention app names, dates, people when available).
— No preamble, no explanation, no markdown outside the JSON.`;

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const p = body.project ?? {};
  const ctx = body.context;

  if (typeof p.name !== "string" || p.name.trim().length === 0) return bad("missing_project_name");
  if (typeof ctx !== "string") return bad("invalid_context");

  const project = {
    name: p.name.trim(),
    area: typeof p.area === "string" && p.area.length > 0 ? p.area : null,
    priority: typeof p.priority === "string" && p.priority.length > 0 ? p.priority : null,
    dueDate: typeof p.dueDate === "string" && p.dueDate.length > 0 ? p.dueDate : null,
    nextAction:
      typeof p.nextAction === "string" && p.nextAction.length > 0 ? p.nextAction : null,
    estimatedMinutes: typeof p.estimatedMinutes === "number" ? p.estimatedMinutes : null,
  };

  // Gather supporting context in parallel. Each lookup is best-effort and any
  // failure is swallowed — the suggestion call must still happen even when
  // Google is offline or the Areas DB is unconfigured.
  const [areaResult, calendarResult] = await Promise.allSettled([
    loadAreaContext(project.area),
    loadCalendarContext(),
  ]);

  const areaCtx = areaResult.status === "fulfilled" ? areaResult.value : null;
  const calendarCtx = calendarResult.status === "fulfilled" ? calendarResult.value : null;

  const userMessage = buildUserMessage(project, ctx, areaCtx, calendarCtx);

  let extracted: string;
  try {
    const response = await briefing(userMessage, SYSTEM_PROMPT);
    extracted = extractText(response);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("projects_suggest_generation_failed", err);
    return NextResponse.json({ ok: false, error: "generation_failed" });
  }

  // Parse the model output as JSON. Defensive: try to find a JSON object inside
  // the response if the model wrapped it in prose despite the system prompt.
  const parsed = parseStepsJson(extracted);
  if (!parsed) {
    // eslint-disable-next-line no-console
    console.warn("projects_suggest_parse_failed", { raw: extracted.slice(0, 500) });
    return NextResponse.json(
      { ok: false, error: "parse_failed", raw: extracted },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, steps: parsed });
}

type AreaContext = {
  name: string;
  currentMilestone: string;
  nextSteps: string;
  goal: string;
};

async function loadAreaContext(areaName: string | null): Promise<AreaContext | null> {
  if (!areaName) return null;
  if (!process.env.NOTION_AREAS_DB_ID) return null;
  const areas: NotionArea[] = await listAreas();
  const match = areas.find((a) => a.name === areaName);
  if (!match) return null;
  return {
    name: match.name,
    currentMilestone: match.currentMilestone,
    nextSteps: match.nextSteps,
    goal: match.goal,
  };
}

type CalendarContext = {
  events: { summary: string; start: string | null; end: string | null }[];
  windowDays: 7;
};

async function loadCalendarContext(): Promise<CalendarContext | null> {
  const connected = await isGoogleConnected();
  if (!connected) return null;
  const settings = await getUserSettings();
  const tz = settings.timezone;
  const calId = settings.master_calendar_id ?? "primary";

  const todayLocal = todayInTz(tz);
  const start = localHourToIso(todayLocal, 0, tz);

  const end7 = new Date(start);
  end7.setUTCDate(end7.getUTCDate() + 7);
  const end = end7.toISOString();

  const events: CalendarEvent[] = await listEvents(calId, start, end);
  return {
    events: events.map((e) => ({ summary: e.summary, start: e.start, end: e.end })),
    windowDays: 7,
  };
}

function buildUserMessage(
  project: {
    name: string;
    area: string | null;
    priority: string | null;
    dueDate: string | null;
    nextAction: string | null;
    estimatedMinutes: number | null;
  },
  context: string,
  areaCtx: AreaContext | null,
  calendarCtx: CalendarContext | null,
): string {
  const today = new Date().toISOString().slice(0, 10);
  const parts: string[] = [];

  parts.push(`Today: ${today}`);
  parts.push("");
  parts.push("PROJECT");
  parts.push(`- Name: ${project.name}`);
  if (project.area) parts.push(`- Area: ${project.area}`);
  if (project.priority) parts.push(`- Priority: ${project.priority}`);
  if (project.dueDate) parts.push(`- Due Date: ${project.dueDate}`);
  if (project.nextAction) parts.push(`- Current Next Action: ${project.nextAction}`);
  if (project.estimatedMinutes != null) {
    parts.push(`- Estimated Minutes: ${project.estimatedMinutes}`);
  }

  parts.push("");
  parts.push("USER CONTEXT");
  parts.push(context.trim() || "(none provided)");

  if (areaCtx) {
    parts.push("");
    parts.push(`AREA "${areaCtx.name}"`);
    if (areaCtx.currentMilestone) parts.push(`- Current Milestone: ${areaCtx.currentMilestone}`);
    if (areaCtx.nextSteps) parts.push(`- Next Steps: ${areaCtx.nextSteps}`);
    if (areaCtx.goal) parts.push(`- Goal: ${areaCtx.goal}`);
  }

  if (calendarCtx && calendarCtx.events.length > 0) {
    parts.push("");
    parts.push(`UPCOMING CALENDAR (next ${calendarCtx.windowDays} days)`);
    for (const e of calendarCtx.events.slice(0, 25)) {
      parts.push(`- ${e.start ?? "?"} — ${e.summary}`);
    }
  }

  return parts.join("\n");
}

function parseStepsJson(text: string): string[] | null {
  const tryParse = (candidate: string): string[] | null => {
    try {
      const obj = JSON.parse(candidate) as unknown;
      if (
        obj &&
        typeof obj === "object" &&
        Array.isArray((obj as { steps?: unknown }).steps)
      ) {
        const arr = (obj as { steps: unknown[] }).steps;
        const strings = arr.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
        if (strings.length >= 1) return strings.slice(0, 5);
      }
    } catch {
      /* fall through */
    }
    return null;
  };

  // Direct parse first; if the model wrapped JSON in prose, find the first
  // brace-delimited object and try that.
  const direct = tryParse(text);
  if (direct) return direct;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return tryParse(text.slice(start, end + 1));
  }
  return null;
}
