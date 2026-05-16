import { NextResponse } from "next/server";
import { isGoogleConnected, listCalendars } from "@/lib/google";

export const runtime = "nodejs";

export async function GET() {
  try {
    const connected = await isGoogleConnected();
    if (!connected) {
      return NextResponse.json(
        { ok: false, error: "google_not_connected" },
        { status: 409 },
      );
    }
    const calendars = await listCalendars();
    return NextResponse.json({ calendars });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
