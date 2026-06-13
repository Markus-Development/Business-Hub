import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { classify, extractText } from "@/lib/anthropic";

export const runtime = "nodejs";

const TTL_MS = 60 * 60 * 1000; // 1 hour

type Locale = "de" | "en";

// Module-level cache, split per locale. Survives across requests within a single
// server process; cleared by a process restart or by the `?bust=` query param
// (which busts the current locale's entry).
const cache: Record<Locale, { text: string; builtAt: number } | undefined> = {
  de: undefined,
  en: undefined,
};

const SYSTEM_PROMPT_EN = `You are a strategic advisor reading Markus's business roadmap. Reply with ONLY a 2–3 sentence plain-text paragraph telling him the single most important thing to focus on today and why, given all active blockers and cross-area dependencies in the roadmap. No bullet points, no headers, no markdown, no preamble. Just the paragraph.`;

const SYSTEM_PROMPT_DE = `Du bist ein strategischer Berater und liest Markus' Business-Roadmap. Antworte mit AUSSCHLIESSLICH einem Absatz aus 2–3 Sätzen in reinem Text, der ihm sagt, worauf er sich heute am wichtigsten konzentrieren sollte und warum — unter Berücksichtigung aller aktiven Blocker und bereichsübergreifenden Abhängigkeiten in der Roadmap. Keine Aufzählungen, keine Überschriften, kein Markdown, kein Preamble, KEINE Gedankenstriche (kein „—"). Nur der Absatz.`;

function parseLocale(value: string | null): Locale {
  return value === "en" ? "en" : "de";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bust = url.searchParams.get("bust");
  const locale = parseLocale(url.searchParams.get("locale"));

  // Roadmap is read fresh each call (fast, local fs). Missing file is a soft
  // failure — the UI shows nothing rather than crashing.
  let roadmap: string;
  try {
    roadmap = readFileSync(path.join(process.cwd(), "roadmap.md"), "utf-8");
  } catch {
    return NextResponse.json({ summary: null, error: "roadmap_not_found" });
  }

  const cached = cache[locale];
  if (!bust && cached && Date.now() - cached.builtAt < TTL_MS) {
    return NextResponse.json({
      summary: cached.text,
      generatedAt: new Date(cached.builtAt).toISOString(),
      cached: true,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const userMessage = `Today is ${today}.\n\n${roadmap}`;
  const systemPrompt = locale === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_DE;

  try {
    const response = await classify(userMessage, systemPrompt);
    const text = extractText(response);
    if (!text) {
      return NextResponse.json({ summary: null, error: "generation_failed" });
    }
    const builtAt = Date.now();
    cache[locale] = { text, builtAt };
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
