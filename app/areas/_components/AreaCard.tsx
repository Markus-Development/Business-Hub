"use client";

import { type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import type { NotionArea } from "@/lib/notion";
import { iconForArea } from "./area-icons";
import { normalizeAreaName } from "./normalize";

type Props = {
  area: NotionArea;
  activeProjectCount: number;
  overdueCount: number;
  onOpen: () => void;
};

// Status-tinted header band — at-a-glance health signal. Matches the Clients-tab
// health-pill palette (emerald/amber/muted).
function bandTone(status: string | null): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-800/40";
    case "Needs Attention":
      return "bg-amber-500/10 border-amber-200/50 dark:border-amber-800/40";
    case "Paused":
      return "bg-muted/40 border-border";
    default:
      return "bg-card border-border";
  }
}

// Tinted icon-tile background, sharing the status palette.
function iconTileTone(status: string | null): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "Needs Attention":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "Paused":
    default:
      return "bg-muted text-muted-foreground";
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

export function AreaCard({ area, activeProjectCount, overdueCount, onOpen }: Props) {
  const t = useT();

  const baseName = normalizeAreaName(area.name);
  const Icon = iconForArea(baseName);

  const formattedDue = area.milestoneDueDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(area.milestoneDueDate),
      )
    : null;

  // Hide the active-project chip for paused areas with zero active work; the
  // overdue chip still shows independently. (Same rule as the dialog.)
  const showActiveChip = !(activeProjectCount === 0 && area.status === "Paused");

  const departmentHref = `${ROUTES.pages.projects}?department=${encodeURIComponent(baseName)}`;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  // Stop chip-link clicks from also opening the card dialog.
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKey}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <header
        className={cn(
          "flex items-center justify-between gap-3 border-b px-4 py-3",
          bandTone(area.status),
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md",
              iconTileTone(area.status),
            )}
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
          <h3 className="truncate text-left text-base font-medium text-foreground">
            {baseName}
          </h3>
        </div>
        <StatusLight status={area.status} />
      </header>

      <div className="flex flex-1 flex-col gap-3 p-4">
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

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {showActiveChip ? (
            <Link
              href={departmentHref}
              onClick={stop}
              className={cn(
                "inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-muted",
                activeProjectCount === 0 ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {t("areas.activeProjects").replace("{count}", String(activeProjectCount))}
            </Link>
          ) : null}

          {overdueCount > 0 ? (
            <Link
              href={departmentHref}
              onClick={stop}
              className="inline-flex items-center rounded-full border border-red-200/50 bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-500/25 dark:text-red-300"
            >
              {t("areas.overdueProjects").replace("{count}", String(overdueCount))}
            </Link>
          ) : null}

          {formattedDue ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" aria-hidden />
              {formattedDue}
            </span>
          ) : null}
        </div>
      </div>
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
