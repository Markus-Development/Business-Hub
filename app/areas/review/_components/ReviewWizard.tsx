"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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

type T = (key: TranslationKey) => string;

// Status options mirror AREA_STATUSES in lib/notion-areas (server-only, so the
// list is repeated here for the client). Labels reuse the areas.status.* keys.
const STATUS_OPTIONS: { value: string; labelKey: TranslationKey }[] = [
  { value: "Active", labelKey: "areas.status.active" },
  { value: "Needs Attention", labelKey: "areas.status.needsAttention" },
  { value: "Paused", labelKey: "areas.status.paused" },
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

  const [areas, setAreas] = useState<AreaReviewState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);

  // answers[areaId][questionId] = value
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftPayload>>({});
  const [written, setWritten] = useState<Set<string>>(new Set());
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
        if (!cancelled) setAreas(data.areas as AreaReviewState[]);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notConfigured]);

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
      const warnings = (data.warnings ?? []) as string[];
      if (warnings.length > 0) {
        toast.warning(`${tRef.current("areasReview.warnings")}: ${warnings.length}`);
      } else {
        toast.success(tRef.current("areasReview.writeSuccess"));
      }
      goNext();
    } catch {
      toast.error(tRef.current("areasReview.writeError"));
    } finally {
      setWriting(false);
    }
  }, [current, currentDraft, goNext]);

  // --- render -------------------------------------------------------------
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
      <Shell t={t}>
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
    <Shell t={t}>
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
              {current.questions.map((q) => (
                <QuestionField
                  key={q.id}
                  q={q}
                  t={t}
                  value={areaAnswers[q.id] ?? ""}
                  onChange={(v) => setAnswer(current.area.id, q.id, v)}
                />
              ))}
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
      </section>
    </Shell>
  );
}

function Shell({ t, children }: { t: T; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <header className="mb-5">
        <Link
          href={ROUTES.pages.areas}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("areasReview.back")}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-foreground">{t("areasReview.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("areasReview.subtitle")}</p>
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
            <li key={p.id} className="truncate text-xs text-muted-foreground">
              <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-foreground">
                {p.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuestionField({
  q,
  t,
  value,
  onChange,
}: {
  q: ReviewQuestion;
  t: T;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = t(q.labelKey);
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-foreground">{label}</span>
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
