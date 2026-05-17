"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleDashed,
  Clock,
  ExternalLink,
  Flag,
  LayoutGrid,
  Target,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionSuggester } from "./ActionSuggester";
import { PageBodyRenderer } from "./PageBodyRenderer";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PRIORITIES, STATUSES } from "@/constants/priorities";
import { AREAS } from "@/constants/areas";
import { ROUTES } from "@/constants/routes";
import type { NotionBlock, Project } from "@/lib/notion";
import type { UpdateField } from "./api";

type Props = {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (pageId: string, field: UpdateField, value: string | null) => void;
};

export function ProjectDrawer({ project, open, onOpenChange, onUpdate }: Props) {
  const t = useT();
  const [locale] = useLocale();

  const dateLong = useMemo(
    () => new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", { dateStyle: "medium" }),
    [locale],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[min(90vw,1400px)] flex-col gap-0 p-0 sm:max-w-[min(90vw,1400px)]"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="sr-only">{t("projects.drawer.title")}</SheetTitle>
          {project ? (
            <NameEditor project={project} onSave={(v) => onUpdate(project.id, "Name", v)} />
          ) : null}
        </SheetHeader>

        {project ? (
          <div className="flex-1 overflow-y-auto">
            <section className="space-y-0.5 border-b border-border px-5 py-3">
              <MetaRow icon={<CircleDashed className="size-3.5" />} label={t("projects.col.status")}>
                <Select
                  value={project.status ?? undefined}
                  onValueChange={(v) => onUpdate(project.id, "Status", v)}
                >
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`status.${s}` as const)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </MetaRow>

              <MetaRow icon={<LayoutGrid className="size-3.5" />} label={t("projects.col.area")}>
                <Select
                  value={project.area ?? undefined}
                  onValueChange={(v) => onUpdate(project.id, "Area", v)}
                >
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue placeholder={t("projects.cell.noArea")} />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </MetaRow>

              <MetaRow icon={<Flag className="size-3.5" />} label={t("projects.col.priority")}>
                <Select
                  value={project.priority ?? undefined}
                  onValueChange={(v) => onUpdate(project.id, "Priority", v)}
                >
                  <SelectTrigger className="h-8 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t(`priority.${p}` as const)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </MetaRow>

              <MetaRow icon={<CalendarDays className="size-3.5" />} label={t("projects.col.dueDate")}>
                <input
                  type="date"
                  defaultValue={project.dueDate ?? ""}
                  key={project.id + (project.dueDate ?? "")}
                  onChange={(e) => onUpdate(project.id, "Due Date", e.target.value || null)}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </MetaRow>

              <MetaRow icon={<ChevronRight className="size-3.5" />} label={t("projects.col.nextAction")}>
                <TextEditor
                  value={project.nextAction}
                  placeholder={t("projects.cell.addNextAction")}
                  onSave={(v) => onUpdate(project.id, "Next Action", v)}
                />
              </MetaRow>

              <MetaRow icon={<Clock className="size-3.5" />} label={t("projects.drawer.estimated")}>
                <span className="text-sm text-foreground font-mono">
                  {project.estimatedMinutes != null
                    ? `${project.estimatedMinutes} ${t("projects.drawer.minutes")}`
                    : "—"}
                </span>
              </MetaRow>

              <MetaRow icon={<User className="size-3.5" />} label={t("projects.drawer.client")}>
                <span className="text-sm text-foreground">{project.client || "—"}</span>
              </MetaRow>

              <MetaRow icon={<Target className="size-3.5" />} label={t("projects.drawer.outcome")}>
                {project.outcome ? (
                  <span className="block whitespace-pre-wrap text-sm text-muted-foreground">
                    {project.outcome}
                  </span>
                ) : (
                  <span className="text-sm italic text-muted-foreground/70">
                    {t("projects.drawer.noOutcome")}
                  </span>
                )}
              </MetaRow>

              {project.createdAt && (
                <MetaRow icon={<CalendarDays className="size-3.5" />} label={t("projects.drawer.created")}>
                  <span className="text-sm font-mono text-muted-foreground">
                    {safeFormat(dateLong, project.createdAt)}
                  </span>
                </MetaRow>
              )}
            </section>

            <section className="px-5 py-4">
              <PageBody pageId={project.id} notionUrl={project.url} />
            </section>

            {project && (
              <div className="px-5 pb-4">
                <ActionSuggester
                  project={{
                    id: project.id,
                    name: project.name,
                    area: project.area,
                    priority: project.priority,
                    dueDate: project.dueDate,
                    nextAction: project.nextAction,
                    estimatedMinutes: project.estimatedMinutes,
                  }}
                  onAccept={(step) => onUpdate(project.id, "Next Action", step)}
                />
              </div>
            )}
          </div>
        ) : null}

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border px-5 py-3 sm:justify-between">
          {project ? (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              {t("projects.drawer.openInNotion")}
            </a>
          ) : (
            <span />
          )}
          <SheetClose asChild>
            <Button variant="outline" size="sm">
              {t("projects.drawer.close")}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
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
    <div className="grid grid-cols-[140px_1fr] items-center gap-3 py-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function NameEditor({
  project,
  onSave,
}: {
  project: Project;
  onSave: (next: string) => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);

  useEffect(() => {
    setDraft(project.name);
    setEditing(false);
  }, [project.id, project.name]);

  if (editing) {
    const commit = () => {
      if (draft !== project.name) onSave(draft);
      setEditing(false);
    };
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setDraft(project.name);
            setEditing(false);
          }
        }}
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "w-full truncate rounded px-2 py-1 text-left text-lg font-semibold transition-colors hover:bg-muted",
        project.name ? "text-foreground" : "text-muted-foreground/70",
      )}
    >
      {project.name || t("projects.cell.addName")}
    </button>
  );
}

function TextEditor({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (editing) {
    const commit = () => {
      if (draft !== value) onSave(draft);
      setEditing(false);
    };
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="block w-full truncate rounded-md border border-transparent px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
      title={value}
    >
      {value || <span className="text-muted-foreground/70">{placeholder}</span>}
    </button>
  );
}

function PageBody({ pageId, notionUrl }: { pageId: string; notionUrl: string }) {
  const t = useT();
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [blocks, setBlocks] = useState<NotionBlock[]>([]);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    setState("loading");
    setBlocks([]);
    fetch(ROUTES.api.projects.blocks(pageId), { signal: ac.signal })
      .then((r) => r.json())
      .then((j) => {
        if (ac.signal.aborted) return;
        if (!j?.ok) throw new Error(j?.error || "failed");
        setBlocks(Array.isArray(j.blocks) ? j.blocks : []);
        setState("loaded");
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        if (e?.name === "AbortError") return;
        setState("error");
      });
    return () => ac.abort();
  }, [pageId, retryTick]);

  if (state === "loading") {
    return <p className="text-sm text-muted-foreground">{t("blocks.loading")}</p>;
  }
  if (state === "error") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">{t("blocks.error")}</p>
        <Button variant="outline" size="sm" onClick={() => setRetryTick((n) => n + 1)}>
          {t("blocks.retry")}
        </Button>
      </div>
    );
  }
  if (blocks.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm italic text-muted-foreground">{t("blocks.empty")}</p>
        <a
          href={notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          {t("projects.drawer.openInNotion")}
        </a>
      </div>
    );
  }
  return <PageBodyRenderer blocks={blocks} />;
}

function safeFormat(fmt: Intl.DateTimeFormat, iso: string): string {
  try {
    return fmt.format(new Date(iso));
  } catch {
    return iso;
  }
}
