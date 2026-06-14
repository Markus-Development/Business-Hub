import "server-only";

// Einnahmen tab — server-side assembler (Phase 1, read-only).
// Joins the Notion Clients DB (Name + Zoho Contact ID + Monthly Fee) with the
// org-wide Zoho invoices + customer payments for a year into a 12-month revenue
// grid. Pure read path: no Supabase, no writes. Forecast-overrides, non-Zoho rows
// and configurable costs are deferred — TODO markers below show where each layers
// in additively.

import { listNotionClients } from "@/lib/notion";
import {
  listCustomerPaymentsForYear,
  listInvoicesForYear,
  type ZohoYearInvoice,
  type ZohoYearPayment,
} from "@/lib/zoho";
import { getUserSettings } from "@/lib/settings";
import { todayInTz } from "@/lib/tz";
import {
  DEFAULT_MONTHLY_COSTS,
  monthIndexFromIso,
  paymentLabel,
  type CellStatus,
} from "@/constants/einnahmen";

const MONTHS = 12;

// ----- Public types ---------------------------------------------------------

export type EinnahmenCell = {
  status: CellStatus | null; // null = empty cell (no invoice and no forecast)
  amount: number; // net amount (0 for an empty cell)
  invoiceSent: boolean; // true when an actual invoice backs the cell
};

export type EinnahmenFooter = {
  real: number; // sum of paid
  ueberfaellig: number; // sum of overdue
  zukunft: number; // sum of open + forecast
  gesamt: number; // real + zukunft + ueberfaellig
  kosten: number; // DEFAULT_MONTHLY_COSTS (Phase 1 placeholder)
  gewinn: number; // gesamt - kosten
};

export type EinnahmenClientRow = {
  zohoContactId: string;
  name: string;
  monthlyFee: number;
  cells: EinnahmenCell[]; // length 12, Jan..Dec
};

export type EinnahmenGrid = {
  year: number;
  months: number; // always 12
  clients: EinnahmenClientRow[];
  footer: EinnahmenFooter[]; // length 12, Jan..Dec
};

export type EinnahmenPayment = {
  paymentId: string;
  date: string;
  amount: number;
  label: string; // human account/method label, e.g. "Stripe"
  referenceNumber: string | null;
  monthIndex: number | null; // assigned month (via invoice_numbers, else payment date)
};

export type EinnahmenClientDetail = {
  zohoContactId: string;
  name: string;
  year: number;
  cells: EinnahmenCell[]; // length 12
  payments: EinnahmenPayment[]; // newest first
};

// ----- In-memory year cache (~5 min, keyed on year) -------------------------
// Mirrors the token-cache pattern in lib/zoho.ts — buffers repeated grid loads
// within a few minutes. NOT a Supabase cache (deliberately out of scope here).

const ZOHO_YEAR_TTL_MS = 5 * 60 * 1000;

type ZohoYear = {
  invoices: ZohoYearInvoice[];
  payments: ZohoYearPayment[];
  expiresAt: number;
};

const zohoYearCache = new Map<number, ZohoYear>();

async function loadZohoYear(
  year: number,
): Promise<{ invoices: ZohoYearInvoice[]; payments: ZohoYearPayment[] }> {
  const cached = zohoYearCache.get(year);
  if (cached && cached.expiresAt > Date.now()) {
    return { invoices: cached.invoices, payments: cached.payments };
  }
  const [invoices, payments] = await Promise.all([
    listInvoicesForYear(year),
    listCustomerPaymentsForYear(year),
  ]);
  zohoYearCache.set(year, { invoices, payments, expiresAt: Date.now() + ZOHO_YEAR_TTL_MS });
  return { invoices, payments };
}

// ----- Cell + footer builders ----------------------------------------------

function emptyCell(): EinnahmenCell {
  return { status: null, amount: 0, invoiceSent: false };
}

function groupInvoicesByCustomer(invoices: ZohoYearInvoice[]): Map<string, ZohoYearInvoice[]> {
  const map = new Map<string, ZohoYearInvoice[]>();
  for (const inv of invoices) {
    if (!inv.customer_id) continue;
    const arr = map.get(inv.customer_id);
    if (arr) arr.push(inv);
    else map.set(inv.customer_id, [inv]);
  }
  return map;
}

// Build the 12 month cells for one client. `today` is a "YYYY-MM-DD" string in
// the user's timezone, compared lexicographically against due_date (both ISO).
function buildCells(
  customerInvoices: ZohoYearInvoice[],
  monthlyFee: number,
  today: string,
): EinnahmenCell[] {
  const byMonth: ZohoYearInvoice[][] = Array.from({ length: MONTHS }, () => []);
  for (const inv of customerInvoices) {
    const mi = monthIndexFromIso(inv.date);
    if (mi >= 0) byMonth[mi].push(inv);
  }

  const cells: EinnahmenCell[] = [];
  for (let m = 0; m < MONTHS; m++) {
    const invs = byMonth[m];
    if (invs.length > 0) {
      // Multiple invoices in one month are aggregated (usually there is one).
      const total = invs.reduce((s, i) => s + i.total, 0);
      const balance = invs.reduce((s, i) => s + i.balance, 0);
      let status: CellStatus;
      if (balance <= 0) status = "paid";
      else if (invs.some((i) => i.due_date && i.due_date < today)) status = "overdue";
      else status = "open";
      cells.push({ status, amount: total, invoiceSent: true });
    } else if (monthlyFee > 0) {
      // TODO Phase 3: forecast overrides (per client/month) layer in here additively.
      cells.push({ status: "forecast", amount: monthlyFee, invoiceSent: false });
    } else {
      cells.push(emptyCell());
    }
  }
  return cells;
}

