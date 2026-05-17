import { NextResponse } from "next/server";
import { listResources, type NotionResource } from "@/lib/notion";

export const runtime = "nodejs";

export type ResourcesListResponse = {
  ok: true;
  resources: NotionResource[];
};

export async function GET() {
  if (!process.env.NOTION_RESOURCES_DB_ID) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  try {
    const resources = await listResources();
    return NextResponse.json({ ok: true, resources } satisfies ResourcesListResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
