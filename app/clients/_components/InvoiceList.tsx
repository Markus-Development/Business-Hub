"use client";

import { useLocale, useT } from "@/lib/i18n";
import type { TranslationKey } from "@/constants/translations";
import { formatEur, type ZohoInvoice } from "./types";

const MAX_VISIBLE = 10;

function statusKey(status: string): TranslationKey {
  switch (status) {
    case "paid":
      return "clients.invoiceStatus.paid";
    case "overdue":
      return "clients.invoiceStatus.overdue";
    case "partially_paid":
      return "clients.invoiceStatus.partially_paid";
    case "draft":
      return "clients.invoiceStatus.draft";
    case "sent":
      return "clients.invoiceStatus.sent";
    case "viewed":
      return "clients.invoiceStatus.viewed";
    case "void":
      return "clients.invoiceStatus.void";
    default:
      return "clients.invoiceStatus.unpaid";
  }
}

function statusTone(status: string): string {
  if (status === "overdue") return "bg-destructive/15 text-destructive";
  if (status === "paid") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (status === "partially_paid") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

function formatDate(iso: string, locale: "de" | "en"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function InvoiceList({ invoices }: { invoices: ZohoInvoice[] }) {
  const t = useT();
  const [locale] = useLocale();
  const visible = invoices.slice(0, MAX_VISIBLE);

  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("clients.invoices.empty")}</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">{t("clients.invoices.number")}</th>
            <th className="px-3 py-2">{t("clients.invoices.date")}</th>
            <th className="px-3 py-2">{t("clients.invoices.dueDate")}</th>
            <th className="px-3 py-2 text-right">{t("clients.invoices.amount")}</th>
            <th className="px-3 py-2">{t("clients.invoices.status")}</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((inv) => (
            <tr key={inv.invoice_id} className="border-t border-border">
              <td className="px-3 py-2 font-mono text-xs text-foreground">
                {inv.invoice_number || inv.invoice_id}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {formatDate(inv.date, locale)}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {formatDate(inv.due_date, locale)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                {formatEur(inv.balance, locale)}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusTone(inv.status)}`}
                >
                  {t(statusKey(inv.status))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {invoices.length > MAX_VISIBLE ? (
        <div className="border-t border-border bg-card px-3 py-2 text-right text-xs">
          <a
            href="https://books.zoho.com/app#/invoices"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {t("clients.invoices.viewAll")} →
          </a>
        </div>
      ) : null}
    </div>
  );
}
