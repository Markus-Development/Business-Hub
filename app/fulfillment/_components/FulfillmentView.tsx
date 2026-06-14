"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import type { TranslationKey } from "@/constants/translations";
import {
  FULFILLMENT_STAGES,
  clientStatusColour,
  type FulfillmentStage,
} from "@/constants/fulfillment";
import { notionColourBg, notionColourText } from "@/constants/priorities";

const SHOW_MUTED_KEY = "bh.fulfillment.showMuted";

type Row = {
  id: string;
  clientName: string;
  clientStatus: string | null;
  // "muted" = not-active (Paused or Inactive): greyed out, disabled, sorted last.
  muted: boolean;
  callTermin: boolean;
  transaktionen: boolean;
  ready: boolean;
  fertig: boolean;
};

type MonthState = { loading: boolean; items: Row[] | null; error: boolean };

type Props = {
  initialMonth: string; // "YYYY-MM"
  notConfigured?: boolean;
};

// Stage name (Notion checkbox property) -> Row boolean field.
const STAGE_FIELD: Record<FulfillmentStage, "callTermin" | "transaktionen" | "ready" | "fertig"> = {
  "Call Termin": "callTermin",
  Transaktionen: "transaktionen",
  Ready: "ready",
  Fertig: "fertig",
};

// Shift a "YYYY-MM" key by ±delta months. UTC-only arithmetic — deterministic.
function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function FulfillmentView({ initialMonth, notConfigured }: Props) {
  const t = useT();
  const [locale] = useLocale();
  const [month, setMonth] = useState(initialMonth);
  const [cache, setCache] = useState<Record<string, MonthState>>({});
  const [generating, setGenerating] = useState(false);
  // Toggle for showing the not-active (Paused/Inactive) clients. Default on
  // (visible); persisted in localStorage. Mount-only hydration, loop-safe
  // (empty deps, primitive state) per the CLAUDE.md useEffect rules.
  const [showMuted, setShowMuted] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SHOW_MUTED_KEY);
      if (saved !== null) setShowMuted(saved === "true");
    } catch {
      // ignore — non-persistent fallback
    }
  }, []);

  const toggleShowMuted = (next: boolean) => {
    setShowMuted(next);
    try {
      window.localStorage.setItem(SHOW_MUTED_KEY, String(next));
    } catch {
      // ignore
    }
  };

  // tRef so the fetch helper never has to depend on `t` (locale toggle must not
  // refetch). Mirrors the pattern used by the Calls / Digest views.
  const tRef = useRef(t);
  tRef.current = t;

  // Loads one month's rows. Called from the mount effect and after a generate /
  // never via a reactive state change (loop-safe). `force` re-fetches even when a
  // cache entry exists.
  const loadMonth = async (monthKey: string, force = false) => {
    if (!monthKey) return;
    if (!force && cache[monthKey] && !cache[monthKey].error) return;
    setCache((prev) => ({
      ...prev,
      [monthKey]: { loading: true, items: prev[monthKey]?.items ?? null, error: false },
    }));
    try {
      const res = await fetch(`${ROUTES.api.fulfillment.list}?month=${encodeURIComponent(monthKey)}`);
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        items?: Row[];
        error?: string;
      };
      if (!res.ok || json.ok !== true) throw new Error(json.error ?? "load_failed");
      setCache((prev) => ({
        ...prev,
        [monthKey]: { loading: false, items: json.items ?? [], error: false },
      }));
    } catch (err) {
      setCache((prev) => ({
        ...prev,
        [monthKey]: { loading: false, items: prev[monthKey]?.items ?? null, error: true },
      }));
      toast.error(tRef.current("fulfillment.loadError"));
      // eslint-disable-next-line no-console
      console.error("fulfillment_load_failed", err);
    }
  };

  // Loop-safe: depend on the primitive `month` only; short-circuit on the
  // presence of ANY cache entry (incl. the in-flight loading state), not on
  // loaded data. See the useEffect-loop guidance in CLAUDE.md.
  useEffect(() => {
    if (notConfigured || !month) return;
    if (cache[month]) return;
    void loadMonth(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, notConfigured]);

  const toggle = async (rowId: string, stage: FulfillmentStage, next: boolean) => {
    const field = STAGE_FIELD[stage];
    let snapshot: Row[] | null = null;
    setCache((prev) => {
      const cur = prev[month];
      if (!cur || !cur.items) return prev;
      snapshot = cur.items;
      return {
        ...prev,
        [month]: {
          ...cur,
          items: cur.items.map((r) => (r.id === rowId ? { ...r, [field]: next } : r)),
        },
      };
    });
    try {
      const res = await fetch(ROUTES.api.fulfillment.item(rowId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: stage, value: next }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok !== true) throw new Error(json.error ?? "update_failed");
    } catch (err) {
      if (snapshot) {
        const restore = snapshot;
        setCache((prev) => ({
          ...prev,
          [month]: { ...prev[month], items: restore },
        }));
      }
      toast.error(tRef.current("fulfillment.toast.updateError"));
      // eslint-disable-next-line no-console
      console.error("fulfillment_toggle_failed", err);
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(ROUTES.api.fulfillment.generate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        created?: { name: string }[];
        skipped?: number;
        failed?: { name: string; error: string }[];
        error?: string;
      };
      if (!res.ok || json.ok !== true) throw new Error(json.error ?? "generate_failed");
      const createdCount = json.created?.length ?? 0;
      const failedCount = json.failed?.length ?? 0;
      if (failedCount > 0) {
        toast.warning(
          t("fulfillment.generate.partial")
            .replace("{count}", String(createdCount))
            .replace("{failed}", String(failedCount)),
        );
      } else if (createdCount === 0) {
        toast.info(t("fulfillment.generate.none"));
      } else {
        toast.success(t("fulfillment.generate.success").replace("{count}", String(createdCount)));
      }
      await loadMonth(month, true);
    } catch (err) {
      toast.error(t("fulfillment.generate.error"));
      // eslint-disable-next-line no-console
      console.error("fulfillment_generate_failed", err);
    } finally {
      setGenerating(false);
    }
  };

  if (notConfigured) {
    return (
      <div className="mx-auto max-w-screen-xl px-6 py-10">
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t("fulfillment.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("fulfillment.notConfigured")}</p>
      </div>
    );
  }

  const state = cache[month];
  const items = state?.items ?? null;
  const monthLabel = formatMonth(month, locale);

  // Client-side filter only (no extra fetch): when the toggle is off, hide the
  // not-active (Paused/Inactive) rows entirely.
  const displayedItems = useMemo(
    () => (items === null ? null : showMuted ? items : items.filter((r) => !r.muted)),
    [items, showMuted],
  );

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">{t("fulfillment.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("fulfillment.subtitle")}</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={t("fulfillment.month.prev")}
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <span className="min-w-[140px] text-center text-sm font-medium text-foreground">
          {monthLabel}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("fulfillment.month.next")}
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setMonth(initialMonth)}>
          {t("fulfillment.month.current")}
        </Button>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 cursor-pointer accent-primary"
            checked={showMuted}
            onChange={(e) => toggleShowMuted(e.target.checked)}
          />
          {t("fulfillment.showMuted")}
        </label>
        <Button size="sm" onClick={generate} disabled={generating}>
          {generating ? t("fulfillment.generating") : t("fulfillment.generate")}
        </Button>
      </div>

      {state?.loading && items === null ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("fulfillment.loading")}</p>
      ) : state?.error && items === null ? (
        <p className="text-sm text-destructive">{t("fulfillment.error")}</p>
      ) : items && items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("fulfillment.empty")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("fulfillment.emptyHint")}</p>
        </div>
      ) : displayedItems ? (
        <FulfillmentTable items={displayedItems} onToggle={toggle} />
      ) : null}
    </div>
  );
}

