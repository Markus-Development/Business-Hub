"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import deLocale from "@fullcalendar/core/locales/de";
import enLocale from "@fullcalendar/core/locales/en-gb";
import type { EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import { useLocale, useT } from "@/lib/i18n";
import type { Project } from "@/lib/notion";
import type { Priority } from "@/constants/priorities";
import type { UpdateField } from "./api";

type Props = {
  items: Project[];
  onOpenProject: (pageId: string) => void;
  onUpdate: (pageId: string, field: UpdateField, value: string | null) => void;
};

const PRIORITY_CLASS: Record<Priority, string> = {
  High: "bh-evt-high",
  Medium: "bh-evt-medium",
  Low: "bh-evt-low",
};

export function ProjectsCalendar({ items, onOpenProject, onUpdate }: Props) {
  const t = useT();
  const [locale] = useLocale();

  const { events, undated } = useMemo(() => {
    const ev: EventInput[] = [];
    const ud: Project[] = [];
    for (const p of items) {
      if (p.dueDate) {
        ev.push({
          id: p.id,
          title: p.name || "—",
          start: p.dueDate,
          allDay: true,
          classNames: [p.priority ? PRIORITY_CLASS[p.priority] : "bh-evt-low"],
        });
      } else {
        ud.push(p);
      }
    }
    return { events: ev, undated: ud };
  }, [items]);

  const handleEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    if (info.event.id) onOpenProject(info.event.id);
  };

  const handleEventDrop = (info: EventDropArg) => {
    const pageId = info.event.id;
    const start = info.event.start;
    if (!pageId || !start) {
      info.revert();
      return;
    }
    // Format as YYYY-MM-DD in local time. Notion stores all-day dates as date-only ISO.
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, "0");
    const d = String(start.getDate()).padStart(2, "0");
    onUpdate(pageId, "Due Date", `${y}-${m}-${d}`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          locale={locale === "de" ? deLocale : enLocale}
          firstDay={1}
          height="auto"
          dayMaxEventRows={4}
          editable
          eventDurationEditable={false}
          eventResizableFromStart={false}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          headerToolbar={{ start: "title", center: "", end: "today prev,next" }}
          buttonText={{ today: t("calendar.toolbar.today") }}
        />
      </div>

      <aside className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-foreground">
            {t("projects.calendar.noDeadline")}
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {undated.length}
          </span>
        </div>
        <ul className="max-h-[640px] space-y-1 overflow-y-auto pr-1">
          {undated.length === 0 ? (
            <li className="px-2 py-4 text-center text-xs text-muted-foreground">
              {t("projects.kanban.emptyCol")}
            </li>
          ) : (
            undated.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onOpenProject(p.id)}
                  className="flex w-full items-start gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate">{p.name || "—"}</span>
                </button>
                {(p.department || p.priority) && (
                  <div className="ml-2 flex items-center gap-2 px-1 text-xs text-muted-foreground">
                    {p.department && <span>{p.department}</span>}
                    {p.priority && <span>{t(`priority.${p.priority}` as const)}</span>}
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </aside>

      <style jsx global>{`
        /* Priority colors for FullCalendar events. Solid fill, high-contrast text.
           Reds via --destructive token; neutral via --secondary/--foreground.
           Amber has no globals.css token yet — defined here as a scoped OKLCH (no hex). */
        .fc .fc-daygrid-event {
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          line-height: 1.25;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* Override FullCalendar's CSS custom properties so its own rules
           (.fc-h-event for bg, .fc-h-event .fc-event-main for text color)
           consume our palette values. Avoids fighting the cascade on the inner element. */
        .fc .fc-daygrid-event.bh-evt-high {
          --fc-event-bg-color: var(--destructive);
          --fc-event-text-color: var(--primary-foreground);
          --fc-event-border-color: var(--destructive);
        }
        .fc .fc-daygrid-event.bh-evt-high:hover {
          --fc-event-bg-color: color-mix(in oklch, var(--destructive), black 12%);
          --fc-event-border-color: color-mix(in oklch, var(--destructive), black 12%);
        }
        .fc .fc-daygrid-event.bh-evt-medium {
          --bh-cal-amber: oklch(0.68 0.16 75);
          --fc-event-bg-color: var(--bh-cal-amber);
          --fc-event-text-color: var(--primary-foreground);
          --fc-event-border-color: var(--bh-cal-amber);
        }
        .fc .fc-daygrid-event.bh-evt-medium:hover {
          --fc-event-bg-color: color-mix(in oklch, oklch(0.68 0.16 75), black 12%);
          --fc-event-border-color: color-mix(in oklch, oklch(0.68 0.16 75), black 12%);
        }
        .fc .fc-daygrid-event.bh-evt-low {
          --fc-event-bg-color: var(--secondary);
          --fc-event-text-color: var(--foreground);
          --fc-event-border-color: var(--border);
        }
        .fc .fc-daygrid-event.bh-evt-low:hover {
          --fc-event-bg-color: var(--muted);
        }
        .fc .fc-daygrid-event .fc-event-title {
          font-weight: 500;
        }
        .fc .fc-toolbar-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--foreground);
        }
        .fc .fc-button {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--foreground);
          box-shadow: none;
          text-transform: none;
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .fc .fc-button:hover {
          background: var(--muted);
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background: var(--primary);
          border-color: var(--primary);
          color: var(--primary-foreground);
        }
        .fc .fc-col-header-cell-cushion,
        .fc .fc-daygrid-day-number {
          color: var(--muted-foreground);
          text-decoration: none;
        }
        .fc .fc-day-today {
          background: color-mix(in oklch, var(--primary) 6%, transparent) !important;
        }
        .fc-theme-standard td,
        .fc-theme-standard th,
        .fc-theme-standard .fc-scrollgrid {
          border-color: var(--border);
        }
      `}</style>
    </div>
  );
}
