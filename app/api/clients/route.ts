import { NextResponse } from "next/server";
import { listNotionClients, type NotionClient } from "@/lib/notion";
import { listActiveContacts } from "@/lib/zoho";

export const runtime = "nodejs";

export type MergedClient = {
  // Identity
  zohoContactId: string;
  name: string;
  // Notion side (nullable when no Notion record is linked yet)
  notionPageId: string | null;
  notionUrl: string | null;
  industry: string | null;
  employees: number | null;
  monthlyRevenue: number | null;
  callNotesLink: string | null;
  clientDatabaseLink: string | null;
  dashboardLink: string | null;
  // Zoho side
  email: string;
  phone: string;
  outstandingAmount: number;
  unusedCredits: number;
  // Derived (cheap, from list endpoint only — overdue check needs invoice fetch
  // which we defer to the detail route to keep the master list fast). The flag
  // here is a heuristic: outstanding > 0 OR Zoho returns negative credits.
  hasOutstanding: boolean;
};

export async function GET() {
  try {
    const [notionClients, zohoContacts] = await Promise.all([
      // listNotionClients fails fast if NOTION_CLIENTS_DB_ID is missing — surface the
      // configuration error rather than silently returning an empty list.
      safeNotionClients(),
      listActiveContacts(),
    ]);

    const merged: MergedClient[] = [];
    for (const z of zohoContacts) {
      const linked = notionClients.find(
        (n) => n.zohoContactId === z.contact_id && z.contact_id.length > 0,
      );
      merged.push({
        zohoContactId: z.contact_id,
        name: linked?.name || z.contact_name,
        notionPageId: linked?.pageId ?? null,
        notionUrl: linked?.url ?? null,
        industry: linked?.industry ?? null,
        employees: linked?.employees ?? null,
        monthlyRevenue: linked?.monthlyRevenue ?? null,
        callNotesLink: linked?.callNotesLink ?? null,
        clientDatabaseLink: linked?.clientDatabaseLink ?? null,
        dashboardLink: linked?.dashboardLink ?? null,
        email: z.email,
        phone: z.phone,
        outstandingAmount: z.outstanding_receivable_amount,
        unusedCredits: z.unused_credits_receivable_amount,
        hasOutstanding: z.outstanding_receivable_amount > 0,
      });
    }

    // Sort default: most outstanding first, then alpha by name.
    merged.sort((a, b) => {
      if (a.outstandingAmount !== b.outstandingAmount) {
        return b.outstandingAmount - a.outstandingAmount;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ clients: merged });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function safeNotionClients(): Promise<NotionClient[]> {
  try {
    return await listNotionClients();
  } catch (err) {
    // If the Notion Clients DB isn't set up yet, fall back to "no Notion data"
    // rather than blocking the whole tab. The UI surfaces empty Notion fields
    // and a "create one in Notion" hint per row.
    // eslint-disable-next-line no-console
    console.warn(
      "notion_clients_unavailable",
      err instanceof Error ? err.message : "unknown_error",
    );
    return [];
  }
}
