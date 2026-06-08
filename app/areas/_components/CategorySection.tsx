"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n";

const STORAGE_PREFIX = "bh.areas.section.";

type Props = {
  /** Stable storage key segment (the category name or "none"). */
  storageKey: string;
  title: string;
  count: number;
  children: React.ReactNode;
};

// Lightweight collapsible section for the Areas grid. Open/closed state persists
// per category in localStorage; defaults to expanded. No shadcn-collapsible
// dependency — just a button toggle + lucide chevrons.
export function CategorySection({ storageKey, title, count, children }: Props) {
  const t = useT();
  const [open, setOpen] = useState(true);

  // Mount-read of the persisted state. Primitive dep (storageKey) keeps this
  // loop-safe; runs once per section.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
      if (stored === "collapsed") setOpen(false);
    } catch {
      // localStorage unavailable — keep default expanded.
    }
  }, [storageKey]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          `${STORAGE_PREFIX}${storageKey}`,
          next ? "expanded" : "collapsed",
        );
      } catch {
        // ignore persistence failure
      }
      return next;
    });
  };

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? t("areas.category.collapse") : t("areas.category.expand")}
        className="mb-3 flex w-full items-center gap-2 text-left"
      >
        {open ? (
          <ChevronDown size={18} className="text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight size={18} className="text-muted-foreground" aria-hidden />
        )}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t("areas.category.count").replace("{count}", String(count))}
        </span>
      </button>
      {open && children}
    </section>
  );
}
