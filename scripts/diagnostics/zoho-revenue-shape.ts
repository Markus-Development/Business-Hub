/**
 * Zoho Books — Revenue-shape diagnostic (ONE-OFF, READ-ONLY)
 * ----------------------------------------------------------
 * Purpose: verify the ACTUAL Zoho response shapes before building the planned
 * "Einnahmen" tab. No assumptions from training data — every field claim below
 * is confirmed against the live API by this script.
 *
 * This is a throwaway spike. It does NOT import or modify lib/zoho.ts; it makes
 * its own minimal axios calls with the ZOHO_* env vars (same token-refresh shape
 * as lib/zoho.ts / the CLAUDE.md snippet) and only ever READS.
 *
 * Run locally (Markus), with .env.local loaded:
 *   npx tsx --env-file=.env.local scripts/diagnostics/zoho-revenue-shape.ts
 *
 * The report goes to the console only. Nothing is written to a committed file.
 * (CLAUDE.md Critical Version Warnings honoured: US data center .com hosts,
 *  organization_id on every request, access-token cache, gentle pacing.)
 */

import axios, { AxiosError } from "axios";

// US data center only — never .eu/.in/.au (CLAUDE.md Critical Version Warnings).
const ACCOUNTS_HOST = "https://accounts.zoho.com";
const API_HOST = "https://www.zohoapis.com/books/v3";

const SAMPLE_CUSTOMERS = 3; // keep the spike small + within rate limits
const SAMPLE_PAID_INVOICES = 5; // Part B needs real payments — drive the sample off paid invoices
const PER_PAGE = 200; // Zoho v3 default + max
const PACE_MS = 350; // ~3 req/sec ceiling — stay well under 100 req/min/org

