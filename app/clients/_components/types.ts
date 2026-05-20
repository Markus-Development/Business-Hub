// Re-exported shapes for the Clients tab client-side components.
// The server routes own the canonical types in /api/clients; we mirror only
// what the UI actually consumes.

export type MergedClient = {
  zohoContactId: string;
  name: string;
  notionPageId: string | null;
  notionUrl: string | null;
  industry: string | null;
  employees: number | null;
  monthlyRevenue: number | null;
  monthlyFee: number | null;
  person: string | null;
  clientStatus: string | null;
  callNotesLink: string | null;
  clientDatabaseLink: string | null;
  dashboardLink: string | null;
  email: string;
  phone: string;
  outstandingAmount: number;
  unusedCredits: number;
  hasOutstanding: boolean;
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

export type NotionProject = {
  id: string;
  url: string;
  name: string;
  status: "Active" | "On Hold" | "Done" | null;
  department: string | null;
  priority: "High" | "Medium" | "Low" | null;
  outcome: string;
  nextAction: string;
  dueDate: string | null;
  estimatedMinutes: number | null;
  client: string;
  createdAt: string;
};

export type ClientDetail = {
  zohoContactId: string;
  notion: {
    pageId: string;
    url: string;
    name: string;
    zohoContactId: string;
    industry: string | null;
    employees: number | null;
    monthlyRevenue: number | null;
    monthlyFee: number | null;
    person: string | null;
    clientStatus: string | null;
    callNotesLink: string | null;
    clientDatabaseLink: string | null;
    dashboardLink: string | null;
  } | null;
  notionBlocks: import("@/lib/notion").NotionBlock[];
  invoices: ZohoInvoice[];
  lifetimeTurnover: number;
  monthlyTasks: NotionProject[];
  templateOverrides: Record<string, string>;
};

export type SortKey = "overdue" | "outstanding" | "name";

export const INDUSTRIES = [
  "E-Commerce",
  "SaaS",
  "Agency",
  "Retail",
  "Hospitality",
  "Other",
] as const;

export function clientHealth(
  c: Pick<MergedClient, "outstandingAmount">,
  detailHasOverdue: boolean | undefined,
): "green" | "amber" | "red" {
  if (detailHasOverdue) return "red";
  if (c.outstandingAmount > 0) return "amber";
  return "green";
}

export function formatEur(amount: number, locale: "de" | "en"): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}
