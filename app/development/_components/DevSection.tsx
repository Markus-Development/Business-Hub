"use client";

import { useMemo } from "react";
import { useT } from "@/lib/i18n";
import {
  notionColour,
  notionColourBg,
  notionColourText,
} from "@/constants/priorities";
import {
  OptionBadgeSelect,
  type BadgeOption,
} from "@/app/projects/_components/cells/OptionBadgeSelect";
import type { TranslationKey } from "@/constants/translations";
import type { Project } from "@/lib/notion";

// Fixed presentation colours (Notion palette names) per Dev Type — purely
// visual, not data owned by Notion.
const DEV_TYPE_COLOUR: Record<string, string> = {
  Feature: "blue",
  Bug: "red",
  Anpassung: "yellow",
};

// Priority -> Notion palette colour name for the leading dot. Presentation only.
const PRIORITY_COLOUR: Record<string, string> = {
  High: "red",
  Medium: "yellow",
  Low: "gray",
};

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function priorityRank(p: string | null): number {
  return p != null && p in PRIORITY_ORDER ? PRIORITY_ORDER[p] : 3;
}

type Props = {
  title: string;
  items: Project[];
  // Live Notion Status options (name + colour) for the inline Status pill.
  statusOptions: BadgeOption[];
  statusPlaceholder: string;
  onStatusChange: (pageId: string, value: string) => void;
  onOpenProject: (pageId: string) => void;
};

// One product section: a prominent heading + a single flat, priority-sorted list
// of the product's items (High -> Medium -> Low, unknown last). The Dev-Type badge
// on each card is now the only place the type is shown. Renders nothing when the
// product has no matching items.
export function DevSection({
  title,
  items,
  statusOptions,
  statusPlaceholder,
  onStatusChange,
  onOpenProject,
}: Props) {
  const t = useT();

  const rows = useMemo(
    () =>
      [...items].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)),
    [items],
  );

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5 border-b border-border pb-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
          {items.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {rows.map((p) => (
          <li key={p.id}>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 shadow-sm transition-colors hover:border-foreground/20 hover:bg-muted/40">
              <button
                type="button"
                onClick={() => onOpenProject(p.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <PriorityDot priority={p.priority} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {p.name || (
                    <span className="text-muted-foreground/70">{t("development.unnamed")}</span>
                  )}
                </span>
                {p.devType && <DevTypeBadge devType={p.devType} />}
              </button>
              {/* Inline Status edit — stopPropagation so it never opens the drawer. */}
              <div
                className="shrink-0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <OptionBadgeSelect
                  value={p.status}
                  options={statusOptions}
                  placeholder={statusPlaceholder}
                  onChange={(value) => onStatusChange(p.id, value)}
                  widthClass="w-[150px]"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PriorityDot({ priority }: { priority: string | null }) {
  const t = useT();
  if (!priority) return <span className="size-2 shrink-0 rounded-full bg-transparent" aria-hidden />;
  const colour = notionColour(PRIORITY_COLOUR[priority] ?? "default");
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ background: colour }}
      title={t(`priority.${priority}` as TranslationKey)}
      aria-hidden
    />
  );
}

function DevTypeBadge({ devType }: { devType: string }) {
  const colour = DEV_TYPE_COLOUR[devType];
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: notionColourBg(colour), color: notionColourText(colour) }}
    >
      {devType}
    </span>
  );
}
