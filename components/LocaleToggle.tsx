"use client";

import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LocaleToggle() {
  const [locale, setLocale] = useLocale();
  const t = useT();
  const options = [
    { code: "de" as const, key: "locale.de" as const },
    { code: "en" as const, key: "locale.en" as const },
  ];
  return (
    <div
      role="group"
      aria-label="Locale"
      className="inline-flex items-center rounded-md border border-border bg-card p-0.5 text-xs"
    >
      {options.map((o) => {
        const active = locale === o.code;
        return (
          <button
            key={o.code}
            type="button"
            onClick={() => setLocale(o.code)}
            aria-pressed={active}
            className={cn(
              "rounded-sm px-2 py-1 font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(o.key)}
          </button>
        );
      })}
    </div>
  );
}
