"use client";

import { TriangleAlert } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";

export function GoogleErrorClient({ reason }: { reason: string }) {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-border bg-card px-10 py-12 text-center shadow-sm">
        <div className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert className="size-5" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{t("google.error.title")}</h1>
        <p className="mt-2 break-words text-sm text-muted-foreground">{reason}</p>
        <a
          href={ROUTES.api.google.connect}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {t("google.error.retry")}
        </a>
      </div>
    </div>
  );
}
