"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import type { EinnahmenClientRow, EinnahmenGrid } from "@/lib/einnahmen";
import { EinnahmenGridTable } from "./EinnahmenGrid";
import { ClientDetailDrawer } from "./ClientDetailDrawer";
import type { GridState } from "./types";

type Props = {
  initialGrid: EinnahmenGrid | null;
  initialYear: number;
  currentYear: number;
  currentMonthIndex: number;
  notConfigured?: boolean;
};

export function EinnahmenView({
  initialGrid,
  initialYear,
  currentYear,
  currentMonthIndex,
  notConfigured,
}: Props) {
  const t = useT();
  const [year, setYear] = useState(initialYear);
  const [cache, setCache] = useState<Record<number, GridState>>(() =>
    initialGrid ? { [initialYear]: { loading: false, grid: initialGrid, error: false } } : {},
  );
  const [selectedZohoId, setSelectedZohoId] = useState<string | null>(null);

  // tRef so the fetch helper never depends on `t` — a locale toggle must not
  // refetch (same pattern as FulfillmentView / Calls / Digest).
  const tRef = useRef(t);
  tRef.current = t;

  // Loads one year's grid. Called from the mount/year effect, never via a
  // reactive state change (loop-safe). `force` re-fetches even when cached.
  const loadYear = async (y: number, force = false) => {
    if (!y) return;
    if (!force && cache[y] && !cache[y].error) return;
    setCache((prev) => ({
      ...prev,
      [y]: { loading: true, grid: prev[y]?.grid ?? null, error: false },
    }));
    try {
      const res = await fetch(`${ROUTES.api.einnahmen.grid}?year=${encodeURIComponent(y)}`);
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        grid?: EinnahmenGrid;
        error?: string;
      };
      if (!res.ok || json.ok !== true || !json.grid) throw new Error(json.error ?? "load_failed");
      setCache((prev) => ({ ...prev, [y]: { loading: false, grid: json.grid!, error: false } }));
    } catch (err) {
      setCache((prev) => ({
        ...prev,
        [y]: { loading: false, grid: prev[y]?.grid ?? null, error: true },
      }));
      toast.error(tRef.current("einnahmen.error"));
      // eslint-disable-next-line no-console
      console.error("einnahmen_load_failed", err);
    }
  };

  // Loop-safe: depend on the primitive `year` only; short-circuit on the presence
  // of ANY cache entry (incl. the in-flight loading state), not on loaded data.
  useEffect(() => {
    if (notConfigured || !year) return;
    if (cache[year]) return;
    void loadYear(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, notConfigured]);

  if (notConfigured) {
    return (
      <div className="mx-auto max-w-screen-xl px-2 py-10">
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t("einnahmen.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("einnahmen.notConfigured")}</p>
      </div>
    );
  }

  const state = cache[year];
  const grid = state?.grid ?? null;
  const selectedClient: EinnahmenClientRow | null =
    grid?.clients.find((c) => c.zohoContactId === selectedZohoId) ?? null;

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("einnahmen.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("einnahmen.subtitle")}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={t("einnahmen.year.prev")}
            onClick={() => setYear((y) => y - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="min-w-[64px] text-center text-base font-semibold tabular-nums text-foreground">
            {year}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label={t("einnahmen.year.next")}
            onClick={() => setYear((y) => y + 1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={year === currentYear}
            onClick={() => setYear(currentYear)}
          >
            {t("einnahmen.year.current")}
          </Button>
        </div>
      </header>

      {state?.loading && !grid ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("einnahmen.loading")}</p>
      ) : state?.error && !grid ? (
        <p className="py-10 text-center text-sm text-destructive">{t("einnahmen.error")}</p>
      ) : grid && grid.clients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">{t("einnahmen.empty")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("einnahmen.emptyHint")}</p>
        </div>
      ) : grid ? (
        <EinnahmenGridTable
          grid={grid}
          year={year}
          currentYear={currentYear}
          currentMonthIndex={currentMonthIndex}
          onSelect={setSelectedZohoId}
        />
      ) : null}

      <ClientDetailDrawer
        open={selectedZohoId !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedZohoId(null);
        }}
        client={selectedClient}
        year={year}
        currentYear={currentYear}
        currentMonthIndex={currentMonthIndex}
      />
    </div>
  );
}
