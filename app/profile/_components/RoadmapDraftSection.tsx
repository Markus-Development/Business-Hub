"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";

type ProjectToArchive = { pageId: string; name: string; reason: string };

type Draft = {
  proposedRoadmap: string;
  projectsToArchive: ProjectToArchive[];
  summary: string;
  diff: string;
  warnings: string[];
};

type ApplyResult = {
  processed: { pageId: string; name: string; archiveId: string }[];
  errors: { pageId: string; name: string; error: string }[];
  skipped: { pageId: string; name: string; reason: string }[];
};

// idle → drafting → preview → applying → applied | discarded → idle.
// "empty" is the no-Done-projects branch off drafting.
type Phase = "idle" | "drafting" | "preview" | "applying" | "applied" | "discarded" | "empty";

const DIFF_COLLAPSE_THRESHOLD = 80;

// Roadmap draft — preview-gated AI roadmap update. Draft (read-only) proposes a
// full roadmap.md rewrite + per-project archive recommendations; nothing is
// written until the user clicks Apply. Manual trigger only.
export function RoadmapDraftSection() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  const reset = () => {
    setPhase("idle");
    setDraft(null);
    setChecked({});
    setApplyResult(null);
  };

  const runDraft = async () => {
    setPhase("drafting");
    setDraft(null);
    setApplyResult(null);
    try {
      const res = await fetch(ROUTES.api.roadmap.draft, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        draft?: Draft | null;
        reason?: string;
        error?: string;
      };
      if (!res.ok || json.ok !== true) throw new Error(json.error ?? "draft_failed");
      if (!json.draft) {
        setPhase("empty"); // reason: "no_done_projects"
        return;
      }
      setDraft(json.draft);
      setChecked(
        Object.fromEntries(json.draft.projectsToArchive.map((p) => [p.pageId, true])),
      );
      setPhase("preview");
    } catch (err) {
      setPhase("idle");
      toast.error(t("profile.roadmap.draftError"));
      // eslint-disable-next-line no-console
      console.error("roadmap_draft_failed", err);
    }
  };

  const runApply = async () => {
    if (!draft) return;
    setPhase("applying");
    try {
      const approvedProjectIds = draft.projectsToArchive
        .filter((p) => checked[p.pageId])
        .map((p) => p.pageId);
      const res = await fetch(ROUTES.api.roadmap.apply, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedRoadmap: draft.proposedRoadmap, approvedProjectIds }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        archived?: ApplyResult;
        error?: string;
      };
      if (!res.ok || json.ok !== true || !json.archived) {
        throw new Error(json.error ?? "apply_failed");
      }
      setApplyResult(json.archived);
      setPhase("applied");
      toast.success(
        t("profile.roadmap.appliedSummary").replace(
          "{count}",
          String(json.archived.processed.length),
        ),
      );
    } catch (err) {
      setPhase("preview"); // back to preview so the user can retry
      toast.error(t("profile.roadmap.applyError"));
      // eslint-disable-next-line no-console
      console.error("roadmap_apply_failed", err);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{t("profile.roadmap.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("profile.roadmap.description")}</p>
        </div>
        {(phase === "idle" || phase === "drafting") && (
          <Button size="sm" onClick={runDraft} disabled={phase === "drafting"}>
            {phase === "drafting"
              ? t("profile.roadmap.drafting")
              : t("profile.roadmap.draftButton")}
          </Button>
        )}
      </div>

      {phase === "empty" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{t("profile.roadmap.empty")}</p>
          <Button variant="outline" size="sm" onClick={reset}>
            {t("profile.roadmap.tryAgain")}
          </Button>
        </div>
      )}

      {(phase === "preview" || phase === "applying") && draft && (
        <PreviewPanel
          draft={draft}
          checked={checked}
          onToggle={(id) => setChecked((c) => ({ ...c, [id]: !c[id] }))}
          applying={phase === "applying"}
          onApply={runApply}
          onDiscard={() => setPhase("discarded")}
        />
      )}

      {phase === "applied" && applyResult && (
        <AppliedPanel result={applyResult} onReset={reset} />
      )}

      {phase === "discarded" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{t("profile.roadmap.discarded")}</p>
          <Button variant="outline" size="sm" onClick={reset}>
            {t("profile.roadmap.tryAgain")}
          </Button>
        </div>
      )}
    </section>
  );
}

