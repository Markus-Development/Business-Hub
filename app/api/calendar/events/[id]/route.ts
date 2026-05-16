import { NextResponse } from "next/server";
import {
  deleteEvent,
  isGoogleConnected,
  updateEvent,
  type UpdateEventPatch,
} from "@/lib/google";
import { getUserSettings } from "@/lib/settings";

export const runtime = "nodejs";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (typeof id !== "string" || id.length === 0) return bad("missing_id");
  try {
    if (!(await isGoogleConnected())) return bad("google_not_connected", 409);
    const body = (await req.json().catch(() => null)) as Partial<UpdateEventPatch> | null;
    if (!body) return bad("invalid_body");

    const patch: UpdateEventPatch = {};
    if (typeof body.summary === "string") patch.summary = body.summary.trim();
    if (typeof body.description === "string") patch.description = body.description;
    if (typeof body.start === "string") {
      if (Number.isNaN(Date.parse(body.start))) return bad("invalid_start");
      patch.start = body.start;
    }
    if (typeof body.end === "string") {
      if (Number.isNaN(Date.parse(body.end))) return bad("invalid_end");
      patch.end = body.end;
    }
    if (patch.start && patch.end && Date.parse(patch.end) <= Date.parse(patch.start)) {
      return bad("end_before_start");
    }

    const settings = await getUserSettings();
    const calendarId = settings.master_calendar_id ?? "primary";
    const event = await updateEvent(calendarId, id, patch);
    return NextResponse.json({ event });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (typeof id !== "string" || id.length === 0) return bad("missing_id");
  try {
    if (!(await isGoogleConnected())) return bad("google_not_connected", 409);
    const settings = await getUserSettings();
    const calendarId = settings.master_calendar_id ?? "primary";
    await deleteEvent(calendarId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
