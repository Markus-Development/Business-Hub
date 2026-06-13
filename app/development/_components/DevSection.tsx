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
import { DEV_TYPES } from "@/constants/development";
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

// One product section: a prominent heading + the product's items grouped by Dev
// Type (DEV_TYPES order, plus a trailing "Ohne Typ" group so nothing is hidden).
// Renders nothing when the product has no matching items.
export function DevSection({
  title,
  items,
  statusOptions,
  statusPlaceholder,
  onStatusChange,
  onOpenProject,
}: Props) {
  const t = useT();

  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: Project[] }[] = [];
    for (const type of DEV_TYPES) {
      const rows = items
        .filter((p) => p.devType === type)
        .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
      if (rows.length > 0) out.push({ key: type, label: type, rows });
    }
    const untyped = items
      .filter((p) => p.devType == null || !(DEV_TYPES as readonly string[]).includes(p.devType))
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
    if (untyped.length > 0) {
      out.push({ key: "__none", label: t("development.noDevType"), rows: untyped });
    }
    return out;
  }, [items, t]);

  if (groups.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2.5 border-b border-border pb-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
          {items.length}
        </span>
      </div>

      <div className="space-y-5">
        {groups.map((g) => (
          <div key={g.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </h3>
              <span className="text-[11px] font-medium text-muted-foreground/60">{g.rows.length}</span>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </div>
            <ul className="space-y-2">
              {g.rows.map((p) => (
                <li key={p.id}>
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors hover:border-foreground/20 hover:bg-muted/40">
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
          </div>
        ))}
      </div>
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
