"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Three-state Light / Dark / System control, styled to match <LocaleToggle />.
// next-themes only knows the active theme client-side, so until mounted we render a
// same-size disabled placeholder to avoid a hydration mismatch (the server has no
// way to know the persisted choice).
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const options = [
    { value: "light" as const, key: "theme.light" as const, Icon: Sun },
    { value: "dark" as const, key: "theme.dark" as const, Icon: Moon },
    { value: "system" as const, key: "theme.system" as const, Icon: Monitor },
  ];

  if (!mounted) {
    return (
      <div
        aria-hidden
        className="inline-flex items-center rounded-md border border-border bg-card p-0.5 text-xs"
      >
        {options.map((o) => (
          <span key={o.value} className="rounded-sm px-2 py-1">
            <o.Icon className="size-3.5 opacity-0" />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("theme.toggle")}
      className="inline-flex items-center rounded-md border border-border bg-card p-0.5 text-xs"
    >
      {options.map((o) => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setTheme(o.value)}
            aria-pressed={active}
            aria-label={t(o.key)}
            title={t(o.key)}
            className={cn(
              "rounded-sm px-2 py-1 font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <o.Icon className="size-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
