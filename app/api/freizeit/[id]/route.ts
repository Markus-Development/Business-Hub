import { NextResponse } from "next/server";
import { updateFreizeitItem } from "@/lib/notion";
import { FREIZEIT_STATUSES, type FreizeitStatus } from "@/constants/freizeit";
import { getUserSettings } from "@/lib/settings";
import { todayInTz } from "@/lib/tz";

export const runtime = "nodejs";

type Body = {
  status?: unknown;
  link?: unknown;
  note?: unknown;
};

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

// Next.js 16: dynamic-segment params is a Promise. Matches the other dynamic
// routes in this repo (/api/areas/[areaId]/blocks, /api/clients/[zohoId], etc.).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!process.env.NOTION_FREIZEIT_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  if (!id) return bad("missing_id");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const { status, link, note } = body;
  if (status !== undefined && !FREIZEIT_STATUSES.includes(status as FreizeitStatus)) {
    return bad("invalid_status");
  }
  if (link !== undefined && link !== null && typeof link !== "string") return bad("invalid_link");
  if (note !== undefined && note !== null && typeof note !== "string") return bad("invalid_note");

  const patch: {
    status?: string;
    doneDate?: string | null;
    link?: string | null;
    note?: string | null;
  } = {};

  if (status !== undefined) {
    patch.status = status as string;
    // Server-side done-date tracker: stamp "Erledigt am" with today when a
    // status moves to "Erledigt", clear it when it moves back to Offen/Läuft.
    if (status === "Erledigt") {
      const { timezone } = await getUserSettings();
      patch.doneDate = todayInTz(timezone);
    } else {
      patch.doneDate = null;
    }
  }
  if (link !== undefined) patch.link = typeof link === "string" && link.length > 0 ? link : null;
  if (note !== undefined) patch.note = typeof note === "string" && note.length > 0 ? note : null;

  try {
    await updateFreizeitItem(id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
