"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_GROUPS } from "@/constants/nav";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const COLLAPSED_KEY = "bh.sidebar.collapsed";
const GROUP_PREFIX = "bh.sidebar.group.";

type Props = {
  /** Called after a nav link is clicked — used by the mobile Sheet to close itself. */
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: Props) {
  const pathname = usePathname();
  const t = useT();

  // Rail-collapse: whole sidebar shrinks to an icon-only rail. Default expanded.
  const [collapsed, setCollapsed] = useState(false);
  // Per-group accordion open state. Default all expanded.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Mount-read of persisted state. Empty deps → runs once; no objects/functions
  // in deps, no fetch — loop-safe per Standard Prompt Constraints.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSED_KEY) === "collapsed") {
        setCollapsed(true);
      }
      const next: Record<string, boolean> = {};
      for (const group of NAV_GROUPS) {
        const stored = window.localStorage.getItem(`${GROUP_PREFIX}${group.labelKey}`);
        next[group.labelKey] = stored !== "collapsed";
      }
      setOpenGroups(next);
    } catch {
      // localStorage unavailable — keep defaults (expanded).
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "collapsed" : "expanded");
      } catch {
        // ignore persistence failure
      }
      return next;
    });
  };

  const toggleGroup = (labelKey: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [labelKey]: !(prev[labelKey] ?? true) };
      try {
        window.localStorage.setItem(
          `${GROUP_PREFIX}${labelKey}`,
          next[labelKey] ? "expanded" : "collapsed",
        );
      } catch {
        // ignore persistence failure
      }
      return next;
    });
  };

  return (
    <nav
      className={cn(
        "flex h-full flex-col gap-4 overflow-y-auto p-3 transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
      aria-label={t("nav.menu")}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        title={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        className={cn(
          "flex items-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          collapsed ? "justify-center" : "justify-end",
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" aria-hidden />
        ) : (
          <PanelLeftClose className="size-4" aria-hidden />
        )}
      </button>

      {NAV_GROUPS.map((group) => {
        const open = openGroups[group.labelKey] ?? true;
        return (
          <div key={group.labelKey} className="flex flex-col gap-1">
            {!collapsed && (
              <button
                type="button"
                onClick={() => toggleGroup(group.labelKey)}
                aria-expanded={open}
                className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
              >
                {open ? (
                  <ChevronDown className="size-3.5" aria-hidden />
                ) : (
                  <ChevronRight className="size-3.5" aria-hidden />
                )}
                {t(group.labelKey)}
              </button>
            )}
            {/* In the rail, group headers + accordion are hidden and all links
                stay flat/visible. */}
            {(collapsed || open) && (
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? t(item.label) : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md text-sm font-medium transition-colors",
                        collapsed ? "justify-center px-2 py-2" : "px-3 py-2",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      {!collapsed && <span>{t(item.label)}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
