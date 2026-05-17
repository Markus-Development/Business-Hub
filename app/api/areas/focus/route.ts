import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { classify, extractText } from "@/lib/anthropic";

export const runtime = "nodejs";

const TTL_MS = 60 * 60 * 1000; // 1 hour

// Module-level cache. Survives across requests within a single server process;
// cleared by a process restart or by the `?bust=` query param.
let cache: { text: string; builtAt: number } | null = null;

const SYSTEM_PROMPT = `You are a strategic advisor reading Markus's business roadmap. Reply with ONLY a 2–3 sentence plain-text paragraph telling him the single most important thing to focus on today and why, given all active blockers and cross-area dependencies in the roadmap. No bullet points, no headers, no markdown, no preamble. Just the paragraph.`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bust = url.searchParams.get("bust");

  // Roadmap is read fresh each call (fast, local fs). Missing file is a soft
  // failure — the UI shows nothing rather than crashing.
  let roadmap: string;
  try {
    roadmap = readFileSync(path.join(process.cwd(), "roadmap.md"), "utf-8");
  } catch {
    return NextResponse.json({ summary: null, error: "roadmap_not_found" });
  }

  if (!bust && cache && Date.now() - cache.builtAt < TTL_MS) {
    return NextResponse.json({
      summary: cache.text,
      generatedAt: new Date(cache.builtAt).toISOString(),
      cached: true,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const userMessage = `Today is ${today}.\n\n${roadmap}`;

  try {
    const response = await classify(userMessage, SYSTEM_PROMPT);
    const text = extractText(response);
    if (!text) {
      return NextResponse.json({ summary: null, error: "generation_failed" });
    }
    const builtAt = Date.now();
    cache = { text, builtAt };
    return NextResponse.json({
      summary: text,
      generatedAt: new Date(builtAt).toISOString(),
      cached: false,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("areas_focus_generation_failed", err);
    return NextResponse.json({ summary: null, error: "generation_failed" });
  }
}
