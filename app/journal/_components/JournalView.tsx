"use client";

import { useMemo, useState } from "react";
import { NotebookPen, ChevronLeft, ChevronRight, AlertTriangle, ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { JOURNAL_NOTION_DB_URL } from "@/constants/journal";
import {
  computeOverdue,
  mondayOf,
  addDaysIso,
  erfolgeForWeek,
  weekRangeLabel,
  type JournalWeek,
  type Erfolg,
} from "@/lib/journal";
import { WeekKanban } from "./WeekKanban";
import { AreaTimeline } from "./AreaTimeline";

type Props = {
  weeks: JournalWeek[];
  erfolge: Erfolg[];
  notConfigured?: boolean;
  error?: boolean;
};

type Mode = "week" | "timeline";

// Today's LOCAL calendar date as YYYY-MM-DD — computed at the edge (the one place
// the wall clock is read) and passed into the pure helpers as an ISO param.
function localTodayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function JournalView({ weeks, erfolge, notConfigured, error }: Props) {
  const t = useT();

  const todayIso = useMemo(() => localTodayIso(), []);
  const overdue = useMemo(() => computeOverdue({ weeks, todayIso }), [weeks, todayIso]);

  const [mode, setMode] = useState<Mode>("week");
  const [selectedMonday, setSelectedMonday] = useState<string>(() => mondayOf(todayIso));

  const selectedWeek = useMemo(
    () => weeks.find((w) => w.weekStart === selectedMonday) ?? null,
    [weeks, selectedMonday],
  );
  const weekWins = useMemo(
    () => (selectedWeek ? erfolgeForWeek(erfolge, selectedWeek.id) : []),
    [erfolge, selectedWeek],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
          <NotebookPen className="size-5 text-primary" aria-hidden />
          {t("journal.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("journal.subtitle")}</p>
      </div>

      {notConfigured ? (
        <p className="text-sm text-muted-foreground">{t("journal.notConfigured")}</p>
      ) : error ? (
        <p className="text-sm text-destructive">{t("journal.error")}</p>
      ) : (
        <>
          {overdue.ueberfaellig && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300/60 bg-amber-500/10 px-4 py-3 dark:border-amber-800/50">
              <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t("journal.overdue.title")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("journal.overdue.body").replace("{kw}", overdue.fehlendeKw)}
                </p>
              </div>
              <a
                href={JOURNAL_NOTION_DB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                {t("journal.overdue.cta")}
              </a>
            </div>
          )}

          {/* Mode toggle */}
          <div className="inline-flex rounded-md border border-border bg-card p-0.5">
            {(["week", "timeline"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === m
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(m === "week" ? "journal.view.week" : "journal.view.timeline")}
              </button>
            ))}
          </div>

          {mode === "week" ? (
            <div className="space-y-4">
              {/* Week switcher */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-label={t("journal.week.prev")}
                  onClick={() => setSelectedMonday((m) => addDaysIso(m, -7))}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={t("journal.week.next")}
                  onClick={() => setSelectedMonday((m) => addDaysIso(m, 7))}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMonday(mondayOf(todayIso))}
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {t("journal.week.today")}
                </button>
                <span className="ml-1 font-mono text-sm font-medium text-foreground">
                  {weekRangeLabel(selectedMonday)}
                </span>
                {selectedWeek?.status && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {t("journal.week.statusBadge").replace("{status}", selectedWeek.status)}
                  </span>
                )}
              </div>

              {!selectedWeek && (
                <p className="text-sm text-muted-foreground">{t("journal.week.noEntry")}</p>
              )}

              <WeekKanban wins={weekWins} />
            </div>
          ) : (
            <AreaTimeline erfolge={erfolge} weeks={weeks} />
          )}
        </>
      )}
    </div>
  );
}
