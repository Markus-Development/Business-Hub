"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import { CALL_TYPES } from "@/constants/call-notes";
import type { TranslationKey } from "@/constants/translations";

const UNSET = "__unset";

type ClientOption = { zohoContactId: string; name: string };

type RecentCall = {
  id: string;
  name: string;
  callType: string | null;
  date: string | null;
  outcome: string | null;
  notionUrl: string;
};

// Local date (not UTC) so the default doesn't roll a day across midnight UTC.
function localToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function CallsView() {
  const t = useT();

  // --- form state ---
  const [loomUrl, setLoomUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [callType, setCallType] = useState<string>(""); // "" = auto-detect
  const [clientZohoId, setClientZohoId] = useState<string>("");
  const [date, setDate] = useState<string>(localToday());
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  // --- client options (loaded once) ---
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // --- recent calls ---
  const [recent, setRecent] = useState<RecentCall[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<TranslationKey | null>(null);
  // Bumped after a successful save to refetch the list (primitive dep → loop-safe).
  const [refreshKey, setRefreshKey] = useState(0);

  // tRef so the fetch effects can read the current locale's `t` without
  // depending on `t` (a locale toggle must not refetch).
  const tRef = useRef(t);
  tRef.current = t;

  // Load client options once.
  useEffect(() => {
    let cancelled = false;
    fetch(ROUTES.api.clients.list, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http_${r.status}`))))
      .then((json: { clients?: ClientOption[] }) => {
        if (cancelled) return;
        const list = Array.isArray(json.clients) ? json.clients : [];
        setClients(
          list
            .map((c) => ({ zohoContactId: c.zohoContactId, name: c.name }))
            .filter((c) => c.zohoContactId && c.name)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        setClientsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setClientsLoading(false);
        // eslint-disable-next-line no-console
        console.error("calls_clients_load_failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load recent calls — refetches when refreshKey changes (after a save).
  useEffect(() => {
    let cancelled = false;
    setRecentLoading(true);
    setRecentError(null);
    fetch(ROUTES.api.calls.list, { cache: "no-store" })
      .then(async (r) => {
        const json = (await r.json()) as {
          ok?: boolean;
          calls?: RecentCall[];
          error?: string;
        };
        if (cancelled) return;
        if (r.status === 503 || json.error === "not_configured") {
          setRecentError("calls.recent.notConfigured");
          setRecent([]);
        } else if (!r.ok || !json.ok) {
          setRecentError("calls.recent.loadError");
          setRecent([]);
        } else {
          setRecent(Array.isArray(json.calls) ? json.calls : []);
        }
        setRecentLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setRecentError("calls.recent.loadError");
        setRecentLoading(false);
        // eslint-disable-next-line no-console
        console.error("calls_list_load_failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const transcriptMissing = !transcript.trim();

  const submit = useCallback(async () => {
    setTouched(true);
    if (transcriptMissing) return;
    setSubmitting(true);
    try {
      const res = await fetch(ROUTES.api.calls.mine, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loomUrl: loomUrl.trim() || undefined,
          transcript,
          callTypeHint: callType || undefined,
          clientZohoId: clientZohoId || undefined,
          date: date || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        const code = json.error ?? "generic";
        const key = (`calls.error.${code}` as TranslationKey) in TRANSLATION_GUARD
          ? (`calls.error.${code}` as TranslationKey)
          : ("calls.error.generic" as TranslationKey);
        toast.error(t(key));
        return;
      }
      toast.success(t("calls.toast.success"), {
        action: json.url
          ? {
              label: t("calls.toast.openInNotion"),
              onClick: () => window.open(json.url, "_blank", "noopener,noreferrer"),
            }
          : undefined,
      });
      // Reset the transcript + loom for the next call; keep type/client/date.
      setLoomUrl("");
      setTranscript("");
      setTouched(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("calls_mine_failed", err);
      toast.error(t("calls.error.generic"));
    } finally {
      setSubmitting(false);
    }
  }, [transcriptMissing, loomUrl, transcript, callType, clientZohoId, date, t]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("calls.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("calls.subtitle")}</p>
      </header>

      {/* --- analysis form --- */}
      <section className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
        <Field label={t("calls.form.loomLabel")}>
          <Input
            value={loomUrl}
            onChange={(e) => setLoomUrl(e.target.value)}
            placeholder={t("calls.form.loomPlaceholder")}
          />
        </Field>

        <Field
          label={t("calls.form.transcriptLabel")}
          error={touched && transcriptMissing ? t("calls.form.transcriptRequired") : null}
        >
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={t("calls.form.transcriptPlaceholder")}
            rows={12}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("calls.form.callTypeLabel")}>
            <Select
              value={callType || UNSET}
              onValueChange={(v) => setCallType(v === UNSET ? "" : v)}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder={t("calls.form.callTypeAuto")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>{t("calls.form.callTypeAuto")}</SelectItem>
                {CALL_TYPES.map((ct) => (
                  <SelectItem key={ct} value={ct}>
                    {ct}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("calls.form.clientLabel")}>
            <Select
              value={clientZohoId || UNSET}
              onValueChange={(v) => setClientZohoId(v === UNSET ? "" : v)}
              disabled={clientsLoading}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue
                  placeholder={
                    clientsLoading
                      ? t("calls.form.clientLoading")
                      : t("calls.form.clientNone")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>{t("calls.form.clientNone")}</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.zohoContactId} value={c.zohoContactId}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("calls.form.dateLabel")}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("calls.form.submitting") : t("calls.form.submit")}
          </Button>
        </div>
      </section>

      {/* --- recent calls --- */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {t("calls.recent.title")}
        </h2>
        {recentLoading ? (
          <p className="text-sm text-muted-foreground">{t("calls.recent.loading")}</p>
        ) : recentError ? (
          <p className="text-sm text-muted-foreground">{t(recentError)}</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("calls.recent.empty")}</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {recent.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {c.name}
                </span>
                {c.callType ? <Badge variant="secondary">{c.callType}</Badge> : null}
                {c.outcome ? <Badge variant="outline">{c.outcome}</Badge> : null}
                <span className="font-mono text-xs text-muted-foreground">
                  {c.date ?? t("calls.recent.noDate")}
                </span>
                <a
                  href={c.notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  {t("calls.recent.open")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Guard map so an unknown error code falls back to the generic toast string.
const TRANSLATION_GUARD: Record<string, true> = {
  "calls.error.missing_transcript": true,
  "calls.error.generation_failed": true,
  "calls.error.parse_failed": true,
  "calls.error.not_configured": true,
  "calls.error.notion_not_linked": true,
  "calls.error.outcome_type_mismatch": true,
  "calls.error.generic": true,
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
