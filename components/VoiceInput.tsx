"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  VOICE_LANGS,
  DEFAULT_VOICE_LANG,
  VOICE_LANG_STORAGE_KEY,
  type VoiceLangCode,
} from "@/constants/voice";

type VoiceInputProps = {
  /** Called once per FINAL recognition segment. Interim text is never emitted. */
  onTranscript: (text: string) => void;
  className?: string;
};

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function VoiceInput({ onTranscript, className }: VoiceInputProps) {
  const t = useT();

  // Feature-detection runs once on mount (window is undefined during SSR).
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState<VoiceLangCode>(DEFAULT_VOICE_LANG);
  const [interim, setInterim] = useState("");

  // Recognition instance + the latest values the handlers need, kept in refs so
  // the start handler never re-binds and effects stay loop-safe (primitive deps).
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const langRef = useRef<VoiceLangCode>(lang);
  const tRef = useRef(t);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Mount: detect support + restore the persisted language choice.
  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
    try {
      const stored = window.localStorage.getItem(VOICE_LANG_STORAGE_KEY);
      if (stored && VOICE_LANGS.some((l) => l.code === stored)) {
        setLang(stored as VoiceLangCode);
      }
    } catch {
      // localStorage unavailable (private mode) — keep the default.
    }
  }, []);

  // Cleanup on unmount: stop any running recognition and drop handlers.
  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.onstart = null;
        try {
          rec.abort();
        } catch {
          // already stopped — ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  function selectLang(next: VoiceLangCode) {
    if (listening) return; // language is locked while recording
    setLang(next);
    try {
      window.localStorage.setItem(VOICE_LANG_STORAGE_KEY, next);
    } catch {
      // ignore persistence failure
    }
  }

  function stop() {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
    }
  }

  // Start is only ever called from a user click (required gesture).
  function start() {
    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = langRef.current;

    rec.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const segment = transcript.trim();
          if (segment) onTranscriptRef.current(segment);
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText);
    };

    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        toast.error(tRef.current("voice.permissionDenied"));
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        toast.error(tRef.current("voice.error"));
      }
      setListening(false);
      setInterim("");
    };

    // No auto-restart — onend simply resets the UI to avoid loops.
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      // start() throws if called while already started — reset defensively.
      setListening(false);
    }
  }

  if (!supported) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {t("voice.unsupported")}
      </p>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant={listening ? "default" : "outline"}
        size="sm"
        onClick={listening ? stop : start}
        aria-pressed={listening}
        className="gap-1.5"
      >
        {listening ? (
          <Square className="size-4" aria-hidden />
        ) : (
          <Mic className="size-4" aria-hidden />
        )}
        {listening ? t("voice.stop") : t("voice.start")}
      </Button>

      {/* DE/EN switch — disabled while recording so lang can't change mid-stream. */}
      <div className="inline-flex overflow-hidden rounded-md border border-border">
        {VOICE_LANGS.map((l) => {
          const active = l.code === lang;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => selectLang(l.code)}
              disabled={listening}
              aria-pressed={active}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                active
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {t(l.labelKey)}
            </button>
          );
        })}
      </div>

      {listening && (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2 animate-pulse rounded-full bg-primary"
            aria-hidden
          />
          <span className="max-w-[12rem] truncate">
            {interim || t("voice.listening")}
          </span>
        </span>
      )}
    </div>
  );
}
