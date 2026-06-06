"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";

export function LoginForm() {
  const t = useT();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

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
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm"
    >
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
        <Input
          type="password"
          autoFocus
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
  );
}
