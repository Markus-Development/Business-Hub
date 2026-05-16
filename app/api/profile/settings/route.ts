import { NextResponse } from "next/server";
import { getUserSettings, updateUserSettings, type UserSettingsPatch } from "@/lib/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getUserSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

const PATCH_KEYS = new Set(["timezone", "master_calendar_id", "task_type_windows"]);

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const patch: UserSettingsPatch = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (!PATCH_KEYS.has(key)) continue;
    (patch as Record<string, unknown>)[key] = value;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "empty_patch" }, { status: 400 });
  }
  try {
    const settings = await updateUserSettings(patch);
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
