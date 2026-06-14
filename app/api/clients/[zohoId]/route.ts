import { NextResponse } from "next/server";
import {
  getClientPageBlocks,
  listNotionClients,
  type NotionBlock,
  type NotionClient,
} from "@/lib/notion";
import {
  getContactInvoices,
  getContactLifetimeTurnover,
  type ZohoInvoice,
} from "@/lib/zoho";
import { supabaseServer } from "@/lib/supabase-server";
import { TABLES } from "@/constants/tables";

export const runtime = "nodejs";

export type ClientDetail = {
  zohoContactId: string;
  notion: NotionClient | null;
  notionBlocks: NotionBlock[];
  invoices: ZohoInvoice[];
  lifetimeTurnover: number;
  templateOverrides: Record<string, string>;
};

async function fetchTemplateOverrides(zohoId: string): Promise<Record<string, string>> {
  const db = supabaseServer();
  const { data, error } = await db
    .from(TABLES.CLIENT_TEMPLATE_OVERRIDES)
    .select("template_key, custom_text")
    .eq("zoho_contact_id", zohoId);
  if (error) {
    // Pre-migration (table missing) or any other error — degrade to empty
    // overrides so the rest of the detail payload still renders. PostgREST
    // surfaces missing tables as PGRST205, PostgreSQL as 42P01.
    // eslint-disable-next-line no-console
    console.warn(
      "client_template_overrides_unavailable",
      error.code ?? error.message,
    );
    return {};
  }
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    out[row.template_key as string] = row.custom_text as string;
  }
  return out;
}

export async function GET(_req: Request, ctx: { params: Promise<{ zohoId: string }> }) {
  const { zohoId } = await ctx.params;
  if (typeof zohoId !== "string" || zohoId.length === 0) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  try {
    // Resolve the Notion client record first so we can fetch its page body
    // blocks. If no Notion record is linked we surface empty blocks instead.
    let notionRecord: NotionClient | null = null;
    try {
      const all = await listNotionClients();
      notionRecord = all.find((c) => c.zohoContactId === zohoId) ?? null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        "notion_clients_unavailable",
        err instanceof Error ? err.message : "unknown_error",
      );
    }

    // Fan out the remaining fetches in parallel. Using `allSettled` so a single
    // upstream failure (e.g. Zoho rate-limit, Notion 5xx, missing override
    // table pre-migration) doesn't blank the whole detail panel.
    const settled = await Promise.allSettled([
      getContactInvoices(zohoId),
      getContactLifetimeTurnover(zohoId),
      notionRecord ? getClientPageBlocks(notionRecord.pageId) : Promise.resolve([] as NotionBlock[]),
      fetchTemplateOverrides(zohoId),
    ]);
    const invoices = settled[0].status === "fulfilled" ? settled[0].value : [];
    const lifetimeTurnover = settled[1].status === "fulfilled" ? settled[1].value : 0;
    const notionBlocks = settled[2].status === "fulfilled" ? settled[2].value : [];
    const templateOverrides = settled[3].status === "fulfilled" ? settled[3].value : {};
    for (let i = 0; i < settled.length; i++) {
      const s = settled[i];
      if (s.status === "rejected") {
        // eslint-disable-next-line no-console
        console.warn(`clients_detail_partial_failure[${i}]`, s.reason);
      }
    }

    const body: ClientDetail = {
      zohoContactId: zohoId,
      notion: notionRecord,
      notionBlocks,
      invoices,
      lifetimeTurnover,
      templateOverrides,
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
