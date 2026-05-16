import { NextResponse } from "next/server";
import { pingNotion } from "@/lib/notion";
import {
  getAuthorizedCalendarClient,
  isGoogleConnected,
} from "@/lib/google";
import { pingAnthropic } from "@/lib/anthropic";
import { pingZoho } from "@/lib/zoho";
import { supabaseServer } from "@/lib/supabase-server";
import { TABLES } from "@/constants/tables";

export const runtime = "nodejs";

type IntegrationStatus =
  | "connected"
  | "error"
  | "not_configured"
  | "never_connected";

type StatusResult = {
  status: IntegrationStatus;
  message?: string;
  checkedAt: string;
};

const ANTHROPIC_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Module-level cache. Survives within the running server process; resets on cold start.
// Cheaper than a Supabase row for a per-process health probe.
let anthropicCache: { result: StatusResult } | null = null;

function now(): string {
  return new Date().toISOString();
}

function truncate(message: string, max = 120): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

async function checkNotion(): Promise<StatusResult> {
  try {
    if (!process.env.NOTION_TOKEN) {
      return { status: "not_configured", checkedAt: now() };
    }
    await pingNotion();
    return { status: "connected", checkedAt: now() };
  } catch (err) {
    return {
      status: "error",
      message: truncate(err instanceof Error ? err.message : "unknown_error"),
      checkedAt: now(),
    };
  }
}

async function checkGoogle(): Promise<StatusResult> {
  try {
    const connected = await isGoogleConnected();
    if (!connected) return { status: "never_connected", checkedAt: now() };
    const calendar = await getAuthorizedCalendarClient();
    // calendarList.get verifies the token actually works against the API.
    await calendar.calendarList.get({ calendarId: "primary" });
    return { status: "connected", checkedAt: now() };
  } catch (err) {
    return {
      status: "error",
      message: truncate(err instanceof Error ? err.message : "unknown_error"),
      checkedAt: now(),
    };
  }
}

async function checkZoho(): Promise<StatusResult> {
  try {
    if (
      !process.env.ZOHO_CLIENT_ID ||
      !process.env.ZOHO_CLIENT_SECRET ||
      !process.env.ZOHO_REFRESH_TOKEN ||
      !process.env.ZOHO_ORG_ID
    ) {
      return { status: "not_configured", checkedAt: now() };
    }
    await pingZoho();
    return { status: "connected", checkedAt: now() };
  } catch (err) {
    return {
      status: "error",
      message: truncate(err instanceof Error ? err.message : "unknown_error"),
      checkedAt: now(),
    };
  }
}

async function checkAnthropic(): Promise<StatusResult> {
  if (anthropicCache) {
    const checkedMs = Date.parse(anthropicCache.result.checkedAt);
    if (Number.isFinite(checkedMs) && Date.now() - checkedMs < ANTHROPIC_TTL_MS) {
      // Return the cached result as-is so the UI sees the original checkedAt.
      return anthropicCache.result;
    }
  }
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { status: "not_configured", checkedAt: now() };
    }
    await pingAnthropic();
    const fresh: StatusResult = { status: "connected", checkedAt: now() };
    anthropicCache = { result: fresh };
    return fresh;
  } catch (err) {
    const fresh: StatusResult = {
      status: "error",
      message: truncate(err instanceof Error ? err.message : "unknown_error"),
      checkedAt: now(),
    };
    // Cache errors too — otherwise a misconfigured key burns calls on every reload.
    anthropicCache = { result: fresh };
    return fresh;
  }
}

async function checkSupabase(): Promise<StatusResult> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { status: "not_configured", checkedAt: now() };
    }
    const db = supabaseServer();
    const { error } = await db
      .from(TABLES.BRIEFINGS)
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return { status: "connected", checkedAt: now() };
  } catch (err) {
    return {
      status: "error",
      message: truncate(err instanceof Error ? err.message : "unknown_error"),
      checkedAt: now(),
    };
  }
}

function settled(result: PromiseSettledResult<StatusResult>): StatusResult {
  if (result.status === "fulfilled") return result.value;
  return {
    status: "error",
    message: truncate(
      result.reason instanceof Error ? result.reason.message : String(result.reason),
    ),
    checkedAt: now(),
  };
}

export async function POST() {
  const [notion, google, zoho, anthropic, supabase] = await Promise.allSettled([
    checkNotion(),
    checkGoogle(),
    checkZoho(),
    checkAnthropic(),
    checkSupabase(),
  ]);
  return NextResponse.json({
    notion: settled(notion),
    google: settled(google),
    zoho: settled(zoho),
    anthropic: settled(anthropic),
    supabase: settled(supabase),
  });
}
