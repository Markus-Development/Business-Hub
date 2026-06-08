"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  ExternalLink,
  Flag,
  Gauge,
  ListChecks,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageBodyRenderer } from "@/app/projects/_components/PageBodyRenderer";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import type { AreaUpdateField, NotionArea, NotionBlock } from "@/lib/notion";

// Strip the " (vN)" version suffix so the single-area review opens against the
// base name the diff route keys on (same rule as elsewhere in the Areas code).
const normalize = (name: string) => name.replace(/ \(v\d+\)$/, "").trim();

type Props = {
  area: NotionArea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersist: (id: string, field: AreaUpdateField, value: string) => void;
  activeProjectCount: number;
  overdueCount: number;
};

const STATUS_VALUES = ["Active", "Needs Attention", "Paused"] as const;

export function AreaDialog({
  area,
  open,
  onOpenChange,
  onPersist,
  activeProjectCount,
  overdueCount,
}: Props) {
  const t = useT();
  const [locale] = useLocale();

  const dateLong = useMemo(
    () => new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", { dateStyle: "medium" }),
    [locale],
  );

  // Same suppression rule as the card had: hide the active-project badge for
  // paused areas with zero active work; overdue badge still shows independently.
  const showActiveBadge = !(activeProjectCount === 0 && area?.status === "Paused");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="truncate pr-8 text-lg font-semibold text-foreground">
            {area?.name ?? t("areas.title")}
          </DialogTitle>
        </DialogHeader>

        {area ? (
          <div className="flex-1 overflow-y-auto">
            {(showActiveBadge || overdueCount > 0) ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
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
              </div>
            ) : null}

            <section className="space-y-0.5 border-b border-border px-5 py-3">
              <MetaRow icon={<CircleDashed className="size-3.5" />} label={t("areas.field.status")}>
                <Select
                  value={area.status ?? undefined}
                  onValueChange={(v) => onPersist(area.id, "Status", v)}
                >
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {labelForStatus(s, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </MetaRow>

              <MetaRow
                icon={<ChevronRight className="size-3.5" />}
                label={t("areas.field.currentMilestone")}
              >
                <InlineText
                  value={area.currentMilestone}
                  placeholder={t("areas.editPlaceholder")}
                  multiline={false}
                  onSave={(v) => onPersist(area.id, "Current Milestone", v)}
                />
              </MetaRow>

              <MetaRow
                icon={<CalendarDays className="size-3.5" />}
                label={t("areas.field.milestoneDueDate")}
              >
                <span className="text-sm font-mono text-muted-foreground">
                  {area.milestoneDueDate ? safeFormat(dateLong, area.milestoneDueDate) : "—"}
                </span>
              </MetaRow>

              <MetaRow
                icon={<ListChecks className="size-3.5" />}
                label={t("areas.field.nextSteps")}
              >
                <InlineText
                  value={area.nextSteps}
                  placeholder={t("areas.editPlaceholder")}
                  multiline
                  onSave={(v) => onPersist(area.id, "Next Steps", v)}
                />
              </MetaRow>

              <MetaRow icon={<Flag className="size-3.5" />} label={t("areas.field.nextFocus")}>
                <InlineText
                  value={area.nextFocus}
                  placeholder={t("areas.editPlaceholder")}
                  multiline={false}
                  onSave={(v) => onPersist(area.id, "Next Focus", v)}
                />
              </MetaRow>

              <MetaRow icon={<Target className="size-3.5" />} label={t("areas.field.goal")}>
                <InlineText
                  value={area.goal}
                  placeholder={t("areas.editPlaceholder")}
                  multiline
                  onSave={(v) => onPersist(area.id, "Goal", v)}
                />
              </MetaRow>

              <MetaRow icon={<Target className="size-3.5" />} label={t("areas.field.standard")}>
                <ReadOnly value={area.standard} />
              </MetaRow>

              <MetaRow icon={<Gauge className="size-3.5" />} label={t("areas.field.healthMetric")}>
                <ReadOnly value={area.healthMetric} />
              </MetaRow>
            </section>

            <section className="px-5 py-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("areas.drawer.pageBody")}
              </h3>
              <PageBody areaId={area.id} notionUrl={area.notionUrl} />
            </section>
          </div>
        ) : null}

        <DialogFooter className="mx-0 mb-0 flex-row items-center justify-between gap-2 border-t border-border px-5 py-3 sm:justify-between">
          {area ? (
            <a
              href={area.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              {t("areas.openInNotion")}
            </a>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {area ? (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`${ROUTES.pages.areasReview}?area=${encodeURIComponent(normalize(area.name))}`}
                >
                  <ClipboardCheck className="mr-1.5 size-3.5" aria-hidden />
                  {t("areas.drawer.reviewThis")}
                </Link>
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                {t("projects.drawer.close")}
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function labelForStatus(status: (typeof STATUS_VALUES)[number], t: ReturnType<typeof useT>): string {
  switch (status) {
    case "Active":
      return t("areas.status.active");
    case "Needs Attention":
      return t("areas.status.needsAttention");
    case "Paused":
      return t("areas.status.paused");
  }
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-1.5 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-3">
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ReadOnly({ value }: { value: string }) {
  if (!value) {
    return <span className="text-sm italic text-muted-foreground/70">—</span>;
  }
  return (
    <span className="block whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
      {value}
    </span>
  );
}

function InlineText({
  value,
  placeholder,
  multiline,
  onSave,
}: {
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
      if (!multiline || !e.shiftKey) {
        e.preventDefault();
        commit();
      }
    }
  };

  if (editing) {
    return multiline ? (
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
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "block w-full rounded-md border border-transparent px-2 py-1.5 text-left text-sm leading-relaxed transition-colors hover:bg-muted",
        value ? "text-foreground" : "italic text-muted-foreground/70",
        multiline ? "whitespace-pre-wrap" : "truncate",
      )}
      title={value || placeholder}
    >
      {value || placeholder}
    </button>
  );
}

// Lazy-fetch the Notion page body on open. Cache is per-areaId; the loop guard
// short-circuits on the *presence* of any entry (including in-flight), not on
// loaded data — matches the pattern in Standard Prompt Constraints.
function PageBody({ areaId, notionUrl }: { areaId: string; notionUrl: string }) {
  const t = useT();
  const [cache, setCache] = useState<Record<string, { state: "loading" | "loaded" | "error"; blocks: NotionBlock[] }>>(
    {},
  );

  useEffect(() => {
    if (cache[areaId]) return;
    let cancelled = false;
    setCache((prev) => ({ ...prev, [areaId]: { state: "loading", blocks: [] } }));
    fetch(ROUTES.api.areas.blocks(areaId))
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.ok) throw new Error(j?.error || "failed");
        setCache((prev) => ({
          ...prev,
          [areaId]: { state: "loaded", blocks: Array.isArray(j.blocks) ? j.blocks : [] },
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [areaId]: { state: "error", blocks: [] } }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId]);

  const entry = cache[areaId];

  if (!entry || entry.state === "loading") {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-3 w-3/4 rounded bg-muted/60" />
        <div className="h-3 w-5/6 rounded bg-muted/60" />
        <div className="h-3 w-2/3 rounded bg-muted/60" />
      </div>
    );
  }
  if (entry.state === "error") {
    return <p className="text-sm text-destructive">{t("areas.error")}</p>;
  }
  if (entry.blocks.length === 0) {
    return (
      <a
        href={notionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ExternalLink className="size-3.5" aria-hidden />
        {t("areas.openInNotion")}
      </a>
    );
  }
  return <PageBodyRenderer blocks={entry.blocks} />;
}

function safeFormat(fmt: Intl.DateTimeFormat, iso: string): string {
  try {
    return fmt.format(new Date(iso));
  } catch {
    return iso;
  }
}
