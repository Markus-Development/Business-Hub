"use client";

import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/constants/translations";

// The three milestone choices. "keep" carries the current milestone forward
// unchanged; "reached" logs the old one in Accomplishments and sets a new one;
// "adjust" refines the wording without logging a reached bullet.
export const MILESTONE_STATUSES = ["keep", "reached", "adjust"] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

const STATUS_LABEL_KEYS: Record<MilestoneStatus, TranslationKey> = {
  keep: "areasReview.milestone.keep",
  reached: "areasReview.milestone.reached",
  adjust: "areasReview.milestone.adjust",
};

type Props = {
  // Current milestone value (read-only, shown at the top).
  current: string;
  // Current answer state.
  status: string;
  milestone: string;
  onStatusChange: (status: MilestoneStatus) => void;
  onMilestoneChange: (value: string) => void;
};

// Dedicated milestone input for the review step: shows the current milestone
// read-only, then a clear keep / reached / adjust choice with a context-specific
// text field. Lives in its own file so ReviewWizard stays lean.
export function MilestoneField({
  current,
  status,
  milestone,
  onStatusChange,
  onMilestoneChange,
}: Props) {
  const t = useT();
  const active: MilestoneStatus = (MILESTONE_STATUSES as readonly string[]).includes(status)
    ? (status as MilestoneStatus)
    : "keep";

  // Switching the choice resets the text field to the right starting point so the
  // user is never confused about what the value means.
  const selectStatus = (next: MilestoneStatus) => {
    onStatusChange(next);
    if (next === "reached") onMilestoneChange("");
    else if (next === "adjust") onMilestoneChange(current);
    // keep: text field is hidden; the draft uses the current milestone.
  };

  return (
    <div className="space-y-2">
      <div>
        <span className="mb-1 block text-sm text-foreground">
          {t("areasReview.q.milestone")}
        </span>
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("areasReview.milestone.current")}
          </span>
          {current ? (
            <span className="mt-0.5 block text-sm text-foreground">{current}</span>
          ) : (
            <span className="mt-0.5 block text-sm italic text-muted-foreground/70">
              {t("areasReview.milestone.none")}
            </span>
          )}
        </div>
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-md border border-border bg-background p-1">
        {MILESTONE_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => selectStatus(s)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              active === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t(STATUS_LABEL_KEYS[s])}
          </button>
        ))}
      </div>

      {active === "reached" && (
        <div>
          <span className="mb-1 block text-sm text-foreground">
            {t("areasReview.milestone.newLabel")}
          </span>
          <Input
            value={milestone}
            onChange={(e) => onMilestoneChange(e.target.value)}
            className="h-9 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t("areasReview.milestone.reachedHint")}
          </p>
        </div>
      )}

      {active === "adjust" && (
        <div>
          <span className="mb-1 block text-sm text-foreground">
            {t("areasReview.milestone.newLabel")}
          </span>
          <Input
            value={milestone}
            onChange={(e) => onMilestoneChange(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      )}
    </div>
  );
}
