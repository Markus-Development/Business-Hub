"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { AreaUpdateField, NotionArea } from "@/lib/notion";

type Props = {
  area: NotionArea;
  activeProjectCount: number;
  onOpen: () => void;
  onPersist: (field: AreaUpdateField, value: string) => void;
};

export function AreaCard({ area, activeProjectCount, onOpen, onPersist }: Props) {
  const t = useT();

  return (
    <div
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-border/80"
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

      <footer className="mt-1 flex items-center justify-between gap-3">
        <Link
          href={`${ROUTES.pages.projects}?area=${encodeURIComponent(area.name)}`}
          className={cn(
            "inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium transition-colors hover:bg-muted",
            activeProjectCount === 0 ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {t("areas.activeProjects").replace("{count}", String(activeProjectCount))}
        </Link>
      </footer>
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