function formatMonth(monthKey: string, locale: string): string {
  if (!monthKey) return "";
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function FulfillmentTable({
  items,
  onToggle,
}: {
  items: Row[];
  onToggle: (rowId: string, stage: FulfillmentStage, next: boolean) => void;
}) {
  const t = useT();
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse font-sans text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="w-10 px-3 py-2 text-left font-medium text-muted-foreground">
              {t("fulfillment.col.number")}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              {t("fulfillment.col.name")}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              {t("fulfillment.col.status")}
            </th>
            {FULFILLMENT_STAGES.map((stage) => (
              <th
                key={stage}
                className="px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap"
              >
                {t(`fulfillment.stage.${stage}` as TranslationKey)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr
              key={row.id}
              className={`border-t border-border ${row.muted ? "opacity-50" : ""}`}
            >
              <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-foreground">
                <div className="max-w-[160px] truncate" title={row.clientName}>
                  {row.clientName}
                </div>
              </td>
              <td className="px-3 py-2">
                <StatusPill status={row.clientStatus} />
              </td>
              {FULFILLMENT_STAGES.map((stage) => {
                const checked = row[STAGE_FIELD[stage]];
                return (
                  <td key={stage} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                      checked={checked}
                      disabled={row.muted}
                      aria-label={t(`fulfillment.stage.${stage}` as TranslationKey)}
                      onChange={(e) => onToggle(row.id, stage, e.target.checked)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Status pill coloured by the client's Notion status via the shared, theme-aware
// pill helpers (Active=green, Reduced=yellow, Paused/Inactive/unknown=gray).
function StatusPill({ status }: { status: string | null }) {
  const t = useT();
  const colour = clientStatusColour(status);
  return (
    <span
      className="inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: notionColourBg(colour), color: notionColourText(colour) }}
    >
      {status ?? t("fulfillment.status.unknown")}
    </span>
  );
}
