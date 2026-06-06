"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";

const HORIZON_DAYS = 5;

function filterFuture(items: Suggestion[]): Suggestion[] {
  const nowMs = Date.now();
  return items.filter((s) => Date.parse(s.start_at) >= nowMs);
}

// "Today" / "Tomorrow" comparison runs in the browser's local zone — the row
// `date` is YYYY-MM-DD set server-side in the user's configured timezone, which
// in the solo-user case matches the browser. A traveller could see a 1-day skew;
// that's acceptable and the rendered label still parses to a sensible date.
function ymdToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function ymdAdd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(y, m - 1, d + n, 12, 0, 0);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

type Suggestion = {
  id: string;
  created_at: string;
  date: string;
  project_name: string;
  start_at: string;
  end_at: string;
  rationale: string;
  status: string;
  google_event_id: string | null;
  batch_id: string;
};

type FetchState = "initial" | "ready";

type SuggestionsResponse = {
  suggestions: Suggestion[];
  timezone: string | null;
};

async function fetchSuggestions(): Promise<SuggestionsResponse> {
  const res = await fetch(ROUTES.api.digest.timeblocks, { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `http_${res.status}`);
  }
  const data = (await res.json()) as { suggestions: Suggestion[]; timezone?: string };
  return { suggestions: data.suggestions, timezone: data.timezone ?? null };
}

async function postSuggest(): Promise<{
  suggestions: Suggestion[];
  timezone: string | null;
  error?: string;
  status: number;
}> {
  const res = await fetch(ROUTES.api.digest.timeblocks, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ horizon_days: HORIZON_DAYS }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    suggestions?: Suggestion[];
    timezone?: string;
    error?: string;
  };
  return {
    suggestions: body.suggestions ?? [],
    timezone: body.timezone ?? null,
    error: body.error,
    status: res.status,
  };
}

