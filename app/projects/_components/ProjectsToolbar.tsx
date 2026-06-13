"use client";

import { useMemo } from "react";
import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PRIORITIES } from "@/constants/priorities";
import { DEPARTMENTS } from "@/constants/departments";
import {
  PROJECT_VIEWS,
  PROJECT_VIEW_STATUSES,
  DEFAULT_VIEW_KEY,
} from "@/constants/project-views";
import type { TranslationKey } from "@/constants/translations";
import type { SelectOption } from "@/lib/notion";

export type View = "table" | "kanban" | "calendar";
export const VIEWS = ["table", "kanban", "calendar"] as const;

const ALL = "__all";

// The combined Status dropdown carries two kinds of value in one control:
//   "view:<key>"     → a named preset (Open / Backlog / On Hold / Done) that
//                      narrows only Table + Calendar; Kanban keeps its own columns.
//   "status:<name>"  → a single Notion status that filters ALL views incl. Kanban.
// Encoding both into one string keeps the selection mutually exclusive, so the
// old "preset + contradictory status filter = empty list" case can't occur.
const SCOPE_VIEW_PREFIX = "view:";
const SCOPE_STATUS_PREFIX = "status:";
export const DEFAULT_SCOPE = `${SCOPE_VIEW_PREFIX}${DEFAULT_VIEW_KEY}`;

const VIEW_PRESET_KEYS = PROJECT_VIEWS.map((v) => v.key) as readonly string[];

export function isPresetScope(scope: string): boolean {
  return scope.startsWith(SCOPE_VIEW_PREFIX);
}
export function presetKeyOf(scope: string): string | null {
  return isPresetScope(scope) ? scope.slice(SCOPE_VIEW_PREFIX.length) : null;
}
export function statusOf(scope: string): string {
  return scope.startsWith(SCOPE_STATUS_PREFIX)
    ? scope.slice(SCOPE_STATUS_PREFIX.length)
    : "";
}

// Parse a raw localStorage value into a valid scope string, migrating legacy
// bare preset keys ("open"/"backlog"/…) written by the old `viewPreset` state.
export function parseScope(raw: string | null): string {
  if (!raw) return DEFAULT_SCOPE;
  if (raw.startsWith(SCOPE_VIEW_PREFIX)) {
    return VIEW_PRESET_KEYS.includes(raw.slice(SCOPE_VIEW_PREFIX.length))
      ? raw
      : DEFAULT_SCOPE;
  }
  if (raw.startsWith(SCOPE_STATUS_PREFIX)) {
    return (PROJECT_VIEW_STATUSES as readonly string[]).includes(
      raw.slice(SCOPE_STATUS_PREFIX.length),
    )
      ? raw
      : DEFAULT_SCOPE;
  }
  // Legacy bare preset key (pre-combined-dropdown) → migrate to prefixed form.
  if (VIEW_PRESET_KEYS.includes(raw)) return `${SCOPE_VIEW_PREFIX}${raw}`;
  return DEFAULT_SCOPE;
}

type Props = {
  view: View;
  onChangeView: (v: View) => void;
  scope: string;
  onChangeScope: (v: string) => void;
  /** Live Notion status options (with colour); falls back to PROJECT_VIEW_STATUSES. */
  statusOptions: SelectOption[];
  departmentFilter: string;
  onChangeDepartment: (v: string) => void;
  priorityFilter: string;
  onChangePriority: (v: string) => void;
  groupByDepartment: boolean;
  onToggleGroupByDepartment: () => void;
  onAdd: () => void;
};

export function ProjectsToolbar({
  view,
  onChangeView,
  scope,
  onChangeScope,
  statusOptions,
  departmentFilter,
  onChangeDepartment,
  priorityFilter,
  onChangePriority,
  groupByDepartment,
  onToggleGroupByDepartment,
  onAdd,
}: Props) {
  const t = useT();

  // Individual status entries for group 2. Use the live Notion option names when
  // loaded (so newly-added options appear without a code change), otherwise fall
  // back to the static PROJECT_VIEW_STATUSES union. Label = translated
  // `status.<name>` when that key exists, else the raw Notion name.
  const statusEntries = useMemo(() => {
    const names =
      statusOptions.length > 0
        ? statusOptions.map((o) => o.name)
        : (PROJECT_VIEW_STATUSES as readonly string[]).slice();
    return names.map((name) => {
      const key = `status.${name}` as TranslationKey;
      const translated = t(key);
      const label = translated && translated !== key ? translated : name;
      return { name, label };
    });
  }, [statusOptions, t]);

  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:overflow-x-auto">
      {/* View toggle — fixed left. */}
      <div
        role="group"
        aria-label={t("projects.viewToggle.ariaLabel")}
        className="inline-flex shrink-0 items-center rounded-md border border-border bg-card p-0.5"
      >
        {VIEWS.map((v) => {
          const active = view === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChangeView(v)}
              aria-pressed={active}
              className={cn(
                "rounded-sm px-3 py-1 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`projects.view.${v}` as const)}
            </button>
          );
        })}
      </div>

      <div className="hidden h-6 w-px shrink-0 bg-border md:block" aria-hidden />

      {/* Filters — centre, allowed to shrink so the row stays one line on desktop. */}
      <div className="flex min-w-0 flex-wrap items-center gap-2 md:flex-nowrap">
        <Select value={scope} onValueChange={onChangeScope}>
          <SelectTrigger
            aria-label={t("projects.scope.label")}
            className="h-9 w-[150px] shrink text-sm"
          >
            <SelectValue placeholder={t("projects.scope.label")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("projects.scope.groupViews")}</SelectLabel>
              {PROJECT_VIEWS.map((v) => (
                <SelectItem key={v.key} value={`${SCOPE_VIEW_PREFIX}${v.key}`}>
                  {t(`projects.views.${v.key}` as const)}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>{t("projects.scope.groupStatus")}</SelectLabel>
              {statusEntries.map((s) => (
                <SelectItem key={s.name} value={`${SCOPE_STATUS_PREFIX}${s.name}`}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={departmentFilter || ALL}
          onValueChange={(v) => onChangeDepartment(v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[150px] shrink text-sm">
            <SelectValue placeholder={t("projects.filter.allDepartments")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("projects.filter.allDepartments")}</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter || ALL}
          onValueChange={(v) => onChangePriority(v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[140px] shrink text-sm">
            <SelectValue placeholder={t("projects.filter.allPriorities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("projects.filter.allPriorities")}</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`priority.${p}` as const)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions — right-aligned. */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {view === "table" && (
          <button
            type="button"
            onClick={onToggleGroupByDepartment}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
              groupByDepartment
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers size={14} aria-hidden />
            {t("projects.groupByDepartment")}
          </button>
        )}
        <Button size="sm" onClick={onAdd}>
          <Plus className="size-4" aria-hidden />
          {t("projects.add.button")}
        </Button>
      </div>
    </div>
  );
}