function PreviewPanel({
  draft,
  checked,
  onToggle,
  applying,
  onApply,
  onDiscard,
}: {
  draft: Draft;
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
  applying: boolean;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const t = useT();
  return (
    <div className="mt-4 space-y-4">
      {draft.summary ? <p className="text-sm text-foreground">{draft.summary}</p> : null}

      <DiffView diff={draft.diff} />

      {draft.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200/60 bg-amber-500/10 px-3 py-2 dark:border-amber-800/50">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
            {t("profile.roadmap.warningsLabel")}
          </p>
          <ul className="mt-1 space-y-0.5">
            {draft.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-300">
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {draft.projectsToArchive.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("profile.roadmap.projectsLabel")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {draft.projectsToArchive.map((p) => (
              <li key={p.pageId} className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={checked[p.pageId] ?? false}
                  onChange={() => onToggle(p.pageId)}
                  disabled={applying}
                  className="size-4 accent-primary"
                />
                <span className="flex-1 truncate text-sm text-foreground" title={p.name}>
                  {p.name}
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {p.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Button onClick={onApply} disabled={applying}>
          {applying ? t("profile.roadmap.applying") : t("profile.roadmap.apply")}
        </Button>
        <Button variant="ghost" onClick={onDiscard} disabled={applying}>
          {t("profile.roadmap.discard")}
        </Button>
      </div>
    </div>
  );
}

function DiffView({ diff }: { diff: string }) {
  const t = useT();
  const lines = diff.split("\n");
  const longDiff = lines.length > DIFF_COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!longDiff);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("profile.roadmap.diffLabel")}
        </p>
        {longDiff ? (
          <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded
              ? t("profile.roadmap.hideDiff")
              : t("profile.roadmap.showDiff").replace("{count}", String(lines.length))}
          </Button>
        ) : null}
      </div>
      {expanded ? (
        <pre className="mt-1 max-h-[480px] overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed">
          {lines.map((line, i) => (
            <div key={i} className={diffLineClass(line)}>
              {line || " "}
            </div>
          ))}
        </pre>
      ) : null}
    </div>
  );
}

// Unified-diff line coloring: + additions emerald, - removals red, @@ hunk and
// +++/--- file headers muted, everything else neutral.
function diffLineClass(line: string): string {
  if (line.startsWith("@@") || line.startsWith("+++") || line.startsWith("---")) {
    return "text-muted-foreground";
  }
  if (line.startsWith("+")) return "text-emerald-600 dark:text-emerald-400";
  if (line.startsWith("-")) return "text-red-600 dark:text-red-400";
  return "text-foreground/80";
}

function AppliedPanel({ result, onReset }: { result: ApplyResult; onReset: () => void }) {
  const t = useT();
  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <p className="text-foreground">
          {t("profile.roadmap.appliedSummary").replace(
            "{count}",
            String(result.processed.length),
          )}
        </p>
        {result.errors.length > 0 ? (
          <ResultList
            label={t("profile.roadmap.errorsLabel")}
            tone="error"
            items={result.errors.map((e) => `${e.name} — ${e.error}`)}
          />
        ) : null}
        {result.skipped.length > 0 ? (
          <ResultList
            label={t("profile.roadmap.skippedLabel")}
            tone="muted"
            items={result.skipped.map((s) => `${s.name} — ${s.reason}`)}
          />
        ) : null}
      </div>
      <Button variant="outline" size="sm" onClick={onReset}>
        {t("profile.roadmap.runAgain")}
      </Button>
    </div>
  );
}

function ResultList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "error" | "muted";
}) {
  return (
    <div className="mt-3">
      <p
        className={`text-xs font-medium uppercase tracking-wide ${
          tone === "error" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <ul className="mt-1 space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="font-mono text-xs text-muted-foreground">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
