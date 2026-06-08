import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { listActiveProjects } from "@/lib/notion";
import { getAuthorizedCalendarClient, isGoogleConnected } from "@/lib/google";
import { briefing, extractText } from "@/lib/anthropic";
import { supabaseServer } from "@/lib/supabase-server";
import { getUserSettings } from "@/lib/settings";
import { todayInTz, tzOffsetMs } from "@/lib/tz";
import { TABLES } from "@/constants/tables";
import { MODELS } from "@/constants/models";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/constants/translations";

export const runtime = "nodejs";

// Section titles + the "nothing qualifies" placeholder, per locale. These are
// model instructions (the briefing is generated in-language), not UI strings —
// so they live here in the prompt, not in the translation table.
const LOCALE_PROMPT: Record<Locale, { language: string; sections: [string, string, string]; none: string }> = {
  de: {
    language: "German (Deutsch)",
    sections: ["Fokus heute", "Überfällig / dringend", "Aufschieben"],
    none: "Keine",
  },
  en: {
    language: "English",
    sections: ["Focus today", "Overdue / urgent", "Defer"],
    none: "None",
  },
};

function buildSystemPrompt(locale: Locale): string {
  const cfg = LOCALE_PROMPT[locale];
  const [focus, overdue, defer] = cfg.sections;
  return `You are Markus's daily focus coach for Business Hub. Markus is a solo founder.
Write the ENTIRE briefing — all prose AND the three section titles — in ${cfg.language}. Do not mix languages.
Return a concise daily briefing in plain markdown with EXACTLY these three H2 sections, in this order, using these exact titles:

## ${focus}
## ${overdue}
## ${defer}

Rules:
- Total length under 400 words. Be terse.
- Use short bullet lists. Reference projects by Name. Mention Due Date only when relevant.
- "${focus}": 2-4 projects that deserve attention now, with a one-line why.
- "${overdue}": projects whose Due Date is past or imminent. Empty bullet "- ${cfg.none}" if nothing qualifies.
- "${defer}": projects that can wait this week. Empty bullet "- ${cfg.none}" if nothing qualifies.
- Do not invent projects. Only reference what the input contains.
- Plain markdown only. No tables, no images, no HTML.`;
}

// Coerce an arbitrary value to a supported locale, defaulting to DE.
function normalizeLocale(value: unknown): Locale {
  return (LOCALES as readonly string[]).includes(value as string)
    ? (value as Locale)
    : DEFAULT_LOCALE;
}

type TrimmedProject = {
  department: string | null;
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
  locale: Locale;
  timezone: string;
  googleConnected: boolean;
  projects: TrimmedProject[];
  events: TrimmedEvent[] | null;
};

function endOfTodayIso(timezone: string): string {
  // 23:59:59.999 local time of today in `timezone`, returned as UTC ISO.
  const date = todayInTz(timezone);
  const utcMidnightEnd = new Date(`${date}T23:59:59.999Z`);
  const offsetMs = tzOffsetMs(utcMidnightEnd, timezone);
  return new Date(utcMidnightEnd.getTime() - offsetMs).toISOString();
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

async function gatherInputs(
  timezone: string,
  calendarId: string,
  locale: Locale,
): Promise<Inputs> {
  const date = todayInTz(timezone);
  const projects = await listActiveProjects();
  const trimmedProjects: TrimmedProject[] = projects.map((p) => ({
    department: p.department,
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
    locale,
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

// Briefings are append-only; the "current" briefing for a (date, kind, locale)
// is the most recent row. Returns null when no row exists yet for today in that
// locale. Each locale is a distinct cache entry.
async function readLatest(date: string, locale: Locale): Promise<CachedRow | null> {
  const db = supabaseServer();
  const { data, error } = await db
    .from(TABLES.BRIEFINGS)
    .select("created_at, input_hash, summary")
    .eq("date", date)
    .eq("kind", "daily")
    .eq("locale", locale)
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
  locale: Locale;
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
      locale: row.locale,
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const locale = normalizeLocale(url.searchParams.get("locale"));
    const settings = await getUserSettings();
    const date = todayInTz(settings.timezone);
    const latest = await readLatest(date, locale);
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
    const body = (await req.json().catch(() => ({}))) as { locale?: unknown };
    const locale = normalizeLocale(body.locale);
    const settings = await getUserSettings();
    const calendarId = settings.master_calendar_id ?? "primary";
    const inputs = await gatherInputs(settings.timezone, calendarId, locale);
    const inputHash = hashInputs(inputs);

    const latest = await readLatest(inputs.date, locale);
    if (!force && latest && latest.input_hash === inputHash) {
      return NextResponse.json({
        summary: latest.summary,
        cached: true,
        generatedAt: latest.created_at,
      });
    }

    const response = await briefing(buildUserPrompt(inputs), buildSystemPrompt(locale));
    const summary = extractText(response);
    if (!summary) {
      return NextResponse.json(
        { ok: false, error: "empty_model_response" },
        { status: 502 },
      );
    }

    const createdAt = await insertBriefing({
      date: inputs.date,
      locale,
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
