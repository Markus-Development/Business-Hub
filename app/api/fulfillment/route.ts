import { NextResponse } from "next/server";
import { listFulfillmentItems, listNotionClients } from "@/lib/notion";
import {
  isMutedStatus,
  monthKeyToFirstOfMonthIso,
} from "@/constants/fulfillment";
import { getUserSettings } from "@/lib/settings";
import { todayInTz } from "@/lib/tz";

export const runtime = "nodejs";

// Normalise a Notion page id to dash-free lowercase so relation ids and Clients
// page ids join reliably regardless of formatting.
function normId(id: string | null | undefined): string {
  return (id ?? "").replace(/-/g, "").toLowerCase();
}

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(req: Request) {
  if (!process.env.NOTION_FULFILLMENT_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  let monthKey = url.searchParams.get("month") ?? "";
  if (!MONTH_RE.test(monthKey)) {
    // Default to the current month in the user's timezone.
    const { timezone } = await getUserSettings();
    monthKey = todayInTz(timezone).slice(0, 7);
  }

  try {
    const monthIso = monthKeyToFirstOfMonthIso(monthKey);
    const [rows, clients] = await Promise.all([
      listFulfillmentItems(monthIso),
      listNotionClients(),
    ]);

    const clientById = new Map(clients.map((c) => [normId(c.pageId), c]));

    const items = rows.map((row) => {
      const client = row.clientPageId ? clientById.get(normId(row.clientPageId)) : undefined;
      const clientStatus = client?.clientStatus ?? null;
      return {
        id: row.pageId,
        clientName: client?.name ?? "—",
        clientStatus,
        // "muted" = not-active (Paused or Inactive): greyed out, disabled, sorted
        // to the bottom. All rows are still returned — the client toggles them.
        muted: isMutedStatus(clientStatus),
        callTermin: row.callTermin,
        transaktionen: row.transaktionen,
        ready: row.ready,
        fertig: row.fertig,
      };
    });

    // Active clients first (name A–Z), muted (Paused/Inactive) clients after
    // (name A–Z). No server-side filtering — every row is returned.
    items.sort((a, b) => {
      if (a.muted !== b.muted) return a.muted ? 1 : -1;
      return a.clientName.localeCompare(b.clientName);
    });

    return NextResponse.json({ ok: true, month: monthKey, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
