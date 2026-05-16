"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plug } from "lucide-react";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { USER } from "@/constants/user";
import { ROUTES } from "@/constants/routes";
import type { TranslationKey } from "@/constants/translations";

type Tab = { href: string; label: TranslationKey };

const TABS: Tab[] = [
  { href: ROUTES.pages.projects, label: "nav.projects" },
  { href: ROUTES.pages.digest, label: "nav.digest" },
  { href: ROUTES.pages.calendar, label: "nav.calendar" },
  { href: ROUTES.pages.clients, label: "nav.clients" },
  { href: ROUTES.pages.areas, label: "nav.areas" },
  { href: ROUTES.pages.resources, label: "nav.resources" },
];

export function TopNav() {
  const pathname = usePathname();
  const t = useT();

  // Top nav shows the connect affordance until Google is linked. Re-checks on a
  // `bh:google-status-changed` window event (dispatched after disconnect from /profile)
  // so the button reappears without a full reload.
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const refreshGoogleStatus = useCallback(async () => {
    try {
      const r = await fetch(ROUTES.api.google.status);
      const j = (await r.json()) as { connected?: boolean };
      setGoogleConnected(!!j?.connected);
    } catch {
      setGoogleConnected(false);
    }
  }, []);
  useEffect(() => {
    void refreshGoogleStatus();
    const handler = () => {
      void refreshGoogleStatus();
    };
    window.addEventListener("bh:google-status-changed", handler);
    return () => {
      window.removeEventListener("bh:google-status-changed", handler);
    };
  }, [refreshGoogleStatus]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-14 min-w-[1280px] max-w-screen-2xl items-center gap-6 px-6">
        <Link
          href={ROUTES.pages.projects}
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
              href={ROUTES.api.google.connect}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Plug className="size-3.5" aria-hidden />
              {t("google.connect")}
            </a>
          )}
          <Link
            href={ROUTES.pages.profile}
            aria-label={t("profile.title")}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
              pathname === ROUTES.pages.profile || pathname.startsWith(ROUTES.pages.profile + "/")
                ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {USER.INITIALS}
          </Link>
        </div>
      </div>
    </header>
  );
}
