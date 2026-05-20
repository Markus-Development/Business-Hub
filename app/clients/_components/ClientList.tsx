"use client";

import { useLocale, useT } from "@/lib/i18n";
import { MONTHLY_TASK_NAMES } from "@/constants/client-tasks";
import {
  clientHealth,
  formatEur,
  type MergedClient,
  type SortKey,
} from "./types";

type DetailCacheEntry = {
  detail: unknown;
  loading: boolean;
  hasOverdue: boolean | undefined;
  doneTaskCount: number | undefined;
};

const TOTAL_TASKS = MONTHLY_TASK_NAMES.length;

export function ClientList({
  clients,
  selectedZohoId,
  onSelect,
  sort,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  details,
}: {
  clients: MergedClient[] | null;
  selectedZohoId: string | null;
  onSelect: (zohoId: string) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  statusFilter: string | null;
  onStatusFilterChange: (s: string | null) => void;
  statusOptions: string[];
  details: Record<string, DetailCacheEntry>;
}) {
  const t = useT();
  const [locale] = useLocale();

  return (
    <aside className="flex h-[calc(100vh-13rem)] flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-3 border-b border-border px-4 py-3">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("clients.sort.label")}
          </label>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="overdue">{t("clients.sort.overdue")}</option>
            <option value="outstanding">{t("clients.sort.outstanding")}</option>
            <option value="name">{t("clients.sort.name")}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("clients.filterStatus")}
          </label>
          <select
            value={statusFilter ?? ""}
            onChange={(e) => onStatusFilterChange(e.target.value === "" ? null : e.target.value)}
            className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{t("clients.filterStatus.all")}</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {clients === null ? (
          <li className="px-4 py-6 text-sm text-muted-foreground">{t("clients.loading")}</li>
        ) : clients.length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted-foreground">{t("clients.empty")}</li>
        ) : (
          clients.map((c) => {
            const entry = details[c.zohoContactId];
            const health = clientHealth(c, entry?.hasOverdue);
            const taskCount =
              entry?.doneTaskCount !== undefined
                ? `${entry.doneTaskCount}/${TOTAL_TASKS}`
                : "–";
            const active = selectedZohoId === c.zohoContactId;
            return (
              <li key={c.zohoContactId}>
                <button
                  type="button"
                  onClick={() => onSelect(c.zohoContactId)}
                  className={
                    active
                      ? "flex w-full items-start gap-2 border-l-2 border-primary bg-accent px-4 py-3 text-left"
                      : "flex w-full items-start gap-2 border-l-2 border-transparent px-4 py-3 text-left hover:bg-muted"
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {c.name || c.zohoContactId}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {formatEur(c.outstandingAmount, locale)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <HealthPill health={health} />
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                      {taskCount}
                    </span>
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}

function HealthPill({ health }: { health: "green" | "amber" | "red" }) {
  const t = useT();
  const tone = {
    green: { label: t("clients.health.green"), color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    amber: { label: t("clients.health.amber"), color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
    red: { label: t("clients.health.red"), color: "bg-destructive/15 text-destructive" },
  }[health];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.color}`}>
      {tone.label}
    </span>
  );
}