// --------------------------------------------------------------------------
// env + token
// --------------------------------------------------------------------------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`${name} is not set — required for this diagnostic`);
  }
  return v;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt - Date.now() > 5 * 60 * 1000) {
    return tokenCache.token;
  }
  const { data } = await axios.post(`${ACCOUNTS_HOST}/oauth/v2/token`, null, {
    params: {
      refresh_token: requireEnv("ZOHO_REFRESH_TOKEN"),
      client_id: requireEnv("ZOHO_CLIENT_ID"),
      client_secret: requireEnv("ZOHO_CLIENT_SECRET"),
      grant_type: "refresh_token",
    },
  });
  const token = (data as { access_token?: string }).access_token;
  if (!token) throw new Error("token refresh returned no access_token");
  const expiresInMs = ((data as { expires_in?: number }).expires_in ?? 3600) * 1000;
  tokenCache = { token, expiresAt: Date.now() + expiresInMs };
  return token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function zohoGet<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const token = await accessToken();
  const orgId = requireEnv("ZOHO_ORG_ID");
  try {
    const { data } = await axios.get<T>(`${API_HOST}${path}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      params: { organization_id: orgId, ...params },
    });
    await sleep(PACE_MS);
    return data;
  } catch (err) {
    const e = err as AxiosError;
    const status = e.response?.status;
    const body = e.response?.data as { message?: string } | undefined;
    throw new Error(
      `GET ${path} failed: ${status ? `http_${status}` : e.code ?? "axios"} — ${
        body?.message ?? e.message
      }`,
    );
  }
}

// --------------------------------------------------------------------------
// small reporting helpers
// --------------------------------------------------------------------------

function h1(title: string) {
  console.log(`\n${"=".repeat(72)}\n${title}\n${"=".repeat(72)}`);
}
function h2(title: string) {
  console.log(`\n— ${title} —`);
}

/** Union of top-level keys across a set of objects, with present-count. */
function keyPresence(objects: Array<Record<string, unknown>>): void {
  const counts = new Map<string, number>();
  for (const o of objects) {
    for (const k of Object.keys(o)) {
      // count "meaningfully present" = key exists and is not null/empty-string
      const v = o[k];
      const present = !(v === null || v === undefined || v === "");
      counts.set(k, (counts.get(k) ?? 0) + (present ? 1 : 0));
    }
  }
  const rows = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [k, n] of rows) {
    console.log(`   ${k.padEnd(30)} present in ${n}/${objects.length}`);
  }
}

/** Distinct non-empty values seen for a field across objects (enumerations). */
function distinct(objects: Array<Record<string, unknown>>, field: string): string[] {
  const set = new Set<string>();
  for (const o of objects) {
    const v = o[field];
    if (v !== null && v !== undefined && v !== "") set.add(String(v));
  }
  return [...set].sort();
}

// --------------------------------------------------------------------------
// main
// --------------------------------------------------------------------------

async function main() {
  h1("ZOHO BOOKS — REVENUE-SHAPE DIAGNOSTIC (read-only)");
  console.log(
    `Sampling is DRIVEN BY PAID INVOICES (target ~${SAMPLE_PAID_INVOICES} paid invoices, ` +
      `up to ${SAMPLE_CUSTOMERS} distinct customers) so the payment diagnosis (Part B) hits real payments.`,
  );

  // ---- 1) pick a sample DRIVEN BY PAID INVOICES -------------------------
  // The payment diagnosis (Part B) is only meaningful if the sample contains
  // invoices that were actually paid. So we query status=paid first and derive
  // the customer set from those invoices, instead of "first 3 customers" — that
  // earlier approach could land on unpaid-only customers and leave Part B empty.
  h2("Sampling paid invoices (GET /invoices?status=paid) across the org");
  const paidInvoices = await collectPaidInvoices(SAMPLE_PAID_INVOICES, SAMPLE_CUSTOMERS);
  console.log(`   paid invoices collected: ${paidInvoices.length}`);

  const sample: Array<{ id: string; name: string }> = [];
  const seenCustomer = new Set<string>();
  for (const inv of paidInvoices) {
    const id = inv.customer_id ? String(inv.customer_id) : "";
    if (!id || seenCustomer.has(id)) continue;
    seenCustomer.add(id);
    sample.push({ id, name: String(inv.customer_name ?? "?") });
    if (sample.length >= SAMPLE_CUSTOMERS) break;
  }

  const noPaidInvoices = paidInvoices.length === 0;
  if (noPaidInvoices) {
    console.log(
      "   !! KEINE BEZAHLTEN RECHNUNGEN im Org-Sample gefunden — Teil B (Zahlungen) kann nicht laufen.",
    );
    console.log(
      "   Fallback: nehme die ersten Kunden mit irgendeiner Rechnung, nur damit Teil A (Invoice-Shape) etwas zeigt.",
    );
    sample.push(...(await fallbackCustomersWithAnyInvoice(SAMPLE_CUSTOMERS)));
  }
  if (sample.length === 0) {
    console.log("No customer with invoices found at all — cannot diagnose. Aborting.");
    return;
  }
  console.log(`   sampled customers: ${sample.map((s) => s.name).join(", ")}`);

  // ---- 2) INVOICES: list shape ------------------------------------------
  h1("A) INVOICES — list endpoint (GET /invoices)");
  const invoiceRows: Array<Record<string, unknown>> = [];
  for (const s of sample) {
    const data = await zohoGet<{ invoices?: Array<Record<string, unknown>> }>("/invoices", {
      customer_id: s.id,
      per_page: PER_PAGE,
    });
    invoiceRows.push(...(data.invoices ?? []));
  }
  console.log(`Collected ${invoiceRows.length} invoice rows across the sample.`);

  h2("All top-level keys present on invoice list rows");
  keyPresence(invoiceRows);

  h2("Date-ish fields actually present");
  for (const f of [
    "date",
    "due_date",
    "payment_expected_date",
    "last_payment_date",
    "created_time",
    "last_modified_time",
  ]) {
    const vals = distinct(invoiceRows, f);
    console.log(`   ${f.padEnd(24)} ${vals.length > 0 ? `e.g. ${vals.slice(0, 3).join(", ")}` : "(absent/empty)"}`);
  }

  h2("Distinct status values seen in real data");
  console.log(`   ${distinct(invoiceRows, "status").join(", ") || "(none)"}`);

  h2("Amount fields — NET assessment (total / sub_total / tax_total / balance / payment_made)");
  console.log("   sub_total = pre-tax NET; total = gross; balance = open; payment_made = received");
  for (const inv of invoiceRows.slice(0, 6)) {
    console.log(
      `   #${String(inv.invoice_number ?? inv.invoice_id).padEnd(12)}` +
        ` status=${String(inv.status ?? "").padEnd(15)}` +
        ` total=${fmt(inv.total)} sub_total=${fmt(inv.sub_total)}` +
        ` tax_total=${fmt(inv.tax_total)} balance=${fmt(inv.balance)} payment_made=${fmt(inv.payment_made)}`,
    );
  }

  // ---- 3) INVOICE DETAIL: does it embed payments? -----------------------
  h1("B1) INVOICE DETAIL — GET /invoices/{id} (does it embed payments?)");
  // Prefer a guaranteed-paid invoice so the detail object is most likely to embed payments.
  const detailSample =
    paidInvoices[0] ??
    invoiceRows.find((i) => Number(i.payment_made ?? 0) > 0) ??
    invoiceRows[0];
  if (detailSample) {
    const detail = await zohoGet<{ invoice?: Record<string, unknown> }>(
      `/invoices/${String(detailSample.invoice_id)}`,
    );
    const inv = detail.invoice ?? {};
    h2(`Top-level keys on invoice detail (#${String(inv.invoice_number ?? "?")})`);
    keyPresence([inv]);
    const payments = inv.payments;
    if (Array.isArray(payments) && payments.length > 0) {
      h2(`invoice.payments[] IS PRESENT — ${payments.length} payment(s); keys per payment`);
      keyPresence(payments as Array<Record<string, unknown>>);
      h2("payment_mode / account_name-ish values inside invoice.payments[]");
      reportPaymentMethodFields(payments as Array<Record<string, unknown>>);
    } else {
      console.log("   invoice.payments[] is absent or empty on the detail object.");
      console.log("   -> payments must come from GET /customerpayments (section B2).");
    }
  }

  // ---- 4) CUSTOMER PAYMENTS endpoint ------------------------------------
  h1("B2) CUSTOMER PAYMENTS — GET /customerpayments?customer_id=…");
  const paymentRows: Array<Record<string, unknown>> = [];
  for (const s of sample) {
    const data = await zohoGet<{ customerpayments?: Array<Record<string, unknown>> }>(
      "/customerpayments",
      { customer_id: s.id, per_page: PER_PAGE },
    );
    paymentRows.push(...(data.customerpayments ?? []));
  }
  console.log(`Collected ${paymentRows.length} customer-payment rows across the sample.`);

  if (paymentRows.length > 0) {
    h2("All top-level keys present on customerpayments list rows");
    keyPresence(paymentRows);

    h2("Payment date + amount fields");
    for (const f of ["date", "amount", "bank_charges"]) {
      const vals = distinct(paymentRows, f);
      console.log(`   ${f.padEnd(16)} ${vals.length ? `e.g. ${vals.slice(0, 3).join(", ")}` : "(absent)"}`);
    }

    h2("Payment-method / account fields — can we reconstruct 'Stripe' / 'SEPA'?");
    reportPaymentMethodFields(paymentRows);

    // detail of one payment — list rows sometimes omit account_name/deposit_to
    const first = paymentRows.find((p) => p.payment_id);
    if (first) {
      h1("B3) PAYMENT DETAIL — GET /customerpayments/{id} (richer than list?)");
      const detail = await zohoGet<{ payment?: Record<string, unknown> }>(
        `/customerpayments/${String(first.payment_id)}`,
      );
      const p = detail.payment ?? {};
      h2("Top-level keys on payment detail");
      keyPresence([p]);
      h2("Payment-method / account fields on the DETAIL object");
      reportPaymentMethodFields([p]);
    }
  } else {
    console.log("   No customer payments returned for the sample (customers may be unpaid-only).");
  }

  // ---- 5) recommendation -------------------------------------------------
  printRecommendation(invoiceRows, paymentRows, noPaidInvoices);
}

