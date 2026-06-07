"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import type { AreaUpdateField, NotionArea } from "@/lib/notion";
import { AreaCard } from "./AreaCard";
import { AreaDrawer } from "./AreaDrawer";

const normalize = (name: string) => name.replace(/ \(v\d+\)$/, "").trim();

type Props = {
  areas: NotionArea[];
  projectCounts: Record<string, number>;
  overdueCounts: Record<string, number>;
  notConfigured?: boolean;
};

export function AreasView({
  areas: initialAreas,
  projectCounts,
  overdueCounts,
  notConfigured,
}: Props) {
  const t = useT();
  const [areas, setAreas] = useState<NotionArea[]>(initialAreas);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  const tRef = useRef(t);
  tRef.current = t;

  const applyLocalEdit = useCallback((id: string, field: AreaUpdateField, value: string) => {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        switch (field) {
          case "Status":
            return { ...a, status: value };
          case "Current Milestone":
            return { ...a, currentMilestone: value };
          case "Next Steps":
            return { ...a, nextSteps: value };
          case "Next Focus":
            return { ...a, nextFocus: value };
          case "Goal":
            return { ...a, goal: value };
        }
      }),
    );
  }, []);

  // Optimistic write: update local state, PATCH Notion, revert + toast on failure.
  const persist = useCallback(
    async (id: string, field: AreaUpdateField, value: string) => {
      const prevArea = areas.find((a) => a.id === id);
      if (!prevArea) return;
      const previousValue = readField(prevArea, field) ?? "";
      if (previousValue === value) return;

      applyLocalEdit(id, field, value);
      try {
        const res = await fetch(ROUTES.api.areas.update(id), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ field, value }),
        });
        if (!res.ok) throw new Error(`http_${res.status}`);
      } catch (err) {
        applyLocalEdit(id, field, previousValue);
        toast.error(tRef.current("areas.updateError"));
        // eslint-disable-next-line no-console
        console.error("area_update_failed", err);
      }
    },
    [areas, applyLocalEdit],
  );

  const selectedArea = useMemo(
    () => (selectedAreaId ? areas.find((a) => a.id === selectedAreaId) ?? null : null),
    [areas, selectedAreaId],
  );

  if (notConfigured) {
    return (
      <div className="mx-auto max-w-screen-xl px-6 py-10">
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t("areas.title")}</h1>
        <p className="text-sm text-muted-foreground">
          NOTION_AREAS_DB_ID is not set. Run scripts/create-areas-db.mjs and add the
          generated ID to .env.local.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <header className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">{t("areas.title")}</h1>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.pages.areasReview}>
            <ClipboardCheck className="mr-1.5 h-4 w-4" />
            {t("areas.review")}
          </Link>
        </Button>
      </header>

      <FocusHeader />

      {areas.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("areas.empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              activeProjectCount={projectCounts[normalize(area.name)] ?? 0}
              overdueCount={overdueCounts[normalize(area.name)] ?? 0}
              onOpen={() => setSelectedAreaId(area.id)}
              onPersist={(field, value) => persist(area.id, field, value)}
            />
          ))}
        </div>
      )}

      <AreaDrawer
        area={selectedArea}
        open={selectedArea !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAreaId(null);
        }}
        onPersist={persist}
      />
    </div>
  );
}

function readField(area: NotionArea, field: AreaUpdateField): string | null {
  switch (field) {
    case "Status":
      return area.status;
    case "Current Milestone":
      return area.currentMilestone;
    case "Next Steps":
      return area.nextSteps;
    case "Next Focus":
      return area.nextFocus;
    case "Goal":
      return area.goal;
  }
}

type FocusResponse = { summary: string | null; error?: string; cached?: boolean };

// AI-generated strategic summary at the top of the Areas tab. Reads roadmap.md
// server-side and asks Haiku for a 2–3 sentence focus pointer. Server-side cache
// has a 1h TTL; the Refresh button busts that cache via ?bust=<ts>.
function FocusHeader() {
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;

  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFocus = useCallback(async (bust = false) => {
    setLoading(true);
    try {
      const url = bust
        ? `${ROUTES.api.areas.focus}?bust=${Date.now()}`
        : ROUTES.api.areas.focus;
      const res = await fetch(url, { cache: "no-store" });
      const body = (await res.json()) as FocusResponse;
      setSummary(body.summary ?? null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("areas_focus_fetch_failed", err);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFocus(false);
  }, [fetchFocus]);

  if (loading && !summary) {
    return (
      <section className="mb-5 rounded-xl border border-primary/15 bg-primary/5 px-5 py-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" aria-label={t("areas.focus.loading")} />
      </section>
    );
  }

  if (!summary) return null;

  return (
    <section className="mb-5 rounded-xl border border-primary/15 bg-primary/5 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-wide text-primary">
            {t("areas.focus.title")}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => fetchFocus(true)}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <RefreshCw size={12} aria-hidden className={loading ? "animate-spin" : undefined} />
          {t("areas.focus.refresh")}
        </Button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{summary}</p>
    </section>
  );
}
