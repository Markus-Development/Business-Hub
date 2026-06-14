"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import type { Locale } from "@/constants/translations";
import type { EinnahmenClientDetail, EinnahmenClientRow } from "@/lib/einnahmen";
import { cellTone, detailKey, formatDate, formatEur, monthLabels, type DetailState } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: EinnahmenClientRow | null; // header + timeline (cells) come from the grid row
  year: number;
  currentYear: number;
  currentMonthIndex: number;
};

export function ClientDetailDrawer({
  open,
  onOpenChange,
  client,
  year,
  currentYear,
  currentMonthIndex,
}: Props) {
  const t = useT();
  const [locale] = useLocale();
  const [cache, setCache] = useState<Record<string, DetailState>>({});

  const zohoId = client?.zohoContactId ?? "";
  const key = zohoId ? detailKey(zohoId, year) : "";

  // Lazy-fetch the payment history on open. Loop-safe: primitive deps only, guard
  // short-circuits on the presence of ANY entry for the key (incl. the in-flight
  // loading state), not on loaded data.
  useEffect(() => {
    if (!open || !zohoId || !key) return;
    if (cache[key]) return;
    let cancelled = false;
    setCache((prev) => ({ ...prev, [key]: { loading: true, detail: null, error: false } }));
    fetch(`${ROUTES.api.einnahmen.client(zohoId)}?year=${encodeURIComponent(year)}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; detail?: EinnahmenClientDetail; error?: string }) => {
        if (cancelled) return;
        if (!j?.ok || !j.detail) throw new Error(j?.error || "failed");
        setCache((prev) => ({ ...prev, [key]: { loading: false, detail: j.detail!, error: false } }));
      })
      .catch(() => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [key]: { loading: false, detail: null, error: true } }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, zohoId, key]);

  const state = key ? cache[key] : undefined;
  const months = monthLabels(locale);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[min(90vw,640px)] flex-col gap-0 p-0 sm:max-w-[min(90vw,640px)]"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="truncate text-lg font-semibold text-foreground">
            {client?.name ?? t("einnahmen.drawer.title")}
          </SheetTitle>
          {client ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wallet className="size-3.5" aria-hidden />
              {t("einnahmen.drawer.monthlyFee")}: {formatEur(client.monthlyFee, locale)}
            </p>
          ) : null}
        </SheetHeader>

        {client ? (
          <div className="flex-1 overflow-y-auto">
            {/* Year timeline — 12 ampel dots straight from the grid row (no fetch). */}
            <section className="border-b border-border px-5 py-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("einnahmen.drawer.timeline")} {year}
              </h3>
              <div className="grid grid-cols-6 gap-2">
                {client.cells.map((cell, m) => (
                  <TimelineDot
                    key={m}
                    label={months[m]}
                    status={cell.status}
                    amount={cell.amount}
                    locale={locale}
                    isCurrent={year === currentYear && m === currentMonthIndex}
                  />
                ))}
              </div>
            </section>

            {/* Payment history — lazy from /api/einnahmen/client/<id>. */}
            <section className="px-5 py-4">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("einnahmen.drawer.payments")}
              </h3>
              <PaymentHistory state={state} locale={locale} months={months} />
            </section>
          </div>
        ) : null}

        <SheetFooter className="border-t border-border px-5 py-3">
          <SheetClose asChild>
            <Button variant="outline" size="sm">
              {t("projects.drawer.close")}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TimelineDot({
  label,
  status,
  amount,
  locale,
  isCurrent,
}: {
  label: string;
  status: EinnahmenClientRow["cells"][number]["status"];
  amount: number;
  locale: Locale;
  isCurrent: boolean;
}) {
  const tone = cellTone(status);
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex h-9 w-full items-center justify-center rounded-md border text-[10px] font-medium tabular-nums"
        style={
          tone
            ? {
                backgroundColor: tone.bg,
                color: tone.text,
                borderColor: tone.border,
                borderStyle: status === "forecast" ? "dashed" : "solid",
              }
            : undefined
        }
      >
        {status ? formatEur(amount, locale) : ""}
      </div>
      <span className={isCurrent ? "text-[10px] font-semibold text-primary" : "text-[10px] text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}

function PaymentHistory({
  state,
  locale,
  months,
}: {
  state: DetailState | undefined;
  locale: Locale;
  months: string[];
}) {
  const t = useT();

  if (!state || state.loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-8 w-full rounded bg-muted/60" />
        <div className="h-8 w-full rounded bg-muted/60" />
        <div className="h-8 w-3/4 rounded bg-muted/60" />
      </div>
    );
  }
  if (state.error) {
    return <p className="text-sm text-destructive">{t("einnahmen.drawer.paymentsError")}</p>;
  }
  const payments = state.detail?.payments ?? [];
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("einnahmen.drawer.noPayments")}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              {t("einnahmen.payment.date")}
            </th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">
              {t("einnahmen.payment.amount")}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              {t("einnahmen.payment.account")}
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
              {t("einnahmen.payment.month")}
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.paymentId} className="border-t border-border align-top">
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(p.date, locale)}
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">
                {formatEur(p.amount, locale, { cents: true })}
              </td>
              <td className="px-3 py-2 text-foreground">
                <span>{p.label || "—"}</span>
                {p.referenceNumber ? (
                  <span
                    className="block truncate text-[11px] text-muted-foreground"
                    title={`${t("einnahmen.payment.reference")}: ${p.referenceNumber}`}
                  >
                    {p.referenceNumber}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                {p.monthIndex !== null && p.monthIndex >= 0
                  ? months[p.monthIndex]
                  : t("einnahmen.payment.unassigned")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
