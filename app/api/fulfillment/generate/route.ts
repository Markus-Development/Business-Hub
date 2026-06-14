import { NextResponse } from "next/server";
import {
  createFulfillmentRow,
  listFulfillmentItems,
  listNotionClients,
} from "@/lib/notion";
import { monthKeyToFirstOfMonthIso } from "@/constants/fulfillment";

export const runtime = "nodejs";

const MONTH_RE = /^\d{4}-\d{2}$/;

// Notion's API rate limit is ~3 req/s — create rows serially with a small gap,
// never in a parallel loop.
const CREATE_SPACING_MS = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normId(id: string | null | undefined): string {
  return (id ?? "").replace(/-/g, "").toLowerCase();
}

type Body = { month?: unknown };

export async function POST(req: Request) {
  if (!process.env.NOTION_FULFILLMENT_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const monthKey = typeof body.month === "string" ? body.month : "";
  if (!MONTH_RE.test(monthKey)) {
    return NextResponse.json({ ok: false, error: "invalid_month" }, { status: 400 });
  }

  try {
    const monthIso = monthKeyToFirstOfMonthIso(monthKey);
    const [existing, clients] = await Promise.all([
      listFulfillmentItems(monthIso),
      listNotionClients(),
    ]);

    // Clients that already have a row this month — skip those (idempotent).
    const haveRow = new Set(
      existing.map((r) => normId(r.clientPageId)).filter((id) => id.length > 0),
    );

    const created: { name: string }[] = [];
    const failed: { name: string; error: string }[] = [];
    let skipped = 0;

    for (const client of clients) {
      if (haveRow.has(normId(client.pageId))) {
        skipped += 1;
        continue;
      }
      try {
        // Serial — one create per loop with spacing, never parallel (Notion rate limit).
        await createFulfillmentRow({
          name: client.name,
          clientPageId: client.pageId,
          monthIso,
        });
        created.push({ name: client.name });
        await sleep(CREATE_SPACING_MS);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown_error";
        failed.push({ name: client.name, error: message });
      }
    }

    return NextResponse.json({ ok: true, created, skipped, failed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
