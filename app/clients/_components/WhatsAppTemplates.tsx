"use client";

import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n";
import { MONTHLY_TASK_NAMES, type MonthlyTaskName } from "@/constants/client-tasks";
import type { TranslationKey } from "@/constants/translations";
import { formatEur, type ZohoInvoice } from "./types";

function templateKey(name: MonthlyTaskName): TranslationKey {
  return `clients.whatsapp.template.${name}` as TranslationKey;
}

function taskLabelKey(name: MonthlyTaskName): TranslationKey {
  return `clients.task.${name}` as TranslationKey;
}

// Format the amount without the currency symbol since the template already includes €.
// Locale-aware decimal grouping is still useful (1.234,56 vs 1,234.56).
function formatAmountPlain(amount: number, locale: "de" | "en"): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

// E.164-ish normalisation: strip everything except digits and a leading "+".
// wa.me wants digits only (no "+", no spaces). Returns null if nothing usable.
function normalisePhoneForWaMe(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d]/g, "");
  return digits.length >= 7 ? digits : null;
}

export function WhatsAppTemplates({
  clientName,
  phone,
  outstandingAmount,
  invoices,
}: {
  clientName: string;
  phone: string;
  outstandingAmount: number;
  invoices: ZohoInvoice[];
}) {
  const t = useT();
  const [locale] = useLocale();

  const waNumber = normalisePhoneForWaMe(phone);
  const amountStr = formatAmountPlain(outstandingAmount, locale);
  // Earliest unpaid invoice's due date — feeds the Prepare Call template's urgency.
  const earliestDue = invoices
    .filter((i) => i.due_date)
    .map((i) => i.due_date)
    .sort()[0] ?? "";

  const vars: Record<string, string> = {
    name: clientName || "",
    amount: amountStr,
    due_date: earliestDue,
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("clients.whatsapp.copied"));
    } catch {
      toast.error(t("clients.whatsapp.errorCopy"));
    }
  };

  return (
    <ul className="space-y-3">
      {MONTHLY_TASK_NAMES.map((name) => {
        const text = fillTemplate(t(templateKey(name)), vars);
        const waUrl = waNumber
          ? `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`
          : null;
        return (
          <li
            key={name}
            className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t(taskLabelKey(name))}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{text}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copy(text)}>
                <Copy className="size-3.5" />
                <span className="ml-1.5">{t("clients.whatsapp.copy")}</span>
              </Button>
              {waUrl ? (
                <Button asChild size="sm">
                  <a href={waUrl} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-3.5" />
                    <span className="ml-1.5">{t("clients.whatsapp.open")}</span>
                  </a>
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
