"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function GoogleConnectedPage() {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-border bg-card px-10 py-12 text-center shadow-sm">
        <div className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="size-5" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold text-foreground">{t("google.connected.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("google.connected.body")}</p>
        <Link
          href="/projects"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {t("google.connected.back")}
        </Link>
      </div>
    </div>
  );
}
