"use client";

import { useMemo } from "react";
import { useT } from "@/lib/i18n";
import { JOURNAL_KATEGORIEN } from "@/constants/journal";
import type { Erfolg } from "@/lib/journal";
import { ErfolgCard } from "./ErfolgCard";

type Props = { wins: Erfolg[] };

// Kanban of the selected week's wins, grouped into the three Kategorie columns
// (Business / Privat / Weiterbildung), plus a trailing "Ohne Kategorie" column
// for wins whose Kategorie is null / not a known value, so nothing is hidden.
export function WeekKanban({ wins }: Props) {
  const t = useT();

  const columns = useMemo(() => {
    const out: { key: string; title: string; rows: Erfolg[] }[] = JOURNAL_KATEGORIEN.map(
      (kat) => ({ key: kat, title: kat, rows: wins.filter((w) => w.kategorie === kat) }),
    );
    const orphan = wins.filter(
      (w) => w.kategorie == null || !(JOURNAL_KATEGORIEN as readonly string[]).includes(w.kategorie),
    );
    if (orphan.length > 0) {
      out.push({ key: "__none", title: t("journal.card.noArea"), rows: orphan });
    }
    return out;
  }, [wins, t]);

  if (wins.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("journal.week.empty")}</p>;
  }

  return (
    // Stacks on mobile; three equal columns on >= sm. Horizontal scroll guard for
    // the "Ohne Kategorie" overflow column.
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {columns.map((col) => (
        <section key={col.key} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{col.title}</h2>
            <span className="text-xs font-medium text-muted-foreground">{col.rows.length}</span>
          </div>
          <ul className="space-y-2">
            {col.rows.map((w) => (
              <li key={w.id}>
                <ErfolgCard win={w} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
