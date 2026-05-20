"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { AreaUpdateField, NotionArea } from "@/lib/notion";

type Props = {
  area: NotionArea;
  activeProjectCount: number;
  overdueCount: number;
  onOpen: () => void;
  onPersist: (field: AreaUpdateField, value: string) => void;
};

// Status-based card backgrounds — at-a-glance health signal without opening
// the drawer. Matches the Clients-tab health-pill palette (emerald/amber/muted).
function cardTone(status: string | null): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500/8 border-emerald-200/50 dark:border-emerald-800/40";
    case "Needs Attention":
      return "bg-amber-500/8 border-amber-200/50 dark:border-amber-800/40";
    case "Paused":
      return "bg-muted/30 border-border";
    default:
      return "bg-card border-border";
  }
}

function dotTone(status: string | null): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500";
    case "Needs Attention":
      return "bg-amber-500";
    case "Paused":
    default:
      return "bg-muted-foreground";
  }
}

export function AreaCard({
  area,
  activeProjectCount,
  overdueCount,
  onOpen,
  onPersist,
}: Props) {
  const t = useT();

  // Hide the active-project badge for paused areas with zero active work — the
  // count is uninformative and clutters the footer. Overdue badge still shows
  // independently if there happens to be any.
  const showActiveBadge = !(activeProjectCount === 0 && area.status === "Paused");

  const formattedDue = area.milestoneDueDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(area.milestoneDueDate),
      )
    : null;

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-xl border p-5 shadow-sm transition-colors",
        cardTone(area.status),
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="text-left text-lg font-medium text-foreground hover:underline"
        >
          {area.name}
        </button>
        <StatusPill status={area.status} />
      </header>

      <InlineField
        label={t("areas.field.currentMilestone")}
        value={area.currentMilestone}
        placeholder={t("areas.noMilestone")}
        multiline={false}
        onSave={(v) => onPersist("Current Milestone", v)}
      />

      <InlineField
        label={t("areas.field.nextSteps")}
        value={area.nextSteps}
        placeholder={t("areas.noNextSteps")}
        multiline
        onSave={(v) => onPersist("Next Steps", v)}
      />

      {formattedDue ? (
        <div>
          <FieldLabel>{t("areas.field.milestoneDue")}</FieldLabel>
          <span className="text-sm text-foreground">{formattedDue}</span>
        </div>
      ) : null}

      {area.nextFocus ? (
        <div>
          <FieldLabel>{t("areas.field.nextFocus")}</FieldLabel>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {area.nextFocus}
          </p>
        </div>
      ) : null}

      {area.healthMetric ? (
        <div>
          <FieldLabel>{t("areas.field.healthMetric")}</FieldLabel>
          <div className="flex items-start gap-2">
            <span
              className={cn("mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full", dotTone(area.status))}
              aria-hidden
            />
            <p className="line-clamp-2 text-sm text-muted-foreground">{area.healthMetric}</p>
          </div>
        </div>
      ) : null}

      <footer className="mt-1 flex flex-wrap items-center gap-2">
        {showActiveBadge ? (
          <Link
            href={`${ROUTES.pages.projects}?department=${encodeURIComponent(area.name)}`}
            className={cn(
              "inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium transition-colors hover:bg-muted",
              activeProjectCount === 0 ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {t("areas.activeProjects").replace("{count}", String(activeProjectCount))}
          </Link>
        ) : null}
        {overdueCount > 0 ? (
          <Link
            href={`${ROUTES.pages.projects}?department=${encodeURIComponent(area.name)}`}
            className="inline-flex items-center rounded-full border border-red-200/50 bg-red-500/15 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/25 dark:text-red-300"
          >
            {t("areas.overdueProjects").replace("{count}", String(overdueCount))}
          </Link>
        ) : null}
      </footer>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      <span>{children}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const t = useT();
  if (!status) return null;
  let tone: string;
  let label: string;
  switch (status) {
    case "Active":
      tone = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
      label = t("areas.status.active");
      break;
    case "Needs Attention":
      tone = "bg-amber-500/15 text-amber-700 dark:text-amber-300";
      label = t("areas.status.needsAttention");
      break;
    case "Paused":
      tone = "bg-muted text-muted-foreground";
      label = t("areas.status.paused");
      break;
    default:
      tone = "bg-muted text-muted-foreground";
      label = status;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function InlineField({
  label,
  value,
  placeholder,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  multiline: boolean;
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.key === "Enter") {
      // Single-line: Enter commits. Multiline: Enter commits, Shift+Enter inserts a newline.
      if (!multiline || !e.shiftKey) {
        e.preventDefault();
        commit();
      }
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <Pencil
          size={12}
          aria-hidden
          className="opacity-0 transition-opacity group-hover:opacity-60"
        />
      </div>
      {editing ? (
        multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
            rows={Math.max(2, draft.split("\n").length)}
            className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-sm leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            "w-full rounded-md border border-transparent px-2 py-1.5 text-left text-sm leading-relaxed transition-colors hover:bg-muted",
            value ? "text-foreground" : "italic text-muted-foreground/70",
            multiline ? "whitespace-pre-wrap" : "truncate",
          )}
          title={value || placeholder}
        >
          {value || placeholder}
        </button>
      )}
    </div>
  );
}