// Footer profit formula derived from Markus' sheet:
//   gesamt = real + zukunft + ueberfaellig;  gewinn = gesamt - kosten.
function buildFooter(rows: EinnahmenClientRow[]): EinnahmenFooter[] {
  const footer: EinnahmenFooter[] = [];
  for (let m = 0; m < MONTHS; m++) {
    let real = 0;
    let ueberfaellig = 0;
    let zukunft = 0;
    for (const row of rows) {
      const c = row.cells[m];
      if (!c || !c.status) continue;
      if (c.status === "paid") real += c.amount;
      else if (c.status === "overdue") ueberfaellig += c.amount;
      else if (c.status === "open" || c.status === "forecast") zukunft += c.amount;
    }
    const gesamt = real + zukunft + ueberfaellig;
    // TODO Phase 3: replace DEFAULT_MONTHLY_COSTS with a configurable Supabase value.
    const kosten = DEFAULT_MONTHLY_COSTS;
    footer.push({ real, ueberfaellig, zukunft, gesamt, kosten, gewinn: gesamt - kosten });
  }
  return footer;
}

// ----- Public assemblers ----------------------------------------------------

export async function getEinnahmenGrid(year: number): Promise<EinnahmenGrid> {
  const settings = await getUserSettings();
  const today = todayInTz(settings.timezone);

  const [clients, zoho] = await Promise.all([listNotionClients(), loadZohoYear(year)]);
  const byCustomer = groupInvoicesByCustomer(zoho.invoices);

  const rows: EinnahmenClientRow[] = [];
  for (const client of clients) {
    // Join is Notion "Zoho Contact ID" == Zoho customer_id. Unjoined Notion
    // clients have no Zoho rows, so they are skipped here.
    if (!client.zohoContactId) continue;
    const monthlyFee = client.monthlyFee ?? 0;
    const cells = buildCells(byCustomer.get(client.zohoContactId) ?? [], monthlyFee, today);
    rows.push({ zohoContactId: client.zohoContactId, name: client.name, monthlyFee, cells });
  }
  // TODO Phase 3: append non-Zoho manual revenue rows here, additively.

  rows.sort((a, b) => a.name.localeCompare(b.name));

  return { year, months: MONTHS, clients: rows, footer: buildFooter(rows) };
}

export async function getEinnahmenClientDetail(
  zohoContactId: string,
  year: number,
): Promise<EinnahmenClientDetail | null> {
  const settings = await getUserSettings();
  const today = todayInTz(settings.timezone);

  const [clients, zoho] = await Promise.all([listNotionClients(), loadZohoYear(year)]);
  const client = clients.find((c) => c.zohoContactId === zohoContactId);
  if (!client) return null;

  const customerInvoices = zoho.invoices.filter((i) => i.customer_id === zohoContactId);
  const cells = buildCells(customerInvoices, client.monthlyFee ?? 0, today);

  // invoice_number -> month index, so a payment can be mapped to the month of the
  // invoice it settled (via invoice_numbers on the payment).
  const invoiceMonthByNumber = new Map<string, number>();
  for (const inv of customerInvoices) {
    const mi = monthIndexFromIso(inv.date);
    if (inv.invoice_number && mi >= 0) invoiceMonthByNumber.set(inv.invoice_number, mi);
  }

  const payments: EinnahmenPayment[] = zoho.payments
    .filter((p) => p.customer_id === zohoContactId)
    .map((p) => ({
      paymentId: p.payment_id,
      date: p.date,
      amount: p.amount,
      label: paymentLabel(p),
      referenceNumber: p.reference_number || null,
      monthIndex: assignPaymentMonth(p, invoiceMonthByNumber),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // newest first

  return { zohoContactId, name: client.name, year, cells, payments };
}

// Assign a payment to a month: prefer the month of an invoice it was applied to
// (via invoice_numbers), else fall back to the payment's own date.
function assignPaymentMonth(
  p: ZohoYearPayment,
  invoiceMonthByNumber: Map<string, number>,
): number | null {
  const numbers = (p.invoice_numbers ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const n of numbers) {
    const mi = invoiceMonthByNumber.get(n);
    if (mi !== undefined) return mi;
  }
  const fallback = monthIndexFromIso(p.date);
  return fallback >= 0 ? fallback : null;
}
