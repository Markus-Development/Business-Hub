"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
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
import type { CalendarEvent } from "@/lib/google";
import { ROUTES } from "@/constants/routes";
import { EventDialog, type EventDraft, type EventEdit } from "./EventDialog";
import { PendingSuggestionDialog, type PendingSuggestion } from "./PendingSuggestionPopover";

type ProjectOption = { id: string; name: string };

type Range = { start: string; end: string };
type CalView = "day" | "week" | "custom";

const SUGGESTION_PREFIX = "pending:";

const VIEW_STORAGE_KEY = "bh.calendar.view";
const CUSTOM_START_KEY = "bh.calendar.custom.start";
const CUSTOM_END_KEY = "bh.calendar.custom.end";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysStr(d: string, n: number): string {
  return new Date(new Date(d).getTime() + n * 86400000).toISOString().slice(0, 10);
}
// FullCalendar treats custom-range `end` as EXCLUSIVE. The picker gives us
// inclusive dates, so we shift by one day before handing off to FC.
function nextDayOf(d: string): string {
  return addDaysStr(d, 1);
}

// Google Calendar's event-colour palette (colorId "1"–"11"). Canonical hex values
// from Google's own UI — keep this in lockstep with what the Google Calendar
// product surfaces so colours feel consistent for the user.
const GOOGLE_COLOR_MAP: Record<string, string> = {
  "1": "#7986cb", // Lavender
  "2": "#33b679", // Sage
  "3": "#8e24aa", // Grape
  "4": "#e67c73", // Flamingo
  "5": "#f6bf26", // Banana
  "6": "#f4511e", // Tangerine
  "7": "#039be5", // Peacock
  "8": "#616161", // Graphite
  "9": "#3f51b5", // Blueberry
  "10": "#0b8043", // Basil
  "11": "#d50000", // Tomato
};

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

  // View switcher state. `custom` mode shows a date-range picker row below the
  // toolbar and renders an arbitrary day range via FC's `changeView('timeGrid', { start, end })`.
  const [calView, setCalView] = useState<CalView>("week");
  const [customStart, setCustomStart] = useState<string>(() => todayStr());
  const [customEnd, setCustomEnd] = useState<string>(() => addDaysStr(todayStr(), 6));
  const [tokenRevoked, setTokenRevoked] = useState(false);

  // Refs:
  // - calendarRef: imperative handle for prev/next/today/changeView from our custom toolbar.
  // - tRef: keep latest t in a ref so mount-only fetch effects don't refetch on locale toggle.
  const calendarRef = useRef<FullCalendar | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  // Imperative toolbar handlers. Wrap getApi() calls so a missing ref doesn't crash.
  const goPrev = useCallback(() => calendarRef.current?.getApi().prev(), []);
  const goNext = useCallback(() => calendarRef.current?.getApi().next(), []);
  const goToday = useCallback(() => calendarRef.current?.getApi().today(), []);

  // Applies the current customStart/customEnd to FullCalendar's imperative API
  // and persists both endpoints. `end` is exclusive in FC's custom-range API,
  // so we hand it `nextDayOf(customEnd)`.
  const applyCustomRange = useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.changeView("timeGrid", { start: customStart, end: nextDayOf(customEnd) });
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, "custom");
      window.localStorage.setItem(CUSTOM_START_KEY, customStart);
      window.localStorage.setItem(CUSTOM_END_KEY, customEnd);
    } catch {
      /* private mode / quota — non-critical */
    }
    setCalView("custom");
  }, [customStart, customEnd]);

  const switchView = useCallback(
    (v: CalView) => {
      const api = calendarRef.current?.getApi();
      if (!api) return;
      if (v === "day") {
        api.changeView("timeGridDay");
        setCalView("day");
        try {
          window.localStorage.setItem(VIEW_STORAGE_KEY, "day");
        } catch {}
      } else if (v === "week") {
        api.changeView("timeGridWeek");
        setCalView("week");
        try {
          window.localStorage.setItem(VIEW_STORAGE_KEY, "week");
        } catch {}
      } else {
        // Custom: applyCustomRange handles both the view change and persistence.
        applyCustomRange();
      }
    },
    [applyCustomRange],
  );

  const loadEvents = useCallback(async (r: Range) => {
    try {
      const url = `${ROUTES.api.calendar.events}?start=${encodeURIComponent(
        r.start,
      )}&end=${encodeURIComponent(r.end)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const serverErr = (body as any)?.error ?? `http_${res.status}`;
        throw new Error(serverErr);
      }
      const body = (await res.json()) as { events: CalendarEvent[] };
      setEvents(body.events);
      setTokenRevoked(false);
    } catch (err) {
      if (err instanceof Error && err.message === "google_invalid_grant") {
        setTokenRevoked(true);
        toast.error(tRef.current("calendar.errorTokenRevoked"));
      } else {
        toast.error(tRef.current("calendar.errorLoad"));
      }
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

  // Mount-time view restore. FullCalendar's `initialView` already gives us
  // timeGridWeek; we override only when storage says otherwise. Dep is `connected`
  // because FC is only mounted when connected.
  useEffect(() => {
    if (!connected) return;
    if (!calendarRef.current) return;
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY) as CalView | null;
      if (stored === "day") {
        calendarRef.current.getApi().changeView("timeGridDay");
        setCalView("day");
      } else if (stored === "custom") {
        const s = window.localStorage.getItem(CUSTOM_START_KEY);
        const e = window.localStorage.getItem(CUSTOM_END_KEY);
        if (s && e) {
          setCustomStart(s);
          setCustomEnd(e);
          calendarRef.current.getApi().changeView("timeGrid", { start: s, end: nextDayOf(e) });
          setCalView("custom");
        }
      }
      // stored === "week" or null → keep the default initialView.
    } catch {
      /* swallow — fall back to default view */
    }
    // We only want this to fire once when connected flips true. `calendarRef`
    // is stable; the custom* state defaults to today/+6 which suffices when no
    // stored custom range exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // Refetch events when the visible range changes.
  useEffect(() => {
    if (!connected || !range) return;
    void loadEvents(range);
  }, [connected, range, loadEvents]);

  const fcEvents = useMemo<EventInput[]>(() => {
    const real: EventInput[] = events
      .filter((e) => e.start)
      .map((e) => {
        // FullCalendar inlines `backgroundColor` as a `--fc-event-bg-color` CSS variable
        // on the event element; calendar.css falls back to var(--primary) when unset,
        // so leaving these undefined gives the default-coloured Google events the
        // app's primary blue.
        const colour = e.colorId ? GOOGLE_COLOR_MAP[e.colorId] : undefined;
        return {
          id: e.id,
          title: e.summary,
          start: e.start ?? undefined,
          end: e.end ?? undefined,
          backgroundColor: colour,
          borderColor: colour,
          extendedProps: { description: e.description, htmlLink: e.htmlLink },
        };
      });
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
        colorId: null,
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
              colorId: null,
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

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">{t("calendar.title")}</h1>
      </header>

      {/* Custom Google-style toolbar — replaces FullCalendar's default chrome. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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

        <div
          role="group"
          aria-label={t("calendar.view.week")}
          className="inline-flex items-center rounded-md border border-border bg-card p-0.5"
        >
          {(["day", "week", "custom"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => switchView(v)}
              aria-pressed={calView === v}
              className={cn(
                "rounded-sm px-3 py-1 text-sm font-medium transition-colors",
                calView === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`calendar.view.${v}` as const)}
            </button>
          ))}
        </div>
      </div>

      {calView === "custom" && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <label className="text-muted-foreground" htmlFor="bh-cal-from">
            {t("calendar.customRange.from")}
          </label>
          <input
            id="bh-cal-from"
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
          <label className="text-muted-foreground" htmlFor="bh-cal-to">
            {t("calendar.customRange.to")}
          </label>
          <input
            id="bh-cal-to"
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          />
          <Button size="sm" onClick={applyCustomRange}>
            {t("calendar.customRange.apply")}
          </Button>
        </div>
      )}

      {tokenRevoked && (
        <div className="mb-3 rounded-xl border border-border bg-card px-6 py-5 text-center shadow-sm">
          <h2 className="text-base font-semibold text-foreground">
            {t("calendar.reconnect.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("calendar.reconnect.body")}</p>
          <Button asChild className="mt-4">
            <a href={ROUTES.api.google.connect}>{t("calendar.reconnect.cta")}</a>
          </Button>
        </div>
      )}

      <div className="bh-calendar overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-sm sm:p-3">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
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
