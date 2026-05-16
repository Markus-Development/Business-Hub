"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";

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
  const res = await fetch(ROUTES.api.digest.timeblocks, { method: "POST" });
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
        setItems(data.suggestions);
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
      if (result.status === 409 && result.error === "no_free_slots") {
        toast.error(t("timeblocks.errorNoFreeSlots"));
        return;
      }
      if (result.error) {
        toast.error(t("timeblocks.errorGenerate"));
        // eslint-disable-next-line no-console
        console.error("timeblocks_suggest_failed", result.error);
        return;
      }
      // Merge new pending suggestions with existing pending ones, ordered by start.
      setItems((prev) => {
        const merged = [...prev, ...result.suggestions];
        return merged.sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
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

  return (
    <section className="mx-auto max-w-4xl px-6 pb-10">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">{t("timeblocks.title")}</h2>
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
          <div className="rounded-xl border border-border bg-card px-8 py-10 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">{t("timeblocks.emptyHint")}</p>
            <Button
              className="mt-5"
              onClick={handleSuggest}
              disabled={generating}
            >
              {generating ? t("timeblocks.generating") : t("timeblocks.suggest")}
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((s) => {
              const busy = pendingActionId === s.id;
              return (
                <li
                  key={s.id}
                  className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
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
        )}
      </div>
    </section>
  );
}
