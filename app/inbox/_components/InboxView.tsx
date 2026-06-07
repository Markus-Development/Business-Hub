"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Inbox as InboxIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import { SuggestionForm, type ProcessPayload, type Suggestion } from "./SuggestionForm";

type InboxEntry = { id: string; name: string; type: string | null; createdTime: string };

export function InboxView({ notConfigured }: { notConfigured: boolean }) {
  const t = useT();

  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const [loading, setLoading] = useState(!notConfigured);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [areaOptions, setAreaOptions] = useState<string[]>([]);

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [busy, setBusy] = useState(false);

  // tRef so the fetch effects don't depend on `t` (a locale toggle must not refetch).
  const tRef = useRef(t);
  tRef.current = t;

  // Load the unprocessed queue + the live Resource Area options once on mount.
  // Loop-safe: empty deps, primitive guard via the `cancelled` flag.
  useEffect(() => {
    if (notConfigured) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetch(ROUTES.api.inbox.list, { cache: "no-store" })
      .then(async (r) => {
        const json = (await r.json()) as { ok?: boolean; entries?: InboxEntry[] };
        if (cancelled) return;
        if (!r.ok || !json.ok) {
          setLoadError(true);
          setEntries([]);
        } else {
          setEntries(Array.isArray(json.entries) ? json.entries : []);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
        // eslint-disable-next-line no-console
        console.error("inbox_list_load_failed", err);
      });

    fetch(ROUTES.api.resources.options, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http_${r.status}`))))
      .then((json: { area?: { name: string }[] }) => {
        if (cancelled) return;
        setAreaOptions((Array.isArray(json.area) ? json.area : []).map((o) => o.name));
      })
      .catch(() => {
        // Best-effort: the Area select falls back to "none only" if this fails.
      });

    return () => {
      cancelled = true;
    };
  }, [notConfigured]);

  const current: InboxEntry | undefined = entries[index];

  const getSuggestion = async () => {
    if (!current) return;
    setSuggesting(true);
    try {
      const res = await fetch(ROUTES.api.inbox.suggest, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: current.id }),
      });
      const json = (await res.json()) as { ok?: boolean; suggestion?: Suggestion; error?: string };
      if (!res.ok || !json.ok || !json.suggestion) {
        toast.error(t("inbox.toast.suggestError"));
        return;
      }
      setSuggestion(json.suggestion);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("inbox_suggest_failed", err);
      toast.error(t("inbox.toast.suggestError"));
    } finally {
      setSuggesting(false);
    }
  };

  // Optimistically remove the current entry from the queue, then POST. Revert on
  // failure. `index` is left untouched — after the splice, entries[index] is the
  // next entry (or the completion state when the queue empties).
  const removeCurrentAndProcess = async (
    bodyPayload: Record<string, unknown>,
    successKey: Parameters<typeof t>[0],
  ) => {
    if (!current) return;
    const snapshotEntries = entries;
    const snapshotSuggestion = suggestion;
    setBusy(true);
    setEntries((prev) => prev.filter((e) => e.id !== current.id));
    setSuggestion(null);
    try {
      const res = await fetch(ROUTES.api.inbox.process, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const json = (await res.json()) as { ok?: boolean; url?: string; warning?: string };
      if (!res.ok || !json.ok) {
        throw new Error("process_failed");
      }
      if (json.warning) {
        toast.warning(t("inbox.toast.processWarning"));
      } else {
        toast.success(t(successKey), {
          action: json.url
            ? {
                label: t("inbox.toast.openInNotion"),
                onClick: () => window.open(json.url, "_blank", "noopener,noreferrer"),
              }
            : undefined,
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("inbox_process_failed", err);
      setEntries(snapshotEntries);
      setSuggestion(snapshotSuggestion);
      toast.error(t("inbox.toast.processError"));
    } finally {
      setBusy(false);
    }
  };

  const onProcess = (action: "project" | "resource", payload: ProcessPayload) => {
    void removeCurrentAndProcess(
      { entryId: current?.id, action, payload },
      action === "project" ? "inbox.toast.projectCreated" : "inbox.toast.resourceCreated",
    );
  };

  const onSomeday = () => {
    void removeCurrentAndProcess(
      { entryId: current?.id, action: "someday" },
      "inbox.toast.someday",
    );
  };

  const onSkip = () => {
    setSuggestion(null);
    setIndex((i) => i + 1);
  };

  // --- render states ---
  const header = (
    <header className="space-y-1">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("inbox.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("inbox.subtitle")}</p>
    </header>
  );

  if (notConfigured) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {header}
        <EmptyCard icon={<InboxIcon className="size-5" />} text={t("inbox.notConfigured")} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {header}
        <p className="text-sm text-muted-foreground">{t("inbox.loading")}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {header}
        <EmptyCard icon={<InboxIcon className="size-5" />} text={t("inbox.loadError")} />
      </div>
    );
  }

  const done = !current; // queue empty or skipped past the end
  if (done) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {header}
        <EmptyCard
          icon={<CheckCircle2 className="size-5 text-emerald-500" />}
          text={entries.length === 0 ? t("inbox.empty") : t("inbox.passComplete")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {header}

      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">
          {t("inbox.progress")
            .replace("{x}", String(index + 1))
            .replace("{n}", String(entries.length))}
        </span>
      </div>

      {/* Current raw entry */}
      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-foreground">
            {current.name}
          </p>
          {current.type ? <Badge variant="secondary">{current.type}</Badge> : null}
        </div>
        {!suggestion ? (
          <Button onClick={getSuggestion} disabled={suggesting} size="sm">
            <Sparkles className="size-3.5" aria-hidden />
            {suggesting ? t("inbox.suggesting") : t("inbox.getSuggestion")}
          </Button>
        ) : (
          <Button onClick={getSuggestion} disabled={suggesting} size="sm" variant="outline">
            <Sparkles className="size-3.5" aria-hidden />
            {suggesting ? t("inbox.suggesting") : t("inbox.regenerate")}
          </Button>
        )}
      </div>

      {suggestion ? (
        <SuggestionForm
          suggestion={suggestion}
          areaOptions={areaOptions}
          busy={busy}
          onProcess={onProcess}
          onSomeday={onSomeday}
          onSkip={onSkip}
        />
      ) : (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onSkip} disabled={busy}>
            {t("inbox.skip")}
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
