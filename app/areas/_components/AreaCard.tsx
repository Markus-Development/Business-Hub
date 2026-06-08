"use client";

import { type KeyboardEvent, type ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NotionArea } from "@/lib/notion";

type Props = {
  area: NotionArea;
  onOpen: () => void;
};

// Status-based card backgrounds — at-a-glance health signal. Matches the
// Clients-tab health-pill palette (emerald/amber/muted).
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

// Traffic-light dot colour for the status indicator.
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

export function AreaCard({ area, onOpen }: Props) {
  const t = useT();

  const formattedDue = area.milestoneDueDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(area.milestoneDueDate),
      )
    : null;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKey}
      className={cn(
        "group flex cursor-pointer flex-col gap-3 rounded-xl border p-5 shadow-sm transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        cardTone(area.status),
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-left text-lg font-medium text-foreground">{area.name}</h3>
        <StatusLight status={area.status} />
      </header>

      <div>
        <FieldLabel>{t("areas.field.currentMilestone")}</FieldLabel>
        {area.currentMilestone ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-foreground">
            {area.currentMilestone}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/70">{t("areas.noMilestone")}</p>
        )}
      </div>

      {formattedDue ? (
        <div>
          <FieldLabel>{t("areas.field.milestoneDue")}</FieldLabel>
          <span className="text-sm text-foreground">{formattedDue}</span>
        </div>
      ) : null}
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

// Prominent traffic-light status: filled coloured dot + label.
function StatusLight({ status }: { status: string | null }) {
  const t = useT();
  if (!status) return null;
  let label: string;
  switch (status) {
    case "Active":
      label = t("areas.status.active");
      break;
    case "Needs Attention":
      label = t("areas.status.needsAttention");
      break;
    case "Paused":
      label = t("areas.status.paused");
      break;
    default:
      label = status;
  }
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-foreground"
      aria-label={t("areas.field.status") + ": " + label}
    >
      <span
        className={cn("inline-block size-2.5 rounded-full", dotTone(status))}
        aria-hidden
      />
      {label}
    </span>
  );
}
