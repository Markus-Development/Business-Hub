"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import type { ReviewQuestion } from "@/constants/areas-review";
import type { TranslationKey } from "@/constants/translations";
import type { AreaReviewState } from "@/app/api/areas/review/diff/route";
import { AreaProjectsPanel } from "./AreaProjectsPanel";
import { MilestoneField, type MilestoneStatus } from "./MilestoneField";

type T = (key: TranslationKey) => string;

// Status options mirror AREA_STATUSES in lib/notion-areas (server-only, so the
// list is repeated here for the client). Labels reuse the areas.status.* keys.
const STATUS_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: "Active", labelKey: "areas.status.active" },
  { value: "Needs Attention", labelKey: "areas.status.needsAttention" },
  { value: "Paused", labelKey: "areas.status.paused" },
];

// Health-metric actual-status options. The value is the canonical German string
// that flows into the body's 📊 line (the draft body is German); labels are
// localized.
const HEALTH_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: "Auf Kurs", labelKey: "areasReview.health.onTrack" },
  { value: "Leicht dahinter", labelKey: "areasReview.health.slightlyBehind" },
  { value: "Deutlich dahinter", labelKey: "areasReview.health.wellBehind" },
  { value: "Kein Wert / N/A", labelKey: "areasReview.health.na" },
];

type DraftPayload = {
  newVersionName: string;
  previousVersionUrl: string | null;
  properties: Record<string, string>;
  body: string;
  archiveProjectUrls: string[];
};

