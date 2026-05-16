import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/constants/models";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

const anthropic = new Anthropic({ apiKey });

export function briefing(prompt: string, system?: string) {
  return anthropic.messages.create({
    model: MODELS.BRIEFING,
    max_tokens: 2048,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: prompt }],
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

// Unwraps an Anthropic `messages.create` response into plain text. Concatenates
// every text-typed content block with newlines and trims.
export function extractText(response: Awaited<ReturnType<typeof briefing>>): string {
  return response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("\n")
    .trim();
}
