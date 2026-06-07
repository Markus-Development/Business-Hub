"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import type { AreaReviewState } from "@/app/api/areas/review/diff/route";

type Row = { name: string; dueDate: string; include: boolean };

const emptyRow = (): Row => ({ name: "", dueDate: "", include: true });

type SuggestArea = AreaReviewState["area"] & { base: string };

type Props = {
  department: string;
  area: SuggestArea;
  diff: {
    doneProjects: AreaReviewState["doneProjects"];
    newProjects: AreaReviewState["newProjects"];
    ongoingProjects: AreaReviewState["ongoingProjects"];
  };
  answers: Record<string, string>;
  onAdoptMilestone: (milestone: string, milestoneDue: string | null) => void;
};

// "New projects" panel inside the Areas Review step. Rows are added by the user or
// pre-filled by an on-demand AI suggestion (no fetch effect — suggest runs only on
// button click). "Create projects" POSTs the included, non-empty rows to the
// Projects DB in this area's department; AI-suggested rows merge into the same
// editable/deselectable list and never replace manually-entered rows.
export function AreaProjectsPanel({ department, area, diff, answers, onAdoptMilestone }: Props) {
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;

  const [rows, setRows] = useState<Row[]>([]);
  const [creating, setCreating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestedMilestone, setSuggestedMilestone] = useState<{
    milestone: string;
    milestoneDueDate: string | null;
  } | null>(null);
  const [milestoneAdopted, setMilestoneAdopted] = useState(false);

  const busy = creating || suggesting;

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const patchRow = useCallback((idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }, []);

  // Rows eligible to be created: included AND with a non-empty name.
  const eligibleCount = rows.filter((r) => r.include && r.name.trim().length > 0).length;

  const createProjects = useCallback(async () => {
    const payload = rows
      .map((r, i) => ({ row: r, i }))
      .filter(({ row }) => row.include && row.name.trim().length > 0)
      .map(({ row, i }) => ({
        index: i,
        name: row.name.trim(),
        dueDate: row.dueDate || null,
      }));
    if (payload.length === 0) return;

    setCreating(true);
    try {
      const res = await fetch(ROUTES.api.areas.reviewProjects, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          department,
          projects: payload.map((p) => ({ name: p.name, dueDate: p.dueDate })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "create_failed");

      const created = (data.created ?? []) as { name: string }[];
      const failed = (data.failed ?? []) as { name: string }[];

      // Drop the rows that were created successfully; keep the ones that failed
      // (matched by index → name) so the user can correct and retry.
      const createdNames = new Set(created.map((c) => c.name));
      const failedIndexes = new Set(
        payload.filter((p) => !createdNames.has(p.name)).map((p) => p.index),
      );
      setRows((prev) =>
        prev.filter((r, i) => {
          const wasSubmitted = payload.some((p) => p.index === i);
          if (!wasSubmitted) return true; // untouched rows stay
          return failedIndexes.has(i); // submitted: keep only failures
        }),
      );

      if (failed.length > 0) {
        toast.warning(tRef.current("areasReview.projects.partial"));
      } else {
        toast.success(tRef.current("areasReview.projects.success"));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("area_review_projects_failed", err);
      toast.error(tRef.current("areasReview.projects.error"));
    } finally {
      setCreating(false);
    }
  }, [rows, department]);

  // On-demand AI pre-fill. Appends the suggested projects to the existing rows
  // (merge, never replace) and surfaces the suggested milestone for explicit
  // adoption. Runs only on button click.
  const getSuggestions = useCallback(async () => {
    setSuggesting(true);
    try {
      const res = await fetch(ROUTES.api.areas.reviewSuggest, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ area, diff, answers }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "suggest_failed");

      const suggested = (data.projects ?? []) as { name: string; dueDate: string | null }[];
      if (suggested.length > 0) {
        setRows((prev) => [
          ...prev,
          ...suggested.map((p) => ({
            name: p.name,
            dueDate: p.dueDate ?? "",
            include: true,
          })),
        ]);
      }
      if (typeof data.milestone === "string" && data.milestone.trim()) {
        setSuggestedMilestone({
          milestone: data.milestone.trim(),
          milestoneDueDate: typeof data.milestoneDueDate === "string" ? data.milestoneDueDate : null,
        });
        setMilestoneAdopted(false);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("area_review_suggest_failed", err);
      toast.error(tRef.current("areasReview.projects.suggestError"));
    } finally {
      setSuggesting(false);
    }
  }, [area, diff, answers]);

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("areasReview.projects.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("areasReview.projects.hint").replace("{area}", department)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void getSuggestions()}
          disabled={busy}
          className="shrink-0"
        >
          <Sparkles className="mr-1.5 size-4" aria-hidden />
          {suggesting ? t("areasReview.projects.suggesting") : t("areasReview.projects.suggest")}
        </Button>
      </div>

      {suggestedMilestone && (
        <div className="mb-3 rounded-md border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("areasReview.suggest.milestoneTitle")}
          </p>
          <p className="mt-1 text-sm text-foreground">{suggestedMilestone.milestone}</p>
          {suggestedMilestone.milestoneDueDate && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {suggestedMilestone.milestoneDueDate}
            </p>
          )}
          <div className="mt-2">
            {milestoneAdopted ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" aria-hidden />
                {t("areasReview.suggest.adopted")}
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAdoptMilestone(
                    suggestedMilestone.milestone,
                    suggestedMilestone.milestoneDueDate,
                  );
                  setMilestoneAdopted(true);
                }}
              >
                {t("areasReview.suggest.adopt")}
              </Button>
            )}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <ul className="mb-3 space-y-2">
          {rows.map((row, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={row.include}
                onChange={() => patchRow(idx, { include: !row.include })}
                disabled={busy}
                className="size-4 shrink-0 accent-primary"
                aria-label={t("areasReview.projects.namePlaceholder")}
              />
              <Input
                value={row.name}
                onChange={(e) => patchRow(idx, { name: e.target.value })}
                placeholder={t("areasReview.projects.namePlaceholder")}
                disabled={busy}
                className="h-9 flex-1 text-sm"
              />
              <Input
                type="date"
                value={row.dueDate}
                onChange={(e) => patchRow(idx, { dueDate: e.target.value })}
                disabled={busy}
                className="h-9 w-[150px] shrink-0 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRow(idx)}
                disabled={busy}
                aria-label={t("areasReview.projects.remove")}
                title={t("areasReview.projects.remove")}
                className="size-9 shrink-0"
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={addRow} disabled={busy}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          {t("areasReview.projects.add")}
        </Button>
        <Button
          size="sm"
          onClick={() => void createProjects()}
          disabled={busy || eligibleCount === 0}
        >
          {creating ? t("areasReview.projects.creating") : t("areasReview.projects.create")}
        </Button>
      </div>
    </div>
  );
}
