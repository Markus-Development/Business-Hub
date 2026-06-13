"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { normalizeId, weekRangeLabel, type Erfolg, type JournalWeek } from "@/lib/journal";
import { ErfolgCard } from "./ErfolgCard";

const ALL = "__all";
const NO_WEEK = "__noweek";

type Props = { erfolge: Erfolg[]; weeks: JournalWeek[] };

// Per-area timeline: pick an Area tag (or all) and see every win of that area
// chronologically across all weeks, newest week first. Wins are grouped under
// their week (resolved via the "Woche" relation → week.weekStart).
export function AreaTimeline({ erfolge, weeks }: Props) {
  const t = useT();
  const [area, setArea] = useState<string>("");

  // Area tags present in the data, A–Z.
  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of erfolge) if (e.area) set.add(e.area);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [erfolge]);

  // week id (normalized) → its Monday start, for sorting/grouping.
  const weekStartById = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of weeks) if (w.weekStart) map.set(normalizeId(w.id), w.weekStart);
    return map;
  }, [weeks]);

  const filtered = useMemo(
    () => (area ? erfolge.filter((e) => e.area === area) : erfolge),
    [erfolge, area],
  );

  // Group wins by their (first resolvable) week start. Unscheduled wins bucket
  // under NO_WEEK. Groups sort newest-week-first; NO_WEEK sinks to the bottom.
  const groups = useMemo(() => {
    const byWeek: Record<string, Erfolg[]> = {};
    for (const e of filtered) {
      const wid = e.weekIds.map((id) => weekStartById.get(normalizeId(id))).find(Boolean);
      const key = wid ?? NO_WEEK;
      (byWeek[key] ??= []).push(e);
    }
    return Object.entries(byWeek).sort(([a], [b]) => {
      if (a === NO_WEEK) return 1;
      if (b === NO_WEEK) return -1;
      return b.localeCompare(a); // ISO dates sort lexicographically = chronologically
    });
  }, [filtered, weekStartById]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("journal.timeline.areaLabel")}</span>
        <Select value={area || ALL} onValueChange={(v) => setArea(v === ALL ? "" : v)}>
          <SelectTrigger className="h-9 w-[200px] text-sm">
            <SelectValue placeholder={t("journal.timeline.allAreas")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("journal.timeline.allAreas")}</SelectItem>
            {areaOptions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("journal.timeline.empty")}</p>
      ) : (
        <div className="space-y-5">
          {groups.map(([key, rows]) => (
            <section key={key} className="space-y-2">
              <h2 className="font-mono text-sm font-medium text-foreground">
                {key === NO_WEEK ? t("journal.timeline.unscheduled") : weekRangeLabel(key)}
              </h2>
              <ul className="space-y-2">
                {rows.map((w) => (
                  <li key={w.id}>
                    <ErfolgCard win={w} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
