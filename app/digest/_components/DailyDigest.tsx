"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";

type DigestPayload = {
  cached: boolean;
  generatedAt: string;
  summary: string;
};

type FetchState = "initial" | "ready" | "empty";

async function fetchDaily(): Promise<DigestPayload | null> {
  const res = await fetch(ROUTES.api.digest.daily, { cache: "no-store" });
  if (res.status === 204) return null;
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `http_${res.status}`);
  }
  return (await res.json()) as DigestPayload;
}

async function postDaily(force: boolean): Promise<DigestPayload> {
  const url = force ? ROUTES.api.digest.dailyForce : ROUTES.api.digest.daily;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `http_${res.status}`);
  }
  return (await res.json()) as DigestPayload;
}

function formatRelative(iso: string, locale: "de" | "en"): string {
  const now = Date.now();
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale === "de" ? "de-DE" : "en-US", {
    numeric: "auto",
  });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}

export function DailyDigest() {
  const t = useT();
  const [locale] = useLocale();
  const [state, setState] = useState<FetchState>("initial");
  const [payload, setPayload] = useState<DigestPayload | null>(null);
  const [generating, setGenerating] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);

  // Keep the latest t in a ref so the mount-only fetch effect can show the
  // current-locale error toast without depending on t (which would cause the
  // effect to re-fire on every render and refetch on locale toggle).
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    let cancelled = false;
    fetchDaily()
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setState("empty");
          return;
        }
        setPayload(data);
        setState("ready");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        toast.error(tRef.current("digest.errorLoad"));
        // eslint-disable-next-line no-console
        console.error("digest_load_failed", err);
        setState("empty");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = useCallback(
    async (force: boolean) => {
      setGenerating(true);
      try {
        const data = await postDaily(force);
        setPayload(data);
        setState("ready");
        setJustGenerated(!data.cached);
        toast.success(t("digest.generated"));
      } catch (err) {
        toast.error(t("digest.errorGenerate"));
        // eslint-disable-next-line no-console
        console.error("digest_generate_failed", err);
      } finally {
        setGenerating(false);
      }
    },
    [t],
  );

  const subtitle = useMemo(() => {
    if (!payload) return null;
    if (justGenerated) return t("digest.justGenerated");
    const rel = formatRelative(payload.generatedAt, locale);
    return `${t("digest.cachedPrefix")} ${rel}`;
  }, [payload, justGenerated, locale, t]);

  return (
    <div className="mx-auto max-w-4xl py-4 sm:py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("digest.title")}</h1>
          {subtitle ? (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {state === "ready" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate(true)}
            disabled={generating}
          >
            {generating ? t("digest.generating") : t("digest.regenerate")}
          </Button>
        ) : null}
      </header>

      <div className="mt-8">
        {state === "initial" ? (
          <p className="text-sm text-muted-foreground">{t("digest.loading")}</p>
        ) : state === "empty" ? (
          <div className="rounded-xl border border-border bg-card px-5 py-8 text-center shadow-sm sm:px-8 sm:py-10">
            <p className="text-sm text-muted-foreground">{t("digest.emptyHint")}</p>
            <Button
              className="mt-5"
              onClick={() => handleGenerate(false)}
              disabled={generating}
            >
              {generating ? t("digest.generating") : t("digest.generate")}
            </Button>
          </div>
        ) : payload ? (
          <article className="text-sm leading-6 text-foreground">
            <ReactMarkdown
              components={{
                h1: (props) => (
                  <h1 className="mt-6 mb-2 text-base font-semibold text-foreground" {...props} />
                ),
                h2: (props) => (
                  <h2 className="mt-6 mb-2 text-base font-semibold text-foreground" {...props} />
                ),
                h3: (props) => (
                  <h3 className="mt-5 mb-2 text-sm font-semibold text-foreground" {...props} />
                ),
                p: (props) => <p className="my-2" {...props} />,
                ul: (props) => <ul className="my-2 list-disc pl-5" {...props} />,
                ol: (props) => <ol className="my-2 list-decimal pl-5" {...props} />,
                li: (props) => <li className="my-1" {...props} />,
                strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
                em: (props) => <em className="italic" {...props} />,
                a: (props) => (
                  <a
                    className="text-primary underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                    {...props}
                  />
                ),
                code: (props) => (
                  <code
                    className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
                    {...props}
                  />
                ),
                blockquote: (props) => (
                  <blockquote
                    className="my-3 border-l-2 border-border pl-3 text-muted-foreground"
                    {...props}
                  />
                ),
              }}
            >
              {payload.summary}
            </ReactMarkdown>
          </article>
        ) : null}
      </div>
    </div>
  );
}