async function postConfirm(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(ROUTES.api.digest.timeblockConfirm(id), {
    method: "POST",
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: body.error };
}

async function postDismiss(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(ROUTES.api.digest.timeblockDismiss(id), {
    method: "POST",
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: body.error };
}

function formatRangeInTz(startIso: string, endIso: string, timezone: string | null): string {
  // Format start/end in the user's configured timezone so a 09:00 Dubai suggestion
  // reads as "09:00", not "07:00 Berlin". Falls back to the browser's local zone
  // when the API hasn't echoed the configured timezone yet (mount-time GET race).
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("de-DE", {
      ...(timezone ? { timeZone: timezone } : {}),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  return `${fmt(startIso)}–${fmt(endIso)}`;
}

export function TimeBlockSuggestions() {
  const t = useT();
  const [locale] = useLocale();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [state, setState] = useState<FetchState>("initial");
  const [generating, setGenerating] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  // Same pattern as DailyDigest: keep latest t in a ref so the mount-only effect
  // shows current-locale toasts without depending on t (which would refetch on
  // locale toggle and previously caused the infinite GET loop).
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    let cancelled = false;
    fetchSuggestions()
      .then((data) => {
        if (cancelled) return;
        setItems(filterFuture(data.suggestions));
        setTimezone(data.timezone);
        setState("ready");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        toast.error(tRef.current("timeblocks.errorLoad"));
        // eslint-disable-next-line no-console
        console.error("timeblocks_load_failed", err);
        setState("ready");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSuggest = useCallback(async () => {
    setGenerating(true);
    try {
      const result = await postSuggest();
      if (result.status === 409 && result.error === "google_not_connected") {
        toast.error(t("timeblocks.errorGoogleNotConnected"));
        return;
      }
      if (
        result.status === 409 &&
        (result.error === "no_free_slots" || result.error === "no_viable_days")
      ) {
        toast.error(t("timeblocks.errorNoFreeSlots"));
        return;
      }
      if (result.error) {
        toast.error(t("timeblocks.errorGenerate"));
        // eslint-disable-next-line no-console
        console.error("timeblocks_suggest_failed", result.error);
        return;
      }
      // Merge new pending suggestions with existing pending ones, drop any that
      // would already be in the past, and order by start.
      setItems((prev) => {
        const merged = [...prev, ...result.suggestions];
        return filterFuture(merged).sort(
          (a, b) => Date.parse(a.start_at) - Date.parse(b.start_at),
        );
      });
      if (result.timezone) setTimezone(result.timezone);
      toast.success(t("timeblocks.generated"));
    } finally {
      setGenerating(false);
    }
  }, [t]);

  const handleConfirm = useCallback(
    async (id: string) => {
      setPendingActionId(id);
      const snapshot = items;
      setItems((prev) => prev.filter((s) => s.id !== id));
      const { ok, error } = await postConfirm(id);
      if (!ok) {
        setItems(snapshot);
        toast.error(t("timeblocks.errorConfirm"));
        // eslint-disable-next-line no-console
        console.error("timeblocks_confirm_failed", error);
      } else {
        toast.success(t("timeblocks.confirmed"));
      }
      setPendingActionId(null);
    },
    [items, t],
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      setPendingActionId(id);
      const snapshot = items;
      setItems((prev) => prev.filter((s) => s.id !== id));
      const { ok, error } = await postDismiss(id);
      if (!ok) {
        setItems(snapshot);
        toast.error(t("timeblocks.errorDismiss"));
        // eslint-disable-next-line no-console
        console.error("timeblocks_dismiss_failed", error);
      } else {
        toast.success(t("timeblocks.dismissed"));
      }
      setPendingActionId(null);
    },
    [items, t],
  );

  // Group future suggestions by `date` (YYYY-MM-DD) and sort groups ascending.
  // Each group's own list is already sorted because `items` is kept ordered.
  const groups = useMemo(() => {
    const map = new Map<string, Suggestion[]>();
    for (const s of items) {
      const bucket = map.get(s.date);
      if (bucket) bucket.push(s);
      else map.set(s.date, [s]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const formatDayLabel = useCallback(
    (dateYmd: string): string => {
      const today = ymdToday();
      if (dateYmd === today) return t("digest.timeblocks.dayToday");
      if (dateYmd === ymdAdd(today, 1)) return t("digest.timeblocks.dayTomorrow");
      // Treat as local noon — a date-string boundary that's immune to TZ flips.
      const [y, m, d] = dateYmd.split("-").map(Number);
      const at = new Date(y, m - 1, d, 12, 0, 0);
      return new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(at);
    },
    [locale, t],
  );

  return (
    <section className="mx-auto max-w-4xl pb-10">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t("digest.timeblocks.titleMulti")}
        </h2>
        {state === "ready" && items.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggest}
            disabled={generating}
          >
            {generating ? t("timeblocks.generating") : t("timeblocks.suggestAgain")}
          </Button>
        ) : null}
      </header>

      <div className="mt-4">
        {state === "initial" ? (
          <p className="text-sm text-muted-foreground">{t("timeblocks.loading")}</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-8 text-center shadow-sm sm:px-8 sm:py-10">
            <p className="text-sm text-muted-foreground">
              {t("digest.timeblocks.emptyMulti")}
            </p>
            <Button
              className="mt-5"
              onClick={handleSuggest}
              disabled={generating}
            >
              {generating
                ? t("timeblocks.generating")
                : t("digest.timeblocks.generateMulti")}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([date, daySuggestions]) => (
              <div key={date}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatDayLabel(date)}
                </h3>
                <ul className="space-y-3">
                  {daySuggestions.map((s) => {
                    const busy = pendingActionId === s.id;
                    return (
                      <li
                        key={s.id}
                        className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {s.project_name}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                              {formatRangeInTz(s.start_at, s.end_at, timezone)}
                            </p>
                            <p className="mt-2 text-sm text-foreground">{s.rationale}</p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDismiss(s.id)}
                              disabled={busy}
                              aria-label={t("timeblocks.dismiss")}
                            >
                              <X className="size-4" />
                              <span className="ml-1">{t("timeblocks.dismiss")}</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleConfirm(s.id)}
                              disabled={busy}
                              aria-label={t("timeblocks.confirm")}
                            >
                              <Check className="size-4" />
                              <span className="ml-1">{t("timeblocks.confirm")}</span>
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
