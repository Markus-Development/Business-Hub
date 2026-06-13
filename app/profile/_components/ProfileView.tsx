"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n";
import type { TranslationKey } from "@/constants/translations";
import { ROUTES } from "@/constants/routes";
import { SettingsSection } from "./SettingsSection";
import { ArchiveSweepSection } from "./ArchiveSweepSection";
import { RoadmapDraftSection } from "./RoadmapDraftSection";

type IntegrationKey = "notion" | "google" | "zoho" | "anthropic" | "supabase";

type IntegrationStatus =
  | "connected"
  | "error"
  | "not_configured"
  | "never_connected";

type StatusResult = {
  status: IntegrationStatus;
  message?: string;
  checkedAt: string;
};

type StatusPayload = Record<IntegrationKey, StatusResult>;

type CardConfig = {
  key: IntegrationKey;
  nameKey: TranslationKey;
  kindKey: TranslationKey;
  showConnectAction?: boolean;
  showDisconnectAction?: boolean;
};

const CARDS: CardConfig[] = [
  { key: "notion", nameKey: "profile.integration.notion", kindKey: "profile.kind.envBased" },
  {
    key: "google",
    nameKey: "profile.integration.google",
    kindKey: "profile.kind.oauth",
    showConnectAction: true,
    showDisconnectAction: true,
  },
  { key: "zoho", nameKey: "profile.integration.zoho", kindKey: "profile.kind.oauth" },
  { key: "anthropic", nameKey: "profile.integration.anthropic", kindKey: "profile.kind.envBased" },
  { key: "supabase", nameKey: "profile.integration.supabase", kindKey: "profile.kind.envBased" },
];

async function fetchStatus(): Promise<StatusPayload> {
  const res = await fetch(ROUTES.api.profile.status, { method: "POST", cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `http_${res.status}`);
  }
  return (await res.json()) as StatusPayload;
}

async function disconnectGoogle(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(ROUTES.api.google.disconnect, { method: "POST" });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: body.error };
}

function formatRelative(iso: string, locale: "de" | "en"): string {
  const now = Date.now();
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const diff = Math.round((then - now) / 1000);
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    numeric: "auto",
  });
  if (abs < 60) return rtf.format(diff, "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

// Colored status dot — same semantics as the former StatusPill
// (connected=emerald, error=red, never_connected=amber, not_configured=muted).
const STATUS_DOT_CLASS: Record<IntegrationStatus, string> = {
  connected: "bg-emerald-500",
  error: "bg-red-500",
  never_connected: "bg-amber-500",
  not_configured: "bg-muted-foreground/40",
};

const STATUS_LABEL_KEY: Record<IntegrationStatus, TranslationKey> = {
  connected: "profile.status.connected",
  error: "profile.status.error",
  never_connected: "profile.status.neverConnected",
  not_configured: "profile.status.notConfigured",
};

function StatusDot({ status, t }: { status: IntegrationStatus; t: (k: TranslationKey) => string }) {
  return (
    <span
      className={`inline-block size-2.5 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]}`}
      aria-label={t(STATUS_LABEL_KEY[status])}
      title={t(STATUS_LABEL_KEY[status])}
    />
  );
}

export function ProfileView({ email }: { email: string }) {
  const t = useT();
  const [locale] = useLocale();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Same loop-safe pattern as DailyDigest / TimeBlockSuggestions: keep current t in a ref
  // and mount the fetch effect with empty deps. Locale toggles must not refetch.
  const tRef = useRef(t);
  tRef.current = t;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchStatus();
      setData(result);
    } catch (err) {
      toast.error(tRef.current("profile.errorLoad"));
      // eslint-disable-next-line no-console
      console.error("profile_load_failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRecheckAll = useCallback(async () => {
    setBusy(true);
    try {
      const result = await fetchStatus();
      setData(result);
      toast.success(t("profile.rechecked"));
    } catch (err) {
      toast.error(t("profile.errorRecheck"));
      // eslint-disable-next-line no-console
      console.error("profile_recheck_failed", err);
    } finally {
      setBusy(false);
    }
  }, [t]);

  const handleDisconnectGoogle = useCallback(async () => {
    setDisconnecting(true);
    const { ok, error } = await disconnectGoogle();
    if (!ok) {
      toast.error(t("profile.errorDisconnect"));
      // eslint-disable-next-line no-console
      console.error("profile_disconnect_failed", error);
      setDisconnecting(false);
      return;
    }
    toast.success(t("profile.disconnected"));
    // Optimistically flip the local card to never_connected so the UI reflects it before re-check.
    setData((prev) =>
      prev
        ? {
            ...prev,
            google: { status: "never_connected", checkedAt: new Date().toISOString() },
          }
        : prev,
    );
    // Nudge other surfaces (TopNav) to re-read Google status.
    window.dispatchEvent(new Event("bh:google-status-changed"));
    setDisconnecting(false);
  }, [t]);

  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-10">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">{t("profile.title")}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{email}</p>
      </header>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            {t("profile.integrationsTitle")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecheckAll}
            disabled={loading || busy}
          >
            {busy ? t("profile.rechecking") : t("profile.recheckAll")}
          </Button>
        </div>

        <ul className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {CARDS.map((card) => {
            const result = data?.[card.key];
            const status: IntegrationStatus = result?.status ?? "not_configured";
            return (
              <li
                key={card.key}
                className="rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <StatusDot status={status} t={t} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t(card.nameKey)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {result
                        ? `${t("profile.checked")} ${formatRelative(result.checkedAt, locale)}`
                        : loading
                          ? t("profile.loading")
                          : t("profile.notChecked")}
                    </p>
                  </div>
                  {card.key === "google" && status === "connected" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectGoogle}
                      disabled={disconnecting}
                    >
                      {disconnecting ? t("profile.disconnecting") : t("profile.disconnect")}
                    </Button>
                  ) : null}
                  {card.key === "google" &&
                  (status === "never_connected" || status === "error") ? (
                    <Button asChild size="sm">
                      <a href={ROUTES.api.google.connect}>{t("google.connect")}</a>
                    </Button>
                  ) : null}
                </div>
                {result?.message && status === "error" ? (
                  <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                    {result.message}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <SettingsSection />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">{t("profile.maintenanceTitle")}</h2>
        <div className="mt-4 space-y-6">
          <ArchiveSweepSection />
          <RoadmapDraftSection />
        </div>
      </section>
    </div>
  );
}
