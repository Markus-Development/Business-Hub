import { NextResponse } from "next/server";
import {
  createEvent,
  isGoogleConnected,
  listEvents,
  type CreateEventPayload,
} from "@/lib/google";
import { getUserSettings } from "@/lib/settings";

export const runtime = "nodejs";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(req: Request) {
  try {
    if (!(await isGoogleConnected())) return bad("google_not_connected", 409);
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (!start || !end) return bad("missing_range");
    if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
      return bad("invalid_range");
    }
    const settings = await getUserSettings();
    const calendarId = settings.master_calendar_id ?? "primary";
    const events = await listEvents(calendarId, start, end);
    return NextResponse.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isGoogleConnected())) return bad("google_not_connected", 409);
    const body = (await req.json().catch(() => null)) as Partial<CreateEventPayload> | null;
    if (!body) return bad("invalid_body");
    const { summary, description, start, end, notionProjectId } = body;
    if (typeof summary !== "string" || summary.trim().length === 0) {
      return bad("missing_summary");
    }
    if (typeof start !== "string" || typeof end !== "string") {
      return bad("missing_range");
    }
    if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
      return bad("invalid_range");
    }
    if (Date.parse(end) <= Date.parse(start)) return bad("end_before_start");

    const settings = await getUserSettings();
    const calendarId = settings.master_calendar_id ?? "primary";
    const event = await createEvent(calendarId, {
      summary: summary.trim(),
      description: typeof description === "string" ? description : undefined,
      start,
      end,
      notionProjectId:
        typeof notionProjectId === "string" && notionProjectId.length > 0
          ? notionProjectId
          : undefined,
    });
    return NextResponse.json({ event });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