export function ReviewWizard({ notConfigured }: { notConfigured?: boolean }) {
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;

  // Single-area mode: `?area=<base>` narrows the wizard to one area. Absent →
  // the full sequential review (unchanged behaviour). Kept as a primitive so the
  // mount effect's dep list stays loop-safe.
  const searchParams = useSearchParams();
  const areaParam = searchParams.get("area");

  const [areas, setAreas] = useState<AreaReviewState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);

  // answers[areaId][questionId] = value
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftPayload>>({});
  const [written, setWritten] = useState<Set<string>>(new Set());
  // Cleanup warnings from the last approve, kept per area so the detail stays
  // readable on the step instead of vanishing with a count-only toast.
  const [warnings, setWarnings] = useState<Record<string, string[]>>({});
  const [drafting, setDrafting] = useState(false);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    if (notConfigured) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(ROUTES.api.areas.reviewDiff, { method: "POST" });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error ?? "load_failed");
        if (!cancelled) {
          const loaded = data.areas as AreaReviewState[];
          // In single-area mode keep only the matching base; an empty result
          // falls through to the existing empty screen (no new error route).
          const list = areaParam ? loaded.filter((a) => a.base === areaParam) : loaded;
          setAreas(list);
          setIndex(0);
          // Pre-fill the milestone answer (and due date) with each area's
          // current value so the user can confirm or edit it in place.
          const seeded: Record<string, Record<string, string>> = {};
          for (const a of list) {
            const seed: Record<string, string> = {};
            if (a.area.currentMilestone) seed.milestone = a.area.currentMilestone;
            if (a.area.milestoneDueDate) seed.milestone_due = a.area.milestoneDueDate.slice(0, 10);
            if (Object.keys(seed).length) seeded[a.area.id] = seed;
          }
          setAnswers(seeded);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notConfigured, areaParam]);

  const current = areas[index];
  const currentDraft = current ? drafts[current.area.id] : undefined;

  const setAnswer = useCallback((areaId: string, qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [areaId]: { ...(prev[areaId] ?? {}), [qid]: value } }));
  }, []);

  const goNext = useCallback(() => setIndex((i) => i + 1), []);

  const createDraft = useCallback(async () => {
    if (!current) return;
    setDrafting(true);
    try {
      const res = await fetch(ROUTES.api.areas.reviewDraft, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          area: { ...current.area, base: current.base },
          diff: {
            doneProjects: current.doneProjects,
            newProjects: current.newProjects,
            ongoingProjects: current.ongoingProjects,
          },
          answers: answers[current.area.id] ?? {},
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "draft_failed");
      setDrafts((prev) => ({ ...prev, [current.area.id]: data.payload as DraftPayload }));
    } catch {
      toast.error(tRef.current("areasReview.draftError"));
    } finally {
      setDrafting(false);
    }
  }, [current, answers]);

  const approve = useCallback(async () => {
    if (!current || !currentDraft) return;
    setWriting(true);
    try {
      const res = await fetch(ROUTES.api.areas.version, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(currentDraft),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "write_failed");
      setWritten((prev) => new Set(prev).add(current.area.id));
      const areaWarnings = (data.warnings ?? []) as string[];
      setWarnings((prev) => ({ ...prev, [current.area.id]: areaWarnings }));
      if (areaWarnings.length > 0) {
        // Stay on the step so the persistent cleanup-failure callout is visible;
        // Markus advances manually once he has read it.
        toast.warning(`${tRef.current("areasReview.warnings")}: ${areaWarnings.length}`);
      } else {
        toast.success(tRef.current("areasReview.writeSuccess"));
        goNext();
      }
    } catch {
      toast.error(tRef.current("areasReview.writeError"));
    } finally {
      setWriting(false);
    }
  }, [current, currentDraft, goNext]);

  // --- render -------------------------------------------------------------
  // In single-area mode, surface the base name in the subtitle.
  const singleSubtitle = areaParam
    ? t("areasReview.singleSubtitle").replace("{area}", areaParam)
    : undefined;

  if (notConfigured) {
    return (
      <Shell t={t}>
        <p className="text-sm text-muted-foreground">{t("areasReview.error")}</p>
      </Shell>
    );
  }
  if (loading) {
    return (
      <Shell t={t}>
        <p className="text-sm text-muted-foreground">{t("areasReview.loading")}</p>
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell t={t}>
        <p className="text-sm text-destructive">{t("areasReview.error")}</p>
      </Shell>
    );
  }
  if (areas.length === 0 || index >= areas.length) {
    return (
      <Shell t={t} subtitle={singleSubtitle}>
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="font-medium text-foreground">
            {areas.length === 0 ? t("areasReview.empty") : t("areasReview.finished")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("areasReview.finishedHint")}</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href={ROUTES.pages.areas}>{t("areasReview.back")}</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const areaAnswers = answers[current.area.id] ?? {};

  return (
    <Shell t={t} subtitle={singleSubtitle}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {t("areasReview.step")
            .replace("{current}", String(index + 1))
            .replace("{total}", String(areas.length))}
        </span>
        {index > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i - 1)}>
            {t("areasReview.prev")}
          </Button>
        )}
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">{current.base}</h2>
          {current.area.status && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {current.area.status}
            </span>
          )}
          {current.skippable && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              {t("areasReview.skippableBadge")}
            </span>
          )}
          {written.has(current.area.id) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {t("areasReview.writeSuccess")}
            </span>
          )}
        </div>

        {/* Diff */}
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <DiffColumn title={t("areasReview.sectionDone")} items={current.doneProjects} empty={t("areasReview.noProjects")} tone="done" />
          <DiffColumn title={t("areasReview.sectionNew")} items={current.newProjects} empty={t("areasReview.noProjects")} tone="new" />
          <DiffColumn title={t("areasReview.sectionOngoing")} items={current.ongoingProjects} empty={t("areasReview.noProjects")} tone="ongoing" />
        </div>

        {!currentDraft ? (
          <>
            {/* Questions */}
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              {t("areasReview.questionsTitle")}
            </h3>
            <div className="space-y-3">
              {current.questions.map((q) =>
                q.id === "milestone" ? (
                  <MilestoneField
                    key={q.id}
                    current={current.area.currentMilestone ?? ""}
                    status={areaAnswers["milestone_status"] ?? "keep"}
                    milestone={areaAnswers["milestone"] ?? ""}
                    onStatusChange={(s: MilestoneStatus) =>
                      setAnswer(current.area.id, "milestone_status", s)
                    }
                    onMilestoneChange={(v) => setAnswer(current.area.id, "milestone", v)}
                  />
                ) : (
                  <QuestionField
                    key={q.id}
                    q={q}
                    t={t}
                    helper={questionHelper(q.id, current.area, t)}
                    value={areaAnswers[q.id] ?? ""}
                    onChange={(v) => setAnswer(current.area.id, q.id, v)}
                  />
                ),
              )}
            </div>

            {/* Manual + AI-prefilled new-projects panel — independent of the draft/version flow. */}
            <div className="mt-5">
              <AreaProjectsPanel
                department={current.base}
                area={{ ...current.area, base: current.base }}
                diff={{
                  doneProjects: current.doneProjects,
                  newProjects: current.newProjects,
                  ongoingProjects: current.ongoingProjects,
                }}
                answers={areaAnswers}
                onAdoptMilestone={(m, due) => {
                  setAnswer(current.area.id, "milestone", m);
                  if (due) setAnswer(current.area.id, "milestone_due", due);
                  // Surface the adopted text in an editable field: flip keep -> adjust.
                  if ((areaAnswers["milestone_status"] ?? "keep") === "keep") {
                    setAnswer(current.area.id, "milestone_status", "adjust");
                  }
                }}
              />
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Button onClick={() => void createDraft()} disabled={drafting}>
                <Sparkles className="mr-1.5 h-4 w-4" />
                {drafting ? t("areasReview.drafting") : t("areasReview.draftButton")}
              </Button>
              <Button variant="ghost" onClick={goNext} disabled={drafting}>
                {t("areasReview.skip")}
              </Button>
            </div>
          </>
        ) : (
          <Preview
            t={t}
            draft={currentDraft}
            writing={writing}
            onApprove={() => void approve()}
            onRedraft={() =>
              setDrafts((prev) => {
                const next = { ...prev };
                delete next[current.area.id];
                return next;
              })
            }
          />
        )}

        {(warnings[current.area.id]?.length ?? 0) > 0 && (
          <div className="mt-4 rounded-md border border-amber-300/60 bg-amber-500/10 p-3 dark:border-amber-800/50">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t("areasReview.warningsHeading")}
            </p>
            <ul className="mt-1.5 list-disc space-y-2 pl-5">
              {warnings[current.area.id].map((w, i) => {
                // Each warning carries the failed page URL — surface it as a direct
                // link so Markus can open and archive that page manually.
                const url = w.match(/(https?:\/\/[^\s)]+)/)?.[1] ?? null;
                return (
                  <li key={i} className="break-words text-xs text-amber-700 dark:text-amber-400">
                    <span className="font-mono">{w}</span>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" aria-hidden />
                        {t("areasReview.warningsOpenPage")}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{t("areasReview.warningsHint")}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={goNext}>
              {t("areasReview.warningsContinue")}
            </Button>
          </div>
        )}
      </section>
    </Shell>
  );
}

