"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import deLocale from "@fullcalendar/core/locales/de";
import enLocale from "@fullcalendar/core/locales/en-gb";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { EventDialog, type EventDraft, type EventEdit } from "./EventDialog";
import { PendingSuggestionDialog, type PendingSuggestion } from "./PendingSuggestionPopover";

type CalendarEvent = {
  id: string;
  summary: string;
  description: string | null;
  start: string | null;
  end: string | null;
  htmlLink: string | null;
};

type ViewKey = "timeGridDay" | "timeGridWeek" | "dayGridMonth";

type ProjectOption = { id: string; name: string };

type Range = { start: string; end: string };

const VIEW_STORAGE_KEY = "bh.calendar.view";
const SUGGESTION_PREFIX = "pending:";

function isViewKey(v: string): v is ViewKey {
  return v === "timeGridDay" || v === "timeGridWeek" || v === "dayGridMonth";
}

function toInputDateTime(iso: string): string {
  // datetime-local expects "YYYY-MM-DDTHH:mm" in the user's local time.
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromInputDateTime(value: string): string {
  // datetime-local returns "YYYY-MM-DDTHH:mm"; treat as local time and produce UTC ISO.
  return new Date(value).toISOString();
}

export function CalendarView({
  connected,
  projectOptions,
}: {
  connected: boolean;
  projectOptions: ProjectOption[];
}) {
  const t = useT();
  const [locale] = useLocale();

  const [view, setView] = useState<ViewKey>("timeGridWeek");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pending, setPending] = useState<PendingSuggestion[]>([]);
  const [range, setRange] = useState<Range | null>(null);

  const [dialogMode, setDialogMode] = useState<"closed" | "create" | "edit">("closed");
  const [dialogCreateDefaults, setDialogCreateDefaults] = useState<EventDraft | null>(null);
  const [dialogEditEvent, setDialogEditEvent] = useState<EventEdit | null>(null);
  const [pendingDialog, setPendingDialog] = useState<PendingSuggestion | null>(null);
  // Custom toolbar drives FullCalendar imperatively. The label is what FC reports for
  // the current view (e.g. "May 13 – 19, 2026") so it stays accurate across all views.
  const [toolbarLabel, setToolbarLabel] = useState<string>("");

  // Refs:
  // - calendarRef: imperative handle for prev/next/today/changeView from our custom toolbar.
  // - tRef: keep latest t in a ref so mount-only fetch effects don't refetch on locale toggle.
  const calendarRef = useRef<FullCalendar | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  // Restore persisted view on mount (avoids SSR/CSR mismatch).
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (v && isViewKey(v)) setView(v);
    } catch {
      /* ignore */
    }
  }, []);

  const changeView = useCallback((next: ViewKey) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    // Drive the FC api directly so the view switch is in-place rather than via
    // the `key`-based remount fallback. Falls back gracefully if the ref isn't set.
    const api = calendarRef.current?.getApi();
    api?.changeView(next);
  }, []);

  // Imperative toolbar handlers. Wrap getApi() calls so a missing ref doesn't crash.
  const goPrev = useCallback(() => calendarRef.current?.getApi().prev(), []);
  const goNext = useCallback(() => calendarRef.current?.getApi().next(), []);
  const goToday = useCallback(() => calendarRef.current?.getApi().today(), []);

  const loadEvents = useCallback(async (r: Range) => {
    try {
      const url = `${ROUTES.api.calendar.events}?start=${encodeURIComponent(
        r.start,
      )}&end=${encodeURIComponent(r.end)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const body = (await res.json()) as { events: CalendarEvent[] };
      setEvents(body.events);
    } catch (err) {
      toast.error(tRef.current("calendar.errorLoad"));
      // eslint-disable-next-line no-console
      console.error("calendar_events_load_failed", err);
    }
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const res = await fetch(ROUTES.api.digest.timeblocks, { cache: "no-store" });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const body = (await res.json()) as { suggestions: PendingSuggestion[] };
      setPending(body.suggestions);
    } catch (err) {
      toast.error(tRef.current("calendar.errorLoadPending"));
      // eslint-disable-next-line no-console
      console.error("calendar_pending_load_failed", err);
    }
  }, []);

  // Load pending suggestions once on mount (today only); they don't depend on view range.
  useEffect(() => {
    if (!connected) return;
    void loadPending();
  }, [connected, loadPending]);

  // Refetch events when the visible range changes.
  useEffect(() => {
    if (!connected || !range) return;
    void loadEvents(range);
  }, [connected, range, loadEvents]);

  const fcEvents = useMemo<EventInput[]>(() => {
    const real: EventInput[] = events
      .filter((e) => e.start)
      .map((e) => ({
        id: e.id,
        title: e.summary,
        start: e.start ?? undefined,
        end: e.end ?? undefined,
        extendedProps: { description: e.description, htmlLink: e.htmlLink },
      }));
    // Pending suggestions carry a className so the scoped calendar.css can paint them
    // with the muted/dashed style. Inline backgroundColor stayed in place historically
    // but was being overridden by the new high-specificity primary-blue rule.
    const suggested: EventInput[] = pending.map((s) => ({
      id: `${SUGGESTION_PREFIX}${s.id}`,
      title: `⏳ ${s.project_name}`,
      start: s.start_at,
      end: s.end_at,
      className: "bh-pending-event",
      extendedProps: { suggestionId: s.id, status: "pending" as const },
    }));
    return [...real, ...suggested];
  }, [events, pending]);

  const handleSelect = useCallback((arg: DateSelectArg) => {
    setDialogCreateDefaults({
      summary: "",
      description: "",
      start: toInputDateTime(arg.start.toISOString()),
      end: toInputDateTime(arg.end.toISOString()),
      notionProjectId: null,
    });
    setDialogMode("create");
  }, []);

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const id = arg.event.id;
      if (id.startsWith(SUGGESTION_PREFIX)) {
        const suggestionId = id.slice(SUGGESTION_PREFIX.length);
        const s = pending.find((p) => p.id === suggestionId);
        if (s) setPendingDialog(s);
        return;
      }
      const e = events.find((ev) => ev.id === id);
      if (!e || !e.start || !e.end) return;
      setDialogEditEvent({
        id: e.id,
        summary: e.summary,
        description: e.description ?? "",
        start: toInputDateTime(e.start),
        end: toInputDateTime(e.end),
      });
      setDialogMode("edit");
    },
    [pending, events],
  );

  const handleCreate = useCallback(
    async (draft: EventDraft) => {
      const startIso = fromInputDateTime(draft.start);
      const endIso = fromInputDateTime(draft.end);
      const optimisticId = `tmp_${Date.now()}`;
      const optimistic: CalendarEvent = {
        id: optimisticId,
        summary: draft.summary,
        description: draft.description || null,
        start: startIso,
        end: endIso,
        htmlLink: null,
      };
      setEvents((prev) => [...prev, optimistic]);
      try {
        const res = await fetch(ROUTES.api.calendar.events, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: draft.summary,
            description: draft.description || undefined,
            start: startIso,
            end: endIso,
            notionProjectId: draft.notionProjectId ?? undefined,
          }),
        });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const body = (await res.json()) as { event: { id: string; htmlLink: string | null } };
        setEvents((prev) =>
          prev.map((e) =>
            e.id === optimisticId
              ? { ...e, id: body.event.id, htmlLink: body.event.htmlLink }
              : e,
          ),
        );
        toast.success(t("calendar.toast.created"));
        return true;
      } catch (err) {
        setEvents((prev) => prev.filter((e) => e.id !== optimisticId));
        toast.error(t("calendar.toast.errorCreate"));
        // eslint-disable-next-line no-console
        console.error("calendar_event_create_failed", err);
        return false;
      }
    },
    [t],
  );

  const handleUpdate = useCallback(
    async (id: string, draft: EventDraft) => {
      const startIso = fromInputDateTime(draft.start);
      const endIso = fromInputDateTime(draft.end);
      const snapshot = events;
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                summary: draft.summary,
                description: draft.description || null,
                start: startIso,
                end: endIso,
              }
            : e,
        ),
      );
      try {
        const res = await fetch(ROUTES.api.calendar.event(id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: draft.summary,
            description: draft.description ?? "",
            start: startIso,
            end: endIso,
          }),
        });
        if (!res.ok) throw new Error(`http_${res.status}`);
        toast.success(t("calendar.toast.updated"));
        return true;
      } catch (err) {
        setEvents(snapshot);
        toast.error(t("calendar.toast.errorUpdate"));
        // eslint-disable-next-line no-console
        console.error("calendar_event_update_failed", err);
        return false;
      }
    },
    [events, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const snapshot = events;
      setEvents((prev) => prev.filter((e) => e.id !== id));
      try {
        const res = await fetch(ROUTES.api.calendar.event(id), { method: "DELETE" });
        if (!res.ok && res.status !== 204) throw new Error(`http_${res.status}`);
        toast.success(t("calendar.toast.deleted"));
        return true;
      } catch (err) {
        setEvents(snapshot);
        toast.error(t("calendar.toast.errorDelete"));
        // eslint-disable-next-line no-console
        console.error("calendar_event_delete_failed", err);
        return false;
      }
    },
    [events, t],
  );

  const handleConfirmPending = useCallback(
    async (suggestion: PendingSuggestion) => {
      const snapshot = pending;
      setPending((prev) => prev.filter((p) => p.id !== suggestion.id));
      try {
        const res = await fetch(ROUTES.api.digest.timeblockConfirm(suggestion.id), {
          method: "POST",
        });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const body = (await res.json()) as {
          suggestion: { google_event_id: string | null };
        };
        const newId = body.suggestion.google_event_id;
        if (newId) {
          setEvents((prev) => [
            ...prev,
            {
              id: newId,
              summary: suggestion.project_name,
              description: suggestion.rationale,
              start: suggestion.start_at,
              end: suggestion.end_at,
              htmlLink: null,
            },
          ]);
        } else if (range) {
          // Fallback: refetch the visible range so the new event shows up.
          void loadEvents(range);
        }
        toast.success(t("calendar.toast.confirmed"));
      } catch (err) {
        setPending(snapshot);
        toast.error(t("calendar.toast.errorConfirm"));
        // eslint-disable-next-line no-console
        console.error("calendar_pending_confirm_failed", err);
      } finally {
        setPendingDialog(null);
      }
    },
    [pending, range, loadEvents, t],
  );

  const handleDismissPending = useCallback(
    async (suggestion: PendingSuggestion) => {
      const snapshot = pending;
      setPending((prev) => prev.filter((p) => p.id !== suggestion.id));
      try {
        const res = await fetch(ROUTES.api.digest.timeblockDismiss(suggestion.id), {
          method: "POST",
        });
        if (!res.ok) throw new Error(`http_${res.status}`);
        toast.success(t("calendar.toast.dismissed"));
      } catch (err) {
        setPending(snapshot);
        toast.error(t("calendar.toast.errorDismiss"));
        // eslint-disable-next-line no-console
        console.error("calendar_pending_dismiss_failed", err);
      } finally {
        setPendingDialog(null);
      }
    },
    [pending, t],
  );

  if (!connected) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-10">
        <div className="rounded-xl border border-border bg-card px-8 py-10 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">
            {t("calendar.notConnected.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("calendar.notConnected.body")}</p>
          <Button asChild className="mt-5">
            <a href={ROUTES.api.google.connect}>{t("calendar.notConnected.cta")}</a>
          </Button>
        </div>
      </div>
    );
  }

  const viewButtons: { key: ViewKey; labelKey: "calendar.view.day" | "calendar.view.week" | "calendar.view.month" }[] = [
    { key: "timeGridDay", labelKey: "calendar.view.day" },
    { key: "timeGridWeek", labelKey: "calendar.view.week" },
    { key: "dayGridMonth", labelKey: "calendar.view.month" },
  ];

  return (
    <div className="mx-auto min-w-[1240px] max-w-screen-2xl px-6 py-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">{t("calendar.title")}</h1>
      </header>

      {/* Custom Google-style toolbar — replaces FullCalendar's default chrome. */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            {t("calendar.toolbar.today")}
          </Button>
          <div className="inline-flex">
            <button
              type="button"
              onClick={goPrev}
              aria-label={t("calendar.toolbar.prev")}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label={t("calendar.toolbar.next")}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <span className="ml-1 text-sm font-medium text-foreground" aria-live="polite">
            {toolbarLabel}
          </span>
        </div>

        <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-sm">
          {viewButtons.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => changeView(b.key)}
              className={cn(
                "rounded px-3 py-1 transition-colors",
                view === b.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(b.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="bh-calendar overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          events={fcEvents}
          locale={locale === "de" ? deLocale : enLocale}
          firstDay={1}
          height="auto"
          selectable
          selectMirror
          editable={false}
          select={handleSelect}
          eventClick={handleEventClick}
          datesSet={(arg) => {
            setRange({ start: arg.start.toISOString(), end: arg.end.toISOString() });
            // FullCalendar's view.title formats the current range with the right
            // locale + view-appropriate format (day / week range / month).
            setToolbarLabel(arg.view.title);
          }}
          // Hide FC's default toolbar; calendar.css also hides .fc-header-toolbar
          // as defence-in-depth in case a future update flips this default.
          headerToolbar={false}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          slotLabelInterval="01:00"
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          dayHeaderFormat={{ weekday: "short", day: "2-digit", omitCommas: true }}
          nowIndicator
          allDaySlot={false}
        />
      </div>

      <EventDialog
        mode={dialogMode}
        createDefaults={dialogCreateDefaults}
        editEvent={dialogEditEvent}
        projectOptions={projectOptions}
        onClose={() => setDialogMode("closed")}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      <PendingSuggestionDialog
        suggestion={pendingDialog}
        onClose={() => setPendingDialog(null)}
        onConfirm={handleConfirmPending}
        onDismiss={handleDismissPending}
      />
    </div>
  );
}
