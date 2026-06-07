import { NextResponse } from "next/server";
import { roadmapDraft, extractText } from "@/lib/anthropic";
import {
  getPageBlocks,
  listInboxEntries,
  fetchResourceSelectOptions,
  type NotionBlock,
} from "@/lib/notion";
import { DEPARTMENTS } from "@/constants/departments";
import { PRIORITIES } from "@/constants/priorities";
import { RESOURCE_TYPES } from "@/constants/resource-types";

export const runtime = "nodejs";

type Body = { entryId?: unknown };

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

type Suggestion = {
  destination: "project" | "resource";
  title: string;
  body: string;
  project: {
    department: string;
    priority: string;
    nextAction: string;
    dueDate: string | null;
  };
  resource: { area: string | null; type: string };
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Defensive parse: strip a ```json fence, then JSON.parse; fall back to slicing
// the first {...} block if the model wrapped JSON in prose.
function parseJson(text: string): Record<string, unknown> | null {
  const tryParse = (s: string): Record<string, unknown> | null => {
    try {
      const obj = JSON.parse(s);
      return obj && typeof obj === "object" ? (obj as Record<string, unknown>) : null;
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

// Flatten the body block tree to a plain-text excerpt for the prompt.
function blocksToText(blocks: NotionBlock[]): string {
  const lines: string[] = [];
  const walk = (bs: NotionBlock[]) => {
    for (const b of bs) {
      const rich = (b.data?.rich_text ?? []) as { plain_text?: string }[];
      const text = rich.map((r) => r.plain_text ?? "").join("");
      if (text.trim()) lines.push(text);
      if (b.children) walk(b.children);
    }
  };
  walk(blocks);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `Du bist ein Triage-Assistent für eine PARA-Inbox (Projekte + Ressourcen).
Du bekommst einen roh erfassten Inbox-Eintrag (kurzer Freitext, evtl. mit Body-Text).
Deine Aufgabe: schlage eine sauber ausformulierte Version vor und wähle das beste Ziel.

Antworte AUSSCHLIESSLICH mit gültigem JSON in genau dieser Form (keine Erklärung, kein Markdown-Fence):
{
  "destination": "project" | "resource",
  "title": "<kurzer, sauberer Titel>",
  "body": "<Markdown; nutze Stichpunkte (- ) wenn der Kontext es hergibt; KEINE Gedankenstriche (em-dash)>",
  "project": {
    "department": <einer der erlaubten Department-Werte>,
    "priority": "High" | "Medium" | "Low",
    "nextAction": "<die nächste konkrete physische Handlung>",
    "dueDate": "YYYY-MM-DD" oder null
  },
  "resource": {
    "area": <einer der erlaubten Area-Werte oder null>,
    "type": <einer der erlaubten Resource-Type-Werte>
  }
}

Regeln:
- Wähle "destination" nach bestem Urteil (umsetzbare Aufgabe -> project; Wissen/Referenz/Link -> resource).
- Fülle BEIDE Blöcke (project UND resource) vollständig aus, damit der Nutzer das Ziel in der UI wechseln kann.
- Nutze nur die erlaubten Enum-Werte. Erfinde keine neuen.
- Sprache der Ausgabe = Sprache des Eintrags (Standard: Deutsch).
- Keine Gedankenstriche / em-dashes im Body.`;

export async function POST(req: Request) {
  if (!process.env.NOTION_INBOX_DB_ID) return bad("not_configured", 503);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }
  const entryId = body.entryId;
  if (typeof entryId !== "string" || entryId.trim().length === 0) {
    return bad("missing_entry_id");
  }

  // Resolve the entry's Name text (server-side, FIFO list) + its body blocks +
  // live Resource Area options, in parallel. Notion rate-limit awareness:
  // batched, not serial-in-a-loop.
  let entryName = "";
  let bodyText = "";
  let areaOptions: string[] = [];
  try {
    const [entries, blocks, areas] = await Promise.all([
      listInboxEntries(),
      getPageBlocks(entryId).catch(() => [] as NotionBlock[]),
      fetchResourceSelectOptions("Area").catch(() => null),
    ]);
    const match = entries.find((e) => e.id === entryId);
    entryName = match?.name ?? "";
    bodyText = blocksToText(blocks);
    areaOptions = (areas ?? []).map((o) => o.name);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error("inbox_suggest_fetch_failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  if (!entryName.trim() && !bodyText.trim()) return bad("entry_not_found", 404);

  const userContent = [
    `ERLAUBTE DEPARTMENTS: ${DEPARTMENTS.join(", ")}`,
    `ERLAUBTE PRIORITIES: ${PRIORITIES.join(", ")}`,
    `ERLAUBTE RESOURCE TYPES: ${RESOURCE_TYPES.join(", ")}`,
    `ERLAUBTE RESOURCE AREAS: ${areaOptions.length ? areaOptions.join(", ") : "(keine — area = null)"}`,
    "",
    "INBOX-EINTRAG:",
    entryName,
    bodyText ? `\nBODY:\n${bodyText}` : "",
  ].join("\n");

  let raw: string;
  try {
    const response = await roadmapDraft(SYSTEM_PROMPT, userContent);
    raw = extractText(response);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("inbox_suggest_generation_failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 200 });
  }

  const parsed = parseJson(raw);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "parse_failed", raw }, { status: 502 });
  }

  // Coerce + clamp to valid enums so the UI receives clean defaults (every field
  // stays editable client-side).
  const proj = (parsed.project ?? {}) as Record<string, unknown>;
  const res = (parsed.resource ?? {}) as Record<string, unknown>;

  const department =
    typeof proj.department === "string" && (DEPARTMENTS as readonly string[]).includes(proj.department)
      ? proj.department
      : DEPARTMENTS[0];
  const priority =
    typeof proj.priority === "string" && (PRIORITIES as readonly string[]).includes(proj.priority)
      ? proj.priority
      : "Medium";
  const dueDate =
    typeof proj.dueDate === "string" && DATE_RE.test(proj.dueDate) ? proj.dueDate : null;
  const resType =
    typeof res.type === "string" && (RESOURCE_TYPES as readonly string[]).includes(res.type)
      ? res.type
      : RESOURCE_TYPES[0];
  const resArea =
    typeof res.area === "string" && areaOptions.includes(res.area) ? res.area : null;

  const suggestion: Suggestion = {
    destination: parsed.destination === "resource" ? "resource" : "project",
    title:
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : entryName.slice(0, 120),
    body: typeof parsed.body === "string" ? parsed.body : "",
    project: {
      department,
      priority,
      nextAction: typeof proj.nextAction === "string" ? proj.nextAction : "",
      dueDate,
    },
    resource: { area: resArea, type: resType },
  };

  return NextResponse.json({ ok: true, suggestion });
}
