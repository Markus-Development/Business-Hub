"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plug, Inbox, Menu } from "lucide-react";
import { LocaleToggle } from "@/components/LocaleToggle";
import { Sidebar } from "@/components/Sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { USER } from "@/constants/user";
import { ROUTES } from "@/constants/routes";

export function TopNav() {
  const pathname = usePathname();
  const t = useT();

  // Mobile nav drawer (Sheet) open state — the sidebar lives here below `sm`.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
        {/* Mobile hamburger — opens the left Sheet holding the Sidebar. */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label={t("nav.menu")}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <SheetContent side="left" className="w-auto max-w-[80vw] p-0">
            <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <Link
          href={ROUTES.pages.projects}
          className="shrink-0 text-base font-semibold tracking-tight text-foreground"
        >
          {t("app.title")}
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
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
