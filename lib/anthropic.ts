import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/constants/models";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

export const anthropic = new Anthropic({ apiKey });

export function briefing(prompt: string, system?: string) {
  return anthropic.messages.create({
    model: MODELS.BRIEFING,
    max_tokens: 2048,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: prompt }],
  });
}

export function classify(text: string, system?: string) {
  return anthropic.messages.create({
    model: MODELS.CLASSIFY,
    max_tokens: 256,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: text }],
  });
}

// Cheapest health-check call: 1 input token, 1 output token. Caller is responsible
// for caching this (see /api/profile/status) — do not loop on it.
export async function pingAnthropic(): Promise<void> {
  await anthropic.messages.create({
    model: MODELS.CLASSIFY,
    max_tokens: 1,
    messages: [{ role: "user", content: "ok" }],
  });
}
