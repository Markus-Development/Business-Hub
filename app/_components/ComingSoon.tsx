"use client";

import { useT } from "@/lib/i18n";
import type { TranslationKey } from "@/constants/translations";

export function ComingSoon({ titleKey }: { titleKey: TranslationKey }) {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-xl border border-border bg-card px-10 py-12 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">{t(titleKey)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("common.comingSoon")}</p>
      </div>
    </div>
  );
}