/**
 * Collect up to `targetInvoices` paid invoices, continuing across pages until we
 * also span `targetCustomers` distinct customers (or run out / hit the page cap).
 * Per-page kept small so the in-memory set stays modest.
 */
async function collectPaidInvoices(
  targetInvoices: number,
  targetCustomers: number,
): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = [];
  const customers = new Set<string>();
  let page = 1;
  while (page <= 20) {
    const data = await zohoGet<{
      invoices?: Array<Record<string, unknown>>;
      page_context?: { has_more_page?: boolean };
    }>("/invoices", { status: "paid", per_page: 50, page });
    for (const inv of data.invoices ?? []) {
      out.push(inv);
      if (inv.customer_id) customers.add(String(inv.customer_id));
    }
    const enough = out.length >= targetInvoices && customers.size >= targetCustomers;
    if (enough || !data.page_context?.has_more_page) break;
    page += 1;
  }
  return out;
}

/** Fallback only used when the org has zero paid invoices — Part A still needs a sample. */
async function fallbackCustomersWithAnyInvoice(
  count: number,
): Promise<Array<{ id: string; name: string }>> {
  const resp = await zohoGet<{ contacts?: Array<Record<string, unknown>> }>("/contacts", {
    contact_type: "customer",
    status: "active",
    per_page: PER_PAGE,
  });
  const out: Array<{ id: string; name: string }> = [];
  for (const c of resp.contacts ?? []) {
    if (out.length >= count) break;
    const id = c.contact_id ? String(c.contact_id) : "";
    if (!id) continue;
    const inv = await zohoGet<{ invoices?: unknown[] }>("/invoices", {
      customer_id: id,
      per_page: 1,
    });
    if ((inv.invoices ?? []).length > 0) out.push({ id, name: String(c.contact_name ?? "?") });
  }
  return out;
}

