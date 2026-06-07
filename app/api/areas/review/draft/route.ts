import { NextResponse } from "next/server";
import { roadmapDraft, extractText } from "@/lib/anthropic";
import { getAreaPageBlocks, type NotionBlock } from "@/lib/notion";
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
    id?: string;
    name?: string;
    url?: string;
    status?: string | null;
    created?: string;
    base?: string;
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

// Joins a block's rich_text array into trimmed plain text.
function blockPlainText(data: any): string {
  const parts = data?.rich_text ?? [];
  return parts
    .map((p: any) => p?.plain_text ?? "")
    .join("")
    .trim();
}

// Walks the previous version's page blocks and returns the bullets under the
// "## Accomplishments" heading (the next heading_2 ends the section). Empty /
// whitespace bullets are dropped. Used to carry accomplishments forward
// cumulatively across versions.
function extractAccomplishmentsBullets(blocks: NotionBlock[]): string[] {
  const bullets: string[] = [];
  let inSection = false;
  for (const block of blocks) {
    if (block.type === "heading_2") {
      if (inSection) break; // the next heading_2 closes the Accomplishments section
      if (blockPlainText(block.data).toLowerCase() === "accomplishments") inSection = true;
      continue;
    }
    if (inSection && block.type === "bulleted_list_item") {
      const text = blockPlainText(block.data);
      if (text) bullets.push(text);
    }
  }
  return bullets;
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
- ## Accomplishments ist KUMULATIV über Versionen. Übernimm ZUERST ALLE unter BESTEHENDE ACCOMPLISHMENTS aufgeführten Bullets WORTWÖRTLICH und unverändert, in derselben Reihenfolge.
- Hänge DANACH die neuen Done-Projekte als "- ✅ <Projektname> (<YYYY-MM-DD>)" an. Nutze das pro Projekt angegebene Datum; erfinde KEINE Daten.
- KEINE Duplikate: ein Done-Projekt, dessen Name bereits in einem bestehenden Bullet vorkommt, NICHT erneut anhängen.
- Wenn unter ERREICHTER MEILENSTEIN ein Bullet vorgegeben ist (beginnt mit 🏁), nimm ihn zusätzlich WORTWÖRTLICH als eigenen Bullet in ## Accomplishments auf. Steht dort "keiner", füge keinen solchen Bullet hinzu. Keine Duplikate.
- Reihenfolge in Accomplishments: bestehende Bullets zuerst, danach der erreichte-Meilenstein-Bullet (falls vorhanden), danach die neuen Done-Projekte.
- Done-Projekte NICHT in Connected Projects auflisten. In Connected Projects nur laufende und neue Projekte als "- <Name>".
- Wenn unter HEALTH-METRIC eine fertige 📊-Zeile vorgegeben ist, übernimm sie WORTWÖRTLICH und unverändert als eigene Zeile in ## Notes. Erfinde keine eigene Health-Zeile.
- "healthMetric" in properties ist die DEFINITION (was gemessen wird), nicht der Ist-Status. Lass sie unverändert, wenn vorgegeben.
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

  // Carry the previous version's Accomplishments forward (cumulative across
  // versions). Read the live page body once; a fetch failure or missing id is a
  // soft-fail — we proceed without carry-forward rather than killing the draft.
  let existingAccomplishments: string[] = [];
  if (typeof area.id === "string" && area.id.trim()) {
    try {
      const blocks = await getAreaPageBlocks(area.id.trim());
      existingAccomplishments = extractAccomplishmentsBullets(blocks);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        "area_review_accomplishments_read_failed",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Milestone choice: "keep" carries the current milestone forward unchanged;
  // "reached" sets a new one AND logs the old one as a 🏁 bullet in
  // Accomplishments; "adjust" replaces the wording without logging a reached
  // bullet. Default "keep".
  const milestoneStatus = typeof ans.milestone_status === "string" ? ans.milestone_status : "keep";
  const areaCurrentMilestone =
    typeof area.currentMilestone === "string" ? area.currentMilestone.trim() : "";
  const reachedMilestoneBullet =
    milestoneStatus === "reached" && areaCurrentMilestone
      ? `🏁 Meilenstein erreicht: ${areaCurrentMilestone} (${reviewDate})`
      : null;

  // Health metric: the definition (what is measured) stays as the property; the
  // dropdown selection is the actual status and is composed into the body's 📊
  // line, format "📊 <Definition>: <Auswahl> (<Datum>)".
  const healthDef = typeof area.healthMetric === "string" ? area.healthMetric.trim() : "";
  const healthStatus = typeof ans.health === "string" ? ans.health.trim() : "";
  const healthLine = healthStatus
    ? `📊 ${healthDef || "Health Metric"}: ${healthStatus} (${reviewDate})`
    : null;

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
    "HEALTH-METRIC:",
    `- Definition (was gemessen wird): ${healthDef || "—"}`,
    `- Ist-Status (Auswahl): ${healthStatus || "—"}`,
    healthLine
      ? `- Übernimm diese Zeile WÖRTLICH als eigene Zeile in ## Notes: ${healthLine}`
      : "- Keine Health-Zeile in ## Notes hinzufügen.",
    "",
    "BESTEHENDE ACCOMPLISHMENTS (unverändert übernehmen, dann neue anhängen, keine Duplikate):",
    existingAccomplishments.length
      ? existingAccomplishments.map((b) => `- ${b}`).join("\n")
      : "- keine",
    "",
    reachedMilestoneBullet
      ? `ERREICHTER MEILENSTEIN (als eigenen Bullet in ## Accomplishments aufnehmen):\n- ${reachedMilestoneBullet}`
      : "ERREICHTER MEILENSTEIN: keiner",
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
  // Milestone: "keep" carries the current one forward unchanged; "reached" /
  // "adjust" use the entered text, falling back to the current one if empty.
  if (milestoneStatus === "keep") {
    if (areaCurrentMilestone) properties.currentMilestone = areaCurrentMilestone;
  } else {
    const entered = typeof ans.milestone === "string" ? ans.milestone.trim() : "";
    const next = entered || areaCurrentMilestone;
    if (next) properties.currentMilestone = next;
  }
  // healthMetric is the DEFINITION — carry the existing one forward unchanged.
  // The dropdown selection (the actual status) lives in the body's 📊 line, not
  // in this property.
  if (healthDef) {
    properties.healthMetric = healthDef;
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
