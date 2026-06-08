"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleToggle } from "@/components/LocaleToggle";
import { VoiceInput } from "@/components/VoiceInput";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { INBOX_TYPES, type InboxType } from "@/constants/inbox";
import type { TranslationKey } from "@/constants/translations";

const TYPE_LABELS: Record<InboxType, TranslationKey> = {
  Task: "capture.type.task",
  Idea: "capture.type.idea",
  Reference: "capture.type.reference",
  Someday: "capture.type.someday",
};

export function CaptureForm() {
  const t = useT();
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState("");
  const [type, setType] = useState<InboxType>("Task");
  const [submitting, setSubmitting] = useState(false);

  function appendTranscript(segment: string) {
    setText((prev) => (prev ? `${prev} ${segment}` : segment));
    // Keep focus in the textarea for immediate manual edits after dictation.
    textRef.current?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = text.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(ROUTES.api.inbox.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });
      if (!res.ok) {
        toast.error(t("capture.error"));
        return;
      }
      toast.success(t("capture.success"));
      setText("");
      // Keep the type selection — fast successive capture of the same kind.
      textRef.current?.focus();
    } catch {
      toast.error(t("capture.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-4 py-5">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={ROUTES.pages.projects}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("capture.back")}
        </Link>
        <LocaleToggle />
      </div>

      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {t("capture.title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("capture.subtitle")}</p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-1 flex-col gap-4">
        <VoiceInput onTranscript={appendTranscript} />

        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          rows={5}
          placeholder={t("capture.placeholder")}
          className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-base text-foreground shadow-sm outline-none ring-offset-background transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t("capture.typeLabel")}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {INBOX_TYPES.map((option) => {
              const active = option === type;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  aria-pressed={active}
                  className={cn(
                    "h-11 rounded-lg border text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {t(TYPE_LABELS[option])}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="submit"
          disabled={!text.trim() || submitting}
          className="mt-1 h-12 w-full text-base"
        >
          <Send className="size-4" aria-hidden />
          {submitting ? t("capture.saving") : t("capture.save")}
        </Button>
      </form>
    </div>
  );
}
