"use client";

import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ExternalLink, GripVertical } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { STATUSES, type Priority, type Status } from "@/constants/priorities";
import type { Project } from "@/lib/notion";
import type { UpdateField } from "./api";

type Props = {
  items: Project[];
  onUpdate: (pageId: string, field: UpdateField, value: string | null) => void;
  onOpenProject: (pageId: string) => void;
};

const PRIORITY_DOT: Record<Priority, string> = {
  High: "bh-pri-high",
  Medium: "bh-pri-medium",
  Low: "bh-pri-low",
};

export function ProjectsKanban({ items, onUpdate, onOpenProject }: Props) {
  const t = useT();
  const [locale] = useLocale();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
        month: "short",
        day: "2-digit",
      }),
    [locale],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grouped = useMemo(() => {
    const g: Record<Status, Project[]> = { Active: [], "On Hold": [], Done: [] };
    for (const p of items) {
      if (p.status && (STATUSES as readonly string[]).includes(p.status)) {
        g[p.status].push(p);
      }
    }
    return g;
  }, [items]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const pageId = String(active.id);
    const targetStatus = String(over.id) as Status;
    if (!(STATUSES as readonly string[]).includes(targetStatus)) return;
    const current = items.find((p) => p.id === pageId);
    if (!current || current.status === targetStatus) return;
    onUpdate(pageId, "Status", targetStatus);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-3 gap-4">
        {STATUSES.map((s) => (
          <KanbanColumn
            key={s}
            status={s}
            items={grouped[s]}
            label={t(`status.${s}` as const)}
            emptyLabel={t("projects.kanban.emptyCol")}
            dateFormatter={dateFormatter}
            onOpenProject={onOpenProject}
            t={t}
          />
        ))}
      </div>

      <style jsx global>{`
        .bh-pri-high { background: var(--destructive); }
        .bh-pri-medium { background: oklch(0.68 0.16 75); }
        .bh-pri-low { background: var(--muted-foreground); opacity: 0.55; }
      `}</style>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  items,
  label,
  emptyLabel,
  dateFormatter,
  onOpenProject,
  t,
}: {
  status: Status;
  items: Project[];
  label: string;
  emptyLabel: string;
  dateFormatter: Intl.DateTimeFormat;
  onOpenProject: (pageId: string) => void;
  t: (key: any) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[400px] space-y-2 rounded-xl border border-dashed border-border bg-card/40 p-2 transition-colors",
          isOver && "border-primary/50 bg-primary/5",
        )}
      >
        {items.map((p) => (
          <KanbanCard
            key={p.id}
            project={p}
            dateFormatter={dateFormatter}
            onOpenProject={onOpenProject}
            t={t}
          />
        ))}
        {items.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  project,
  dateFormatter,
  onOpenProject,
  t,
}: {
  project: Project;
  dateFormatter: Intl.DateTimeFormat;
  onOpenProject: (pageId: string) => void;
  t: (key: any) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  let dueLabel: string | null = null;
  if (project.dueDate) {
    try {
      dueLabel = dateFormatter.format(new Date(project.dueDate));
    } catch {
      dueLabel = project.dueDate;
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow",
        isDragging
          ? "cursor-grabbing opacity-50 shadow-md"
          : "cursor-grab hover:shadow-md active:cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-1.5">
        <span
          aria-hidden
          className="mt-0.5 text-muted-foreground/60"
        >
          <GripVertical className="size-3.5" />
        </span>
        <button
          type="button"
          onClick={() => onOpenProject(project.id)}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {project.name || "—"}
            </span>
            {project.priority && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <span className={cn("size-1.5 rounded-full", PRIORITY_DOT[project.priority])} />
                {t(`priority.${project.priority}` as const)}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {project.area && <span>{project.area}</span>}
            {dueLabel && <span className="font-mono">{dueLabel}</span>}
          </div>
          {project.nextAction && (
            <div className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {project.nextAction}
            </div>
          )}
        </button>
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open in Notion"
          className="shrink-0 rounded p-1 text-muted-foreground/60 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
        >
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </div>
  );
}
