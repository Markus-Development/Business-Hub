export const MODELS = {
  BRIEFING: "claude-sonnet-4-6",
  CLASSIFY: "claude-haiku-4-5-20251001",
} as const;

export type ModelKey = keyof typeof MODELS;
export type ModelId = (typeof MODELS)[ModelKey];
