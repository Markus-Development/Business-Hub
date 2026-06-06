import { NextResponse } from "next/server";
import { addToInbox } from "@/lib/notion";
import { INBOX_TYPES, type InboxType } from "@/constants/inbox";

export const runtime = "nodejs";

type Body = {
  name?: unknown;
  type?: unknown;
};

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: Request) {
  if (!process.env.NOTION_INBOX_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const { name, type } = body;
  if (typeof name !== "string" || name.trim().length === 0) return bad("missing_name");
  if (typeof type !== "string" || !(INBOX_TYPES as readonly string[]).includes(type)) {
    return bad("invalid_type");
  }

  try {
    const entry = await addToInbox(name.trim(), type as InboxType);
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