function Shell({
  t,
  subtitle,
  children,
}: {
  t: T;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1080px] px-6 py-8">
      <header className="mb-5">
        <Link
          href={ROUTES.pages.areas}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("areasReview.back")}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-foreground">{t("areasReview.title")}</h1>
        <p className="text-sm text-muted-foreground">{subtitle ?? t("areasReview.subtitle")}</p>
      </header>
      {children}
    </div>
  );
}

function DiffColumn({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: { id: string; name: string; url: string }[];
  empty: string;
  tone: "done" | "new" | "ongoing";
}) {
  const dot =
    tone === "done" ? "bg-emerald-500" : tone === "new" ? "bg-primary" : "bg-muted-foreground";
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-xs font-semibold text-foreground">
          {title} ({items.length})
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((p) => (
            <li key={p.id} className="text-xs text-muted-foreground">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="break-words hover:text-foreground"
              >
                {p.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Builds the muted helper line shown above a question field. Milestone shows the
// area's current milestone (+ due date); health shows the metric definition so
// the user knows what is being measured.
function questionHelper(
  qid: string,
  area: AreaReviewState["area"],
  t: T,
): string | undefined {
  if (qid === "milestone") {
    if (!area.currentMilestone) return undefined;
    let line = `${t("areasReview.currentLabel")}: ${area.currentMilestone}`;
    if (area.milestoneDueDate) {
      line += ` (${t("areasReview.dueLabel")} ${area.milestoneDueDate.slice(0, 10)})`;
    }
    return line;
  }
  if (qid === "health") {
    return area.healthMetric
      ? `${t("areasReview.measuresLabel")}: ${area.healthMetric}`
      : t("areasReview.noHealthMetric");
  }
  return undefined;
}

function QuestionField({
  q,
  t,
  value,
  onChange,
  helper,
}: {
  q: ReviewQuestion;
  t: T;
  value: string;
  onChange: (v: string) => void;
  helper?: string;
}) {
  const label = t(q.labelKey);
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-foreground">{label}</span>
      {helper && (
        <span className="mb-1.5 block text-xs text-muted-foreground">{helper}</span>
      )}
      {q.type === "status" ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue placeholder={t("areasReview.statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {t(s.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : q.type === "health" ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-9 w-full text-sm">
            <SelectValue placeholder={t("areasReview.healthPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {HEALTH_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : q.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      ) : q.type === "date" ? (
        <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" />
      )}
    </label>
  );
}

function Preview({
  t,
  draft,
  writing,
  onApprove,
  onRedraft,
}: {
  t: T;
  draft: DraftPayload;
  writing: boolean;
  onApprove: () => void;
  onRedraft: () => void;
}) {
  const propEntries = Object.entries(draft.properties).filter(([, v]) => v);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        {t("areasReview.previewTitle")} · {draft.newVersionName}
      </h3>

      {propEntries.length > 0 && (
        <div className="mb-3 rounded-md border border-border bg-background p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("areasReview.propertiesTitle")}
          </p>
          <dl className="space-y-1">
            {propEntries.map(([k, v]) => (
              <div key={k} className="flex gap-2 text-xs">
                <dt className="w-32 shrink-0 text-muted-foreground">{k}</dt>
                <dd className="text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mb-3 rounded-md border border-border bg-background p-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("areasReview.bodyTitle")}
        </p>
        <div className="prose prose-sm max-w-none text-sm text-foreground [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown>{draft.body}</ReactMarkdown>
        </div>
      </div>

      {draft.archiveProjectUrls.length > 0 && (
        <p className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          {draft.archiveProjectUrls.length} → Archived
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={onApprove} disabled={writing}>
          {writing ? t("areasReview.writing") : t("areasReview.approve")}
        </Button>
        <Button variant="ghost" onClick={onRedraft} disabled={writing}>
          {t("areasReview.redraft")}
        </Button>
      </div>
    </div>
  );
}
