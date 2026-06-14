import "server-only";
import axios, { AxiosError } from "axios";

// US data center only. CLAUDE.md "Critical Version Warnings" — never use regional .eu/.in/.au
// domains. The Zoho account is on .com; using the wrong host returns
// "Organization not found" silently regardless of token validity.
const ACCOUNTS_HOST = "https://accounts.zoho.com";
const API_HOST = "https://www.zohoapis.com/books/v3";

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh ~5 min before expiry
const LIFETIME_TURNOVER_TTL_MS = 10 * 60 * 1000;
const ACTIVE_WINDOW_MONTHS = 12;
const ZOHO_PAGE_SIZE = 200; // Zoho v3 default + max

export type ZohoContact = {
  contact_id: string;
  contact_name: string;
  email: string;
  phone: string;
  outstanding_receivable_amount: number;
  unused_credits_receivable_amount: number;
};

export type ZohoInvoice = {
  invoice_id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  total: number;
  balance: number;
  status: string;
};

// ----- Token cache -----------------------------------------------------------

type CachedToken = { token: string; expiresAt: number };
let tokenCache: CachedToken | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`${name} is not set — required for Zoho integration`);
  }
  return v;
}

async function getZohoAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt - Date.now() > ACCESS_TOKEN_REFRESH_BUFFER_MS) {
    return tokenCache.token;
  }
  const refreshToken = requireEnv("ZOHO_REFRESH_TOKEN");
  const clientId = requireEnv("ZOHO_CLIENT_ID");
  const clientSecret = requireEnv("ZOHO_CLIENT_SECRET");

  let data: { access_token?: string; expires_in?: number };
  try {
    const resp = await axios.post(`${ACCOUNTS_HOST}/oauth/v2/token`, null, {
      params: {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      },
    });
    data = resp.data as typeof data;
  } catch (err) {
    throw new Error(`Zoho token refresh failed: ${describeAxiosError(err)}`);
  }

  if (!data.access_token) {
    throw new Error("Zoho token refresh returned no access_token");
  }
  const expiresInMs = (data.expires_in ?? 3600) * 1000;
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + expiresInMs,
  };
  return data.access_token;
}

function describeAxiosError(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const body = err.response?.data;
    const codePart = status ? `http_${status}` : err.code ?? "axios_error";
    const message =
      (typeof body === "object" && body && "message" in (body as Record<string, unknown>)
        ? String((body as { message?: unknown }).message ?? "")
        : null) || err.message;
    return `${codePart}: ${message}`;
  }
  return err instanceof Error ? err.message : "unknown_error";
}

