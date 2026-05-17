"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import type { AreaUpdateField, NotionArea } from "@/lib/notion";
import { AreaCard } from "./AreaCard";
import { AreaDrawer } from "./AreaDrawer";

type Props = {
  areas: NotionArea[];
  projectCounts: Record<string, number>;
  notConfigured?: boolean;
};

export function AreasView({ areas: initialAreas, projectCounts, notConfigured }: Props) {
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
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <header className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">{t("areas.title")}</h1>
      </header>

      {areas.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("areas.empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              activeProjectCount={projectCounts[area.name] ?? 0}
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
