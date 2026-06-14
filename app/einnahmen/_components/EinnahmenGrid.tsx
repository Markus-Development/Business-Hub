"use client";

import { Send } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Locale, TranslationKey } from "@/constants/translations";
import type { EinnahmenCell, EinnahmenGrid } from "@/lib/einnahmen";
import { cellTone, footerDotVar, formatEur, monthLabels } from "./types";

type Props = {
  grid: EinnahmenGrid;
  year: number;
  currentYear: number;
  currentMonthIndex: number;
  onSelect: (zohoId: string) => void;
};

// Sticky client column + sticky month header inside a horizontally-scrolling
// container (same convention as the Resources table). The footer is a <tfoot> in
// the same table so its columns align with the body and scroll together.
export function EinnahmenGridTable({ grid, year, currentYear, currentMonthIndex, onSelect }: Props) {
  const t = useT();
  const [locale] = useLocale();
  const months = monthLabels(locale);
  const showCurrent = year === currentYear;

  // Per-client total across the 12 cells (client-side sum, all statuses).
  const clientTotal = (cells: EinnahmenCell[]) => cells.reduce((s, c) => s + c.amount, 0);

  const monthHeadCls = "sticky top-0 z-10 min-w-[88px] bg-muted px-2 py-2 text-center font-medium";

  return (
    <div className="no-scrollbar overflow-x-auto rounded-lg border border-border">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-40 min-w-[180px] border-b border-border bg-muted px-3 py-2 text-left font-medium text-muted-foreground">
              {t("einnahmen.col.client")}
            </th>
            {months.map((label, m) => (
              <th
                key={m}
                className={cn(
                  monthHeadCls,
                  "border-b border-border whitespace-nowrap",
                  showCurrent && m === currentMonthIndex
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </th>
            ))}
            <th className="sticky top-0 z-10 min-w-[100px] border-b border-l border-border bg-muted px-3 py-2 text-right font-medium text-muted-foreground">
              {t("einnahmen.col.total")}
            </th>
          </tr>
        </thead>

        <tbody>
          {grid.clients.map((row) => (
            <tr key={row.zohoContactId} className="group">
              <td className="sticky left-0 z-20 min-w-[180px] border-b border-border bg-card transition-colors group-hover:bg-muted/40">
                <button
                  type="button"
                  onClick={() => onSelect(row.zohoContactId)}
                  className="block w-full max-w-[200px] truncate px-3 py-2 text-left font-medium text-foreground hover:text-primary"
                  title={row.name}
                >
                  {row.name}
                </button>
              </td>

              {row.cells.map((cell, m) => (
                <Cell
                  key={m}
                  cell={cell}
                  locale={locale}
                  isCurrent={showCurrent && m === currentMonthIndex}
                  sentLabel={t("einnahmen.invoiceSent")}
                />
              ))}

              <td className="border-b border-l border-border px-3 py-2 text-right font-medium tabular-nums text-foreground transition-colors group-hover:bg-muted/40">
                {formatEur(clientTotal(row.cells), locale)}
              </td>
            </tr>
          ))}
        </tbody>

        <FooterBand
          footer={grid.footer}
          locale={locale}
          showCurrent={showCurrent}
          currentMonthIndex={currentMonthIndex}
        />
      </table>
    </div>
  );
}

// ----- One status cell ------------------------------------------------------

function Cell({
  cell,
  locale,
  isCurrent,
  sentLabel,
}: {
  cell: EinnahmenCell;
  locale: Locale;
  isCurrent: boolean;
  sentLabel: string;
}) {
  const tone = cellTone(cell.status);
  if (!tone) {
    // Empty cell — neutral, current month gets a subtle tint.
    return <td className={cn("border-b border-border px-2 py-1.5", isCurrent && "bg-primary/5")} />;
  }
  const forecast = cell.status === "forecast";
  return (
    <td className={cn("border-b border-border px-1.5 py-1.5", isCurrent && "bg-primary/5")}>
      <div
        className="mx-auto flex items-center justify-center gap-1 rounded-md border px-2 py-1"
        style={{
          backgroundColor: tone.bg,
          color: tone.text,
          borderColor: tone.border,
          borderStyle: forecast ? "dashed" : "solid",
        }}
      >
        <span className="tabular-nums text-xs font-medium whitespace-nowrap">
          {formatEur(cell.amount, locale)}
        </span>
        {cell.invoiceSent ? (
          <Send className="size-3 shrink-0 opacity-70" aria-label={sentLabel} />
        ) : null}
      </div>
    </td>
  );
}

// ----- Summary footer band --------------------------------------------------

type FooterMetric = {
  key: string;
  labelKey: TranslationKey;
  pick: (f: EinnahmenGrid["footer"][number]) => number;
  dot: "paid" | "open" | "overdue" | null;
  emphasize?: boolean;
  muted?: boolean;
};

const FOOTER_METRICS: FooterMetric[] = [
  { key: "real", labelKey: "einnahmen.footer.real", pick: (f) => f.real, dot: "paid" },
  { key: "zukunft", labelKey: "einnahmen.footer.zukunft", pick: (f) => f.zukunft, dot: "open" },
  {
    key: "ueberfaellig",
    labelKey: "einnahmen.footer.ueberfaellig",
    pick: (f) => f.ueberfaellig,
    dot: "overdue",
  },
  { key: "gesamt", labelKey: "einnahmen.footer.gesamt", pick: (f) => f.gesamt, dot: null },
  { key: "kosten", labelKey: "einnahmen.footer.kosten", pick: (f) => f.kosten, dot: null, muted: true },
  {
    key: "gewinn",
    labelKey: "einnahmen.footer.gewinn",
    pick: (f) => f.gewinn,
    dot: null,
    emphasize: true,
  },
];

function FooterBand({
  footer,
  locale,
  showCurrent,
  currentMonthIndex,
}: {
  footer: EinnahmenGrid["footer"];
  locale: Locale;
  showCurrent: boolean;
  currentMonthIndex: number;
}) {
  const t = useT();
  return (
    <tfoot>
      {FOOTER_METRICS.map((metric, i) => {
        const values = footer.map(metric.pick);
        const yearTotal = values.reduce((s, v) => s + v, 0);
        const rowTint = metric.emphasize ? "bg-primary/5" : "bg-muted/40";
        const textCls = metric.emphasize
          ? "font-semibold text-foreground"
          : metric.muted
            ? "text-muted-foreground"
            : "text-foreground";
        return (
          <tr key={metric.key}>
            <td
              className={cn(
                "sticky left-0 z-20 min-w-[180px] px-3 py-1.5 font-medium",
                rowTint,
                textCls,
                i === 0 && "border-t-2 border-border",
              )}
            >
              <span className="flex items-center gap-2">
                {metric.dot ? (
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: footerDotVar(metric.dot) }}
                    aria-hidden
                  />
                ) : null}
                {t(metric.labelKey)}
              </span>
            </td>
            {values.map((v, m) => (
              <td
                key={m}
                className={cn(
                  "px-2 py-1.5 text-center tabular-nums",
                  rowTint,
                  textCls,
                  showCurrent && m === currentMonthIndex && "bg-primary/10",
                  i === 0 && "border-t-2 border-border",
                )}
              >
                {formatEur(v, locale)}
              </td>
            ))}
            <td
              className={cn(
                "border-l border-border px-3 py-1.5 text-right tabular-nums",
                rowTint,
                textCls,
                i === 0 && "border-t-2 border-border",
              )}
            >
              {formatEur(yearTotal, locale)}
            </td>
          </tr>
        );
      })}
    </tfoot>
  );
}
