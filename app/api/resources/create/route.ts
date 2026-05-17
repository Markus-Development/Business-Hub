import { NextResponse } from "next/server";
import { createResource, type ResourceDraft } from "@/lib/notion";

export const runtime = "nodejs";

type Body = {
  name?: unknown;
  area?: unknown;
  type?: unknown;
  body?: unknown;
};

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(req: Request) {
  if (!process.env.NOTION_RESOURCES_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }

  const { name, area, type, body: pageBody } = body;
  if (typeof name !== "string" || name.trim().length === 0) return bad("missing_name");
  if (area !== undefined && area !== null && typeof area !== "string") return bad("invalid_area");
  if (type !== undefined && type !== null && typeof type !== "string") return bad("invalid_type");
  if (pageBody !== undefined && pageBody !== null && typeof pageBody !== "string") {
    return bad("invalid_body");
  }

  const draft: ResourceDraft = {
    name: name.trim(),
    area: typeof area === "string" && area.length > 0 ? area : null,
    type: typeof type === "string" && type.length > 0 ? type : null,
    body: typeof pageBody === "string" ? pageBody : "",
  };

  try {
    const resource = await createResource(draft);
    return NextResponse.json({ ok: true, resource });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
