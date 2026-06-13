"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plug,
  Inbox,
  FolderKanban,
  Code2,
  Sparkles,
  CalendarDays,
  Users,
  LayoutGrid,
  BookOpen,
  BookMarked,
  NotebookPen,
  Phone,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";
import { LocaleToggle } from "@/components/LocaleToggle";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { USER } from "@/constants/user";
import { ROUTES } from "@/constants/routes";
import type { TranslationKey } from "@/constants/translations";

type Tab = { href: string; label: TranslationKey; icon: LucideIcon };

const TABS: Tab[] = [
  { href: ROUTES.pages.projects, label: "nav.projects", icon: FolderKanban },
  { href: ROUTES.pages.development, label: "nav.development", icon: Code2 },
  { href: ROUTES.pages.digest, label: "nav.digest", icon: Sparkles },
  { href: ROUTES.pages.calendar, label: "nav.calendar", icon: CalendarDays },
  { href: ROUTES.pages.clients, label: "nav.clients", icon: Users },
  { href: ROUTES.pages.areas, label: "nav.areas", icon: LayoutGrid },
  { href: ROUTES.pages.resources, label: "nav.resources", icon: BookOpen },
  { href: ROUTES.pages.calls, label: "nav.calls", icon: Phone },
  { href: ROUTES.pages.freizeit, label: "nav.freizeit", icon: Gamepad2 },
  { href: ROUTES.pages.buecher, label: "nav.buecher", icon: BookMarked },
  { href: ROUTES.pages.journal, label: "nav.journal", icon: NotebookPen },
  { href: ROUTES.pages.inbox, label: "nav.inbox", icon: Inbox },
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
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:h-14 sm:flex-nowrap sm:py-0 sm:px-6">
        <Link
          href={ROUTES.pages.projects}
          className="shrink-0 text-base font-semibold tracking-tight text-foreground"
        >
          {t("app.title")}
        </Link>
        {/* Tabs: wraps to its own full-width, horizontally-scrollable row on mobile;
            centered inline strip on >= sm. */}
        <nav className="order-3 -mx-4 flex w-full items-center gap-1 overflow-x-auto px-4 no-scrollbar sm:order-2 sm:mx-0 sm:w-auto sm:flex-1 sm:justify-center sm:px-0">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <tab.icon className="size-3.5" aria-hidden />
                {t(tab.label)}
              </Link>
            );
          })}
        </nav>
        <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0 sm:gap-3">
          <Link
            href={ROUTES.pages.capture}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              pathname === ROUTES.pages.capture
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            <Inbox className="size-3.5" aria-hidden />
            {t("nav.capture")}
          </Link>
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
