import { NextResponse } from "next/server";
import { listDevelopmentProjects } from "@/lib/notion";

// Tab 10 (Development). Reads the Projects DB filtered to Department=Development.
// Mirrors the error posture of /api/resources: 503 when the env var is unset,
// 500 on a Notion failure.
export const runtime = "nodejs";

export async function GET() {
  if (!process.env.NOTION_PROJECTS_DB_ID) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  try {
    const projects = await listDevelopmentProjects();
    return NextResponse.json({ ok: true, projects });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("development_list_failed", err);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
}
