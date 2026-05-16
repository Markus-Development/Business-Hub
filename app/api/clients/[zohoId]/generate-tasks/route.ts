import { NextResponse } from "next/server";
import { createClientProject, listProjectsByClient } from "@/lib/notion";
import { isInCurrentMonth } from "@/lib/tz";
import { MONTHLY_TASK_NAMES, type MonthlyTaskName } from "@/constants/client-tasks";

export const runtime = "nodejs";

type Body = { clientName?: unknown };

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function endOfMonthIso(): string {
  const now = new Date();
  // Day 0 of next month == last day of this month.
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return end.toISOString().slice(0, 10);
}

export async function POST(req: Request, ctx: { params: Promise<{ zohoId: string }> }) {
  const { zohoId } = await ctx.params;
  if (typeof zohoId !== "string" || zohoId.length === 0) return bad("missing_id");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("invalid_json");
  }
  const { clientName } = body;
  if (typeof clientName !== "string" || clientName.trim().length === 0) {
    return bad("missing_clientName");
  }

  try {
    const existing = await listProjectsByClient(clientName);
    const existingThisMonth = new Set(
      existing
        .filter((p) => isInCurrentMonth(p.dueDate) || isInCurrentMonth(p.createdAt))
        .map((p) => p.name),
    );

    const toCreate: MonthlyTaskName[] = MONTHLY_TASK_NAMES.filter(
      (n) => !existingThisMonth.has(n),
    );

    if (toCreate.length === 0) {
      return NextResponse.json({ ok: false, error: "tasks_exist" }, { status: 409 });
    }

    const dueDate = endOfMonthIso();
    const created: string[] = [];
    // Sequential — Notion's rate-limited per integration and the volume here is 1–4 pages.
    for (const name of toCreate) {
      await createClientProject({
        name,
        client: clientName,
        status: "Active",
        area: "Fulfillment",
        priority: "Medium",
        dueDate,
      });
      created.push(name);
    }

    const skipped = MONTHLY_TASK_NAMES.filter((n) => existingThisMonth.has(n));
    return NextResponse.json({ created, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