async function zohoGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const token = await getZohoAccessToken();
  const orgId = requireEnv("ZOHO_ORG_ID");
  try {
    const resp = await axios.get<T>(`${API_HOST}${path}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      params: { organization_id: orgId, ...params },
    });
    return resp.data;
  } catch (err) {
    throw new Error(`Zoho ${path} failed: ${describeAxiosError(err)}`);
  }
}

// ----- Contacts -------------------------------------------------------------

type ContactsResponse = {
  contacts: Array<{
    contact_id?: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    outstanding_receivable_amount?: number;
    unused_credits_receivable_amount?: number;
  }>;
  page_context?: { has_more_page?: boolean };
};

async function listAllActiveCustomers(): Promise<ZohoContact[]> {
  const out: ZohoContact[] = [];
  let page = 1;
  // Zoho's list endpoints paginate via `page` + `per_page`. has_more_page tells us when to stop.
  // For a solo founder app this loop will rarely run more than once or twice.
  // Hard safety cap at 20 pages (4000 contacts) to prevent runaway loops.
  while (page <= 20) {
    const data = await zohoGet<ContactsResponse>("/contacts", {
      contact_type: "customer",
      status: "active",
      page,
      per_page: ZOHO_PAGE_SIZE,
    });
    for (const c of data.contacts ?? []) {
      if (!c.contact_id) continue;
      out.push({
        contact_id: c.contact_id,
        contact_name: c.contact_name ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        outstanding_receivable_amount: c.outstanding_receivable_amount ?? 0,
        unused_credits_receivable_amount: c.unused_credits_receivable_amount ?? 0,
      });
    }
    if (!data.page_context?.has_more_page) break;
    page += 1;
  }
  return out;
}

function isoNMonthsAgo(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  // Zoho `date_after` expects yyyy-mm-dd.
  return d.toISOString().slice(0, 10);
}

type InvoicesListResponse = {
  invoices: Array<{
    invoice_id?: string;
    invoice_number?: string;
    customer_id?: string;
    date?: string;
    due_date?: string;
    total?: number;
    balance?: number;
    status?: string;
  }>;
  page_context?: { has_more_page?: boolean };
};

async function customerIdsWithRecentInvoices(): Promise<Set<string>> {
  const after = isoNMonthsAgo(ACTIVE_WINDOW_MONTHS);
  const ids = new Set<string>();
  let page = 1;
  while (page <= 20) {
    const data = await zohoGet<InvoicesListResponse>("/invoices", {
      date_after: after,
      page,
      per_page: ZOHO_PAGE_SIZE,
    });
    for (const inv of data.invoices ?? []) {
      if (inv.customer_id) ids.add(inv.customer_id);
    }
    if (!data.page_context?.has_more_page) break;
    page += 1;
  }
  return ids;
}

// Active customer + at least one invoice in the last 12 months. The 12-month
// join keeps the list focused on accounts Markus actually transacts with —
// dormant-but-active records are hidden.
export async function listActiveContacts(): Promise<ZohoContact[]> {
  const [contacts, recentIds] = await Promise.all([
    listAllActiveCustomers(),
    customerIdsWithRecentInvoices(),
  ]);
  return contacts.filter((c) => recentIds.has(c.contact_id));
}

// ----- Invoices -------------------------------------------------------------

function toInvoice(raw: NonNullable<InvoicesListResponse["invoices"]>[number]): ZohoInvoice | null {
  if (!raw.invoice_id) return null;
  return {
    invoice_id: raw.invoice_id,
    invoice_number: raw.invoice_number ?? "",
    date: raw.date ?? "",
    due_date: raw.due_date ?? "",
    total: raw.total ?? 0,
    balance: raw.balance ?? 0,
    status: raw.status ?? "",
  };
}

async function listInvoicesForCustomer(
  contactId: string,
  status?: string,
): Promise<ZohoInvoice[]> {
  const out: ZohoInvoice[] = [];
  let page = 1;
  while (page <= 20) {
    const params: Record<string, string | number> = {
      customer_id: contactId,
      page,
      per_page: ZOHO_PAGE_SIZE,
    };
    if (status) params.status = status;
    const data = await zohoGet<InvoicesListResponse>("/invoices", params);
    for (const raw of data.invoices ?? []) {
      const inv = toInvoice(raw);
      if (inv) out.push(inv);
    }
    if (!data.page_context?.has_more_page) break;
    page += 1;
  }
  return out;
}

// The Zoho v3 `status` filter accepts a single status. Open-but-not-paid invoices
// span three statuses, so we fan out and concat. The unique-by-invoice_id step
// is defensive — Zoho returns a single status per row but it costs nothing to be
// safe against future API changes.
const OPEN_STATUSES = ["unpaid", "overdue", "partially_paid"] as const;

export async function getContactInvoices(contactId: string): Promise<ZohoInvoice[]> {
  const batches = await Promise.all(
    OPEN_STATUSES.map((s) => listInvoicesForCustomer(contactId, s)),
  );
  const dedup = new Map<string, ZohoInvoice>();
  for (const b of batches) for (const inv of b) dedup.set(inv.invoice_id, inv);
  // Most recent first — UI shows latest invoices at the top.
  return [...dedup.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ----- Lifetime turnover ----------------------------------------------------

type CachedTurnover = { value: number; expiresAt: number };
const turnoverCache = new Map<string, CachedTurnover>();

export async function getContactLifetimeTurnover(contactId: string): Promise<number> {
  const cached = turnoverCache.get(contactId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const all = await listInvoicesForCustomer(contactId);
  const total = all.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
  turnoverCache.set(contactId, {
    value: total,
    expiresAt: Date.now() + LIFETIME_TURNOVER_TTL_MS,
  });
  return total;
}

// ----- Health check ---------------------------------------------------------

export async function pingZoho(): Promise<void> {
  // The /organizations endpoint validates both token + org_id. It's the canonical
  // probe — using /contacts here would be more expensive and still need org_id.
  await zohoGet<unknown>("/organizations", {});
}

// ----- Year-wide reads for the Einnahmen grid (org-wide, paginated) ---------
// Added for the Einnahmen tab (Phase 1 backend). These load ALL invoices /
// customer payments for a calendar year across the whole org in a few paginated
// calls — NOT one request per customer. Everything above is unchanged.

export type ZohoYearInvoice = {
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  date: string; // invoice date — the month bucket
  due_date: string;
  status: string;
  total: number; // org is tax-free (0% VAT) so total == net (verified Phase 0)
  balance: number; // open amount
};

export type ZohoYearPayment = {
  payment_id: string;
  customer_id: string;
  date: string;
  amount: number;
  payment_mode: string;
  payment_mode_formatted: string;
  account_name: string;
  reference_number: string;
  invoice_numbers: string; // comma-separated invoice numbers this payment settled
};

function asStr(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function asNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type YearListResponse = { page_context?: { has_more_page?: boolean } } & Record<string, unknown>;

// Org-wide, paginated. Draft invoices are excluded (not "sent"). NET = total (org
// is tax-free). The documented date_start/date_end range filter is used, plus a
// client-side year-prefix guard so a malformed/ignored range param can never leak
// other years into the grid. Page cap 50 (= 10k invoices) is a runaway backstop.
export async function listInvoicesForYear(year: number): Promise<ZohoYearInvoice[]> {
  const dateStart = `${year}-01-01`;
  const dateEnd = `${year}-12-31`;
  const yearPrefix = `${year}-`;
  const out: ZohoYearInvoice[] = [];
  let page = 1;
  while (page <= 50) {
    const data = await zohoGet<YearListResponse>("/invoices", {
      date_start: dateStart,
      date_end: dateEnd,
      page,
      per_page: ZOHO_PAGE_SIZE,
    });
    const rows = Array.isArray(data.invoices)
      ? (data.invoices as Array<Record<string, unknown>>)
      : [];
    for (const r of rows) {
      const id = asStr(r.invoice_id);
      if (!id) continue;
      const status = asStr(r.status);
      if (status === "draft") continue; // drafts are not "sent"
      const date = asStr(r.date);
      if (!date.startsWith(yearPrefix)) continue;
      out.push({
        invoice_id: id,
        invoice_number: asStr(r.invoice_number),
        customer_id: asStr(r.customer_id),
        customer_name: asStr(r.customer_name),
        date,
        due_date: asStr(r.due_date),
        status,
        total: asNum(r.total),
        balance: asNum(r.balance),
      });
    }
    // page_context can be null on some list endpoints — fall back to "page was full".
    const more = data.page_context?.has_more_page ?? rows.length === ZOHO_PAGE_SIZE;
    if (!more) break;
    page += 1;
  }
  return out;
}

// Org-wide, paginated. The customerpayments list endpoint's date-range support is
// NOT documented as date_start/date_end, so we pass them best-effort AND filter
// client-side by the year prefix (defense-in-depth — correct regardless of whether
// Zoho honours the params). The response array key is read defensively under both
// `customerpayments` and `customer_payments`.
export async function listCustomerPaymentsForYear(year: number): Promise<ZohoYearPayment[]> {
  const dateStart = `${year}-01-01`;
  const dateEnd = `${year}-12-31`;
  const yearPrefix = `${year}-`;
  const out: ZohoYearPayment[] = [];
  let page = 1;
  while (page <= 50) {
    const data = await zohoGet<YearListResponse>("/customerpayments", {
      date_start: dateStart,
      date_end: dateEnd,
      page,
      per_page: ZOHO_PAGE_SIZE,
    });
    const rows = (
      Array.isArray(data.customerpayments)
        ? data.customerpayments
        : Array.isArray(data.customer_payments)
          ? data.customer_payments
          : []
    ) as Array<Record<string, unknown>>;
    for (const r of rows) {
      const id = asStr(r.payment_id);
      if (!id) continue;
      const date = asStr(r.date);
      if (!date.startsWith(yearPrefix)) continue;
      out.push({
        payment_id: id,
        customer_id: asStr(r.customer_id),
        date,
        amount: asNum(r.amount),
        payment_mode: asStr(r.payment_mode),
        payment_mode_formatted: asStr(r.payment_mode_formatted),
        account_name: asStr(r.account_name),
        reference_number: asStr(r.reference_number),
        invoice_numbers: asStr(r.invoice_numbers),
      });
    }
    const more = data.page_context?.has_more_page ?? rows.length === ZOHO_PAGE_SIZE;
    if (!more) break;
    page += 1;
  }
  return out;
}
