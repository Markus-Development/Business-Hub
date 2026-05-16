import { NextResponse } from "next/server";
import {
  getClientPageBlocks,
  listNotionClients,
  listProjectsByClient,
  type NotionBlock,
  type NotionClient,
  type Project,
} from "@/lib/notion";
import {
  getContactInvoices,
  getContactLifetimeTurnover,
  type ZohoInvoice,
} from "@/lib/zoho";
import { isInCurrentMonth } from "@/lib/tz";

export const runtime = "nodejs";

export type ClientDetail = {
  zohoContactId: string;
  notion: NotionClient | null;
  notionBlocks: NotionBlock[];
  invoices: ZohoInvoice[];
  lifetimeTurnover: number;
  monthlyTasks: Project[];
};

export async function GET(_req: Request, ctx: { params: Promise<{ zohoId: string }> }) {
  const { zohoId } = await ctx.params;
  if (typeof zohoId !== "string" || zohoId.length === 0) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  try {
    // Resolve the Notion client record first so we know the client name for the
    // Projects join. If no Notion record is linked, we'll skip the monthly-tasks
    // join (no reliable name to filter on) and surface empty tasks instead.
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

    const [invoices, lifetimeTurnover, monthlyTasksAll, notionBlocks] = await Promise.all([
      getContactInvoices(zohoId),
      getContactLifetimeTurnover(zohoId),
      notionRecord ? listProjectsByClient(notionRecord.name) : Promise.resolve([] as Project[]),
      notionRecord ? getClientPageBlocks(notionRecord.pageId) : Promise.resolve([] as NotionBlock[]),
    ]);

    // Filter projects to the current month. Use Due Date if set, otherwise the
    // page's created_time (createdAt). This matches the generate-tasks
    // idempotency window so the UI mirrors what regen would do.
    const monthlyTasks = monthlyTasksAll.filter(
      (p) => isInCurrentMonth(p.dueDate) || isInCurrentMonth(p.createdAt),
    );

    const body: ClientDetail = {
      zohoContactId: zohoId,
      notion: notionRecord,
      notionBlocks,
      invoices,
      lifetimeTurnover,
      monthlyTasks,
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
