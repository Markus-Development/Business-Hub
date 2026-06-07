import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { roadmapDraft, extractText } from "@/lib/anthropic";

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
    base?: string;
    status?: string | null;
    currentMilestone?: string | null;
    milestoneDueDate?: string | null;
    healthMetric?: string | null;
  };
  diff?: {
    doneProjects?: ProjectRef[];
    newProjects?: ProjectRef[];
    ongoingProjects?: ProjectRef[];
  };
  answers?: Record<string, string>;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Defensive JSON parse — strips an optional ```json fence, then falls back to the
// first {...} block if the model wrapped the JSON in prose. Mirrors the draft route.
function parseModelJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

const SYSTEM_PROMPT = `Du bist ein präziser Strategie-Co-Pilot für die wöchentliche Areas-Review eines Solo-Unternehmers. Du planst die nächste Phase einer "Area".

Antworte AUSSCHLIESSLICH mit striktem JSON dieser Form, ohne Code-Fences, ohne Vor- oder Nachtext:
{
  "milestone": "string",
  "milestoneDueDate": "YYYY-MM-DD" oder null,
  "projects": [
    { "name": "string", "dueDate": "YYYY-MM-DD" oder null }
  ]
}

Regeln:
- Schlage GENAU EINEN konkreten, klar formulierten nächsten Meilenstein für diese Area vor.
- Schlage 3 bis 6 konkrete Projekte fuer die naechste Phase vor, jedes mit realistischer Faelligkeit.
- Gruende alles auf dem aktuellen Area-Stand und der Business-Roadmap. Erfinde KEINE Fakten.
- Wenn ein Datum unklar ist, setze dueDate bzw. milestoneDueDate auf null statt zu raten.
- KEINE Em-Dashes verwenden. Kurzer, klarer Beraterton.
- Antworte in der Sprache der Eingabe (in der Regel Deutsch).`;

// POST /api/areas/review/suggest
// Body: { area, diff, answers }. Reads roadmap.md (read-only, soft-fail when
// missing) as strategy context and asks Sonnet for ONE next milestone plus 3-6
// concrete next-phase projects. The draft/version flow is untouched.
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
  const today = new Date().toISOString().slice(0, 10);

  // Roadmap is strategy context only and read-only. A missing file is a soft
  // failure: we proceed WITHOUT roadmap context rather than returning 500.
  let roadmap = "";
  try {
    roadmap = readFileSync(path.join(process.cwd(), "roadmap.md"), "utf-8");
  } catch {
    roadmap = "";
  }

  const answerLines = Object.entries(ans)
    .map(([k, v]) => (typeof v === "string" && v.trim() ? `- ${k}: ${v.trim()}` : null))
    .filter(Boolean)
    .join("\n");

  const userContent = [
    `HEUTE: ${today}`,
    "",
    `AREA: ${area.name}`,
    `Aktueller Status: ${area.status ?? "—"}`,
    `Aktueller Meilenstein: ${area.currentMilestone ?? "—"}`,
    `Meilenstein-Faelligkeit: ${area.milestoneDueDate ?? "—"}`,
    `Health-Metric: ${area.healthMetric ?? "—"}`,
    "",
    "ABGESCHLOSSENE PROJEKTE:",
    done.length ? done.map((p) => `- ${p.name}`).join("\n") : "- keine",
    "",
    "NEUE PROJEKTE:",
    newP.length ? newP.map((p) => `- ${p.name}`).join("\n") : "- keine",
    "",
    "LAUFENDE PROJEKTE:",
    ongoing.length ? ongoing.map((p) => `- ${p.name}`).join("\n") : "- keine",
    "",
    "ANTWORTEN AUS DEM REVIEW-FORMULAR:",
    answerLines || "- keine",
    "",
    "BUSINESS-ROADMAP (Strategie-Kontext, read-only):",
    roadmap.trim() ? roadmap.trim() : "- keine Roadmap verfuegbar",
  ].join("\n");

  let raw: string;
  try {
    const resp = await roadmapDraft(SYSTEM_PROMPT, userContent);
    raw = extractText(resp);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // eslint-disable-next-line no-console
    console.error("area_review_suggest_failed", message);
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 200 });
  }

  const parsed = parseModelJson(raw);
  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json({ ok: false, error: "parse_failed", raw }, { status: 502 });
  }

  const milestone = typeof parsed.milestone === "string" ? parsed.milestone.trim() : "";
  const milestoneDueDate =
    typeof parsed.milestoneDueDate === "string" && ISO_DATE.test(parsed.milestoneDueDate)
      ? parsed.milestoneDueDate
      : null;

  const rawProjects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const projects = rawProjects
    .map((p) => {
      const entry = (p ?? {}) as Record<string, unknown>;
      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      const dueDate =
        typeof entry.dueDate === "string" && ISO_DATE.test(entry.dueDate) ? entry.dueDate : null;
      return name ? { name, dueDate } : null;
    })
    .filter((p): p is { name: string; dueDate: string | null } => p !== null);

  return NextResponse.json({ ok: true, milestone, milestoneDueDate, projects });
}
