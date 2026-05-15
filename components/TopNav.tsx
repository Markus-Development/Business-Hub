"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plug } from "lucide-react";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/constants/translations";

type Tab = { href: string; label: TranslationKey };

const TABS: Tab[] = [
  { href: "/projects", label: "nav.projects" },
  { href: "/digest", label: "nav.digest" },
  { href: "/calendar", label: "nav.calendar" },
  { href: "/clients", label: "nav.clients" },
  { href: "/areas", label: "nav.areas" },
  { href: "/resources", label: "nav.resources" },
];

export function TopNav() {
  const pathname = usePathname();
  const t = useT();

  // Single check on mount — top nav shows the connect affordance until Google is linked.
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/google/status")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setGoogleConnected(!!j?.connected);
      })
      .catch(() => {
        if (!cancelled) setGoogleConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-14 min-w-[1280px] max-w-screen-2xl items-center gap-6 px-6">
        <Link
          href="/projects"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {t("app.title")}
        </Link>
        <nav className="flex flex-1 items-center justify-center gap-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t(tab.label)}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <LocaleToggle />
          {googleConnected === false && (
            <a
              href="/api/google/connect"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Plug className="size-3.5" aria-hidden />
              {t("google.connect")}
            </a>
          )}
          <div
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
          >
            ML
          </div>
        </div>
      </div>
    </header>
  );
}