/** Show every candidate field that could carry a human method/account label. */
function reportPaymentMethodFields(rows: Array<Record<string, unknown>>): void {
  const candidates = [
    "payment_mode", // coded enum: check/creditcard/banktransfer/…
    "account_name", // the cash/bank account the payment was deposited to
    "deposit_to_account_name",
    "reference_number",
    "description",
    "payment_type",
    "gateway_transaction_id",
  ];
  for (const f of candidates) {
    const vals = distinct(rows, f);
    console.log(
      `   ${f.padEnd(26)} ${vals.length ? vals.slice(0, 6).join(" | ") : "(absent/empty)"}`,
    );
  }
}

function fmt(v: unknown): string {
  return v === null || v === undefined ? "—" : String(v);
}

function printRecommendation(
  invoices: Array<Record<string, unknown>>,
  payments: Array<Record<string, unknown>>,
  noPaidInvoices: boolean,
): void {
  h1("RECOMMENDATION (auto-derived from the sample above)");

  // (i) month assignment
  const hasInvoiceDate = invoices.some((i) => i.date);
  console.log("(i) Monatszuordnung über das Rechnungsdatum:");
  console.log(
    hasInvoiceDate
      ? "    OK — jedes Invoice-Row trägt ein 'date' (yyyy-mm-dd). Reicht für Monats-Buckets.\n" +
          "    (Optional differenzieren: 'date' = Rechnungsdatum vs. payment 'date' = Zahlungseingang,\n" +
          "     falls Umsatz nach Eingang statt nach Rechnung gebucht werden soll.)"
      : "    ACHTUNG — kein 'date' in den Sample-Rows gefunden; vor dem Bauen erneut prüfen.",
  );

  // (ii) payment method / account
  const modeVals = distinct(payments, "payment_mode");
  const acctVals = [
    ...new Set([...distinct(payments, "account_name"), ...distinct(payments, "deposit_to_account_name")]),
  ];
  const refVals = distinct(payments, "reference_number");
  console.log("\n(ii) Zahlart/Konto (z.B. 'Stripe' / 'SEPA') automatisch aus Zoho rekonstruierbar?");
  console.log(`    payment_mode (codiert): ${modeVals.join(", ") || "(keine Zahlungen im Sample)"}`);
  console.log(`    account_name / deposit_to_account_name: ${acctVals.join(" | ") || "(leer)"}`);
  console.log(`    reference_number: ${refVals.slice(0, 6).join(" | ") || "(leer)"}`);
  if (payments.length === 0) {
    console.log(
      noPaidInvoices
        ? "    UNBEKANNT — der Org hat KEINE bezahlten Rechnungen, daher keine Zahlungen zum Prüfen.\n" +
            "    Sobald die erste Rechnung bezahlt ist, dieses Skript erneut laufen lassen."
        : "    UNBEKANNT — bezahlte Rechnungen vorhanden, aber /customerpayments lieferte keine Zeilen\n" +
            "    (Zahlung evtl. nur im Invoice-Detail, siehe Abschnitt B1). Felder dort gegenchecken.",
    );
  } else if (acctVals.some((a) => /stripe|sepa|bank|paypal/i.test(a))) {
    console.log(
      "    JA (wahrscheinlich) — der Konto-/Account-Name trägt die menschliche Bezeichnung\n" +
        "    ('Stripe', 'SEPA', …). 'payment_mode' allein ist nur ein grober Enum-Code.\n" +
        "    -> Anzeige 'DD.MM.YYYY <account_name>' direkt aus payment.date + payment.account_name baubar.",
    );
  } else {
    console.log(
      "    TEILS — payment_mode ist nur ein codierter Enum; ein klarer 'Stripe'/'SEPA'-Klartext\n" +
        "    erscheint im Sample NICHT in account_name. Entweder das Account-Setup in Zoho so benennen,\n" +
        "    oder eine eigene Zahlart-Erfassung vorsehen. Vor dem Bauen mit echten bezahlten Rechnungen prüfen.",
    );
  }

  // (iii) net source
  console.log("\n(iii) Richtige NETTO-Quelle:");
  console.log(
    "    'sub_total' = Betrag VOR Steuer (NETTO). 'total' = brutto (inkl. tax_total),\n" +
      "    'balance' = noch offen, 'payment_made' = bereits gezahlt.\n" +
      "    -> Fürs Grid (NETTO) 'sub_total' verwenden; die Werte oben gegenchecken\n" +
      "       (sub_total + tax_total sollte ~ total ergeben).",
  );

  console.log("\nFertig. (Read-only — es wurde nichts in Zoho verändert.)\n");
}

main().catch((err) => {
  console.error("\nDIAGNOSTIC FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
