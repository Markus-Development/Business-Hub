// Languages offered by the VoiceInput mic control. The Web Speech API does NOT
// auto-detect the spoken language — `recognition.lang` must be set explicitly —
// so the user picks one. Codes are BCP-47 tags passed straight to
// `recognition.lang`. No user-facing strings here: labels are i18n keys
// resolved by the consumer via `t()`.

import type { TranslationKey } from "@/constants/translations";

export const VOICE_LANGS = [
  { code: "de-DE", labelKey: "voice.lang.de" },
  { code: "en-US", labelKey: "voice.lang.en" },
] as const satisfies ReadonlyArray<{ code: string; labelKey: TranslationKey }>;

export type VoiceLangCode = (typeof VOICE_LANGS)[number]["code"];

export const DEFAULT_VOICE_LANG: VoiceLangCode = "de-DE";

// localStorage key for the persisted language choice.
export const VOICE_LANG_STORAGE_KEY = "bh.voice.lang";
