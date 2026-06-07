import { NextResponse } from "next/server";
import { roadmapDraft, extractText } from "@/lib/anthropic";
import { AREA_STATUSES, type AreaVersionProps } from "@/lib/notion-areas";
import { questionsForArea } from "@/constants/areas-review";

export const runtime = "nodejs";

type ProjectRef = {
  name?: string;
  url?: string;
  status?: string | null;
  createdTime?: string;
};

type Body = {
  area?: {
    name?: string;
    url?: string;
    status?: string | null;
    created?: string;
    base?: string;
  };
  diff?: {
    doneProjects?: ProjectRef[];
    newProjects?: ProjectRef[];
    ongoingProjects?: ProjectRef[];
  };
  answers?: Record<string, string>;
};

// Bumps "Name (vN)" -> "Name (vN+1)"; appends "(v2)" when there is no version.
function bumpVersion(name: string): string {
  const m = name.match(/^(.*?)\s*\(v(\d+)\)\s*$/);
  if (m) return `${m[1].trim()} (v${parseInt(m[2], 10) + 1})`;
  return `${name.trim()} (v2)`;
}

// Defensive JSON parse — strips an optional ```json fence, then falls back to
// the first {...} block if the model wrapped the JSON in prose.
function parseModelJson(raw: string): { properties?: unknown; body?: unknown } | null {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

const SYSTEM_PROMPT = `Du bist ein präziser Strategie-Co-Pilot für die wöchentliche Areas-Review eines Solo-Unternehmers. Du textest eine neue Version einer "Area"-Seite.

Antworte AUSSCHLIESSLICH mit striktem JSON dieser Form, ohne Code-Fences, ohne Vor- oder Nachtext:
{
  "properties": {
    "status": "Active" | "Needs Attention" | "Paused",
    "goal": "string",
    "standard": "string",
    "healthMetric": "string",
    "currentMilestone": "string",
    "nextFocus": "string",
    "nextSteps": "string"
  },
  "body": "Markdown string"
}

Der "body" hat exakt diese Sektionen in dieser Reihenfolge:
## Standard
## Accomplishments
## Blocker
## Connected Projects
## Notes

Regeln:
- Done-Projekte als datierte Bullets in Accomplishments rollen, Format: "- ✅ <Projektname> (<YYYY-MM-DD>)". Nutze das pro Projekt angegebene Datum; erfinde KEINE Daten.
- Done-Projekte NICHT in Connected Projects auflisten. In Connected Projects nur laufende und neue Projekte als "- <Name>".
- Den Health-Metric-Ist-Wert als eigene Zeile mit Prefix "📊 " in Notes aufnehmen.
- KEINE Em-Dashes (—) verwenden. Kurzer, klarer Beraterton.
- Antworte in der Sprache der Eingabe (in der Regel Deutsch).
- Leite Goal/Standard/Next Focus/Next Steps aus dem aktuellen Stand und den Antworten ab; erfinde keine Fakten.`;

// POST /api/areas/review/draft
// Body: { area, diff, answers }. Calls Sonnet to draft the new area version,
// then assembles the exact /api/areas/version payload. Version number,
// previous-version url and the archive list are computed server-side (not
// trusted to the model); only properties + body come from the LLM.
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { area, diff, answers } = body;
  if (!area || typeof area.name !== "string" || area.name.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "missing_area" }, { status: 400 });
  }

  const done = diff?.doneProjects ?? [];
  const newP = diff?.newProjects ?? [];
  const ongoing = diff?.ongoingProjects ?? [];
  const ans = answers ?? {};
  const reviewDate = new Date().toISOString().slice(0, 10);

  // Build a readable answers block for the prompt (label: answer).
  const questions = questionsForArea(area.base ?? area.name.replace(/ \(v\d+\)$/, "").trim());
  const answerLines = questions
    .map((q) => {
      const v = ans[q.id];
      return v && v.trim() ? `- ${q.id}: ${v.trim()}` : null;
    })
    .filter(Boolean)
    .join("\n");

  const userContent = [
    `AREA: ${area.name}`,
    `Aktueller Status: ${area.status ?? "—"}`,
    "",
    `REVIEW-DATUM (für undatierte Done-Projekte): ${reviewDate}`,
    "",
    "DONE-PROJEKTE (in Accomplishments rollen, aus Connected Projects entfernen):",
    done.length
      ? done
          .map((p) => `- ${p.name} (Datum: ${(p.createdTime ?? "").slice(0, 10) || reviewDate})`)
          .join("\n")
      : "- keine",
    "",
    "NEUE PROJEKTE:",
    newP.length ? newP.map((p) => `- ${p.name}`).join("\n") : "- keine",
    "",
    "LAUFENDE PROJEKTE:",
    ongoing.length ? ongoing.map((p) => `- ${p.name}`).join("\n") : "- keine",
    "",
    "ANTWORTEN AUS DEM REVIEW-FORMULAR:",
    answerLines || "- keine",
  ].join("\n");

  let raw: string;
  try {
    const resp = await roadmapDraft(SYSTEM_PROMPT, userContent);
    raw = extractText(resp);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error("area_review_draft_failed", message);
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 200 });
  }

  const parsed = parseModelJson(raw);
  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json({ ok: false, error: "parse_failed", raw }, { status: 502 });
  }

  const modelProps = (parsed.properties ?? {}) as Record<string, unknown>;
  const properties: AreaVersionProps = {};
  for (const key of [
    "status",
    "goal",
    "standard",
    "healthMetric",
    "currentMilestone",
    "nextFocus",
    "nextSteps",
  ] as const) {
    const v = modelProps[key];
    if (typeof v === "string" && v.trim()) properties[key] = v.trim();
  }

  // User answers win over the model for the deterministic fields.
  if (typeof ans.status === "string" && (AREA_STATUSES as readonly string[]).includes(ans.status)) {
    properties.status = ans.status;
  }
  if (properties.status && !(AREA_STATUSES as readonly string[]).includes(properties.status)) {
    delete properties.status; // never send an invalid status to /api/areas/version
  }
  if (typeof ans.milestone === "string" && ans.milestone.trim()) {
    properties.currentMilestone = ans.milestone.trim();
  }
  if (typeof ans.health === "string" && ans.health.trim()) {
    properties.healthMetric = ans.health.trim();
  }
  if (typeof ans.milestone_due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ans.milestone_due)) {
    properties.milestoneDueDate = ans.milestone_due;
  }

  const payload = {
    newVersionName: bumpVersion(area.name),
    previousVersionUrl: area.url ?? null,
    properties,
    body: typeof parsed.body === "string" ? parsed.body : "",
    archiveProjectUrls: done.map((p) => p.url).filter((u): u is string => typeof u === "string"),
  };

  return NextResponse.json({ ok: true, payload });
}
