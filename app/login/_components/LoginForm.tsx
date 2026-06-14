"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";

export function LoginForm() {
  const t = useT();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  // The Google-login callback redirects back with ?error=forbidden|auth on a
  // rejected/failed sign-in. Read it from the URL on mount (loop-safe: empty
  // deps, no useSearchParams so the page needs no Suspense boundary).
  const [urlError, setUrlError] = useState<"forbidden" | "auth" | null>(null);
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get("error");
    if (e === "forbidden" || e === "auth") setUrlError(e);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch(ROUTES.api.auth.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(true);
        setSubmitting(false);
        return;
      }
      // Full navigation so the new session cookie is present when the middleware
      // evaluates the next request.
      window.location.href = ROUTES.pages.projects;
    } catch {
      setError(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-5" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {t("login.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
      </div>

      <div className="space-y-2">
        <Button asChild variant="outline" className="h-11 w-full">
          <a href={ROUTES.api.auth.googleStart}>{t("login.google")}</a>
        </Button>
        {urlError === "forbidden" && (
          <p className="text-sm text-destructive">{t("login.googleForbidden")}</p>
        )}
        {urlError === "auth" && (
          <p className="text-sm text-destructive">{t("login.googleError")}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{t("login.or")}</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(false);
            }}
            placeholder={t("login.passwordPlaceholder")}
            aria-label={t("login.passwordPlaceholder")}
            aria-invalid={error}
            className="h-11"
          />
          {error && <p className="text-sm text-destructive">{t("login.error")}</p>}
        </div>

        <Button type="submit" disabled={!password || submitting} className="h-11 w-full">
          {submitting ? t("login.submitting") : t("login.submit")}
        </Button>
      </form>
    </div>
  );
}
