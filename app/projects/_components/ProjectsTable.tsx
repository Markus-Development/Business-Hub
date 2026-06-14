"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DueDateCell } from "./cells/DueDateCell";
import { OptionBadgeSelect } from "./cells/OptionBadgeSelect";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  PRIORITIES,
  priorityColourBg,
  priorityColourText,
  type Priority,
} from "@/constants/priorities";
import { DEPARTMENTS } from "@/constants/departments";
import type { Project, SelectOption } from "@/lib/notion";
import type { TranslationKey } from "@/constants/translations";
import type { UpdateField } from "./api";

type Props = {
  items: Project[];
  onUpdate: (pageId: string, field: UpdateField, value: string | null) => void;
  onOpenProject: (pageId: string) => void;
  statusOptions: SelectOption[];
  departmentOptions: SelectOption[];
  groupByDepartment?: boolean;
};

type RowEntry =
  | { kind: "header"; department: string }
  | { kind: "row"; row: Row<Project> };

// Per-column width/alignment classes applied to both <th> and <td>. Kept in
// columnDef.meta so the generic header/body render can pick them up. Auto-layout
// table: the Name column gets `w-full` to absorb slack; the others are fixed so
// Name + Due Date fit without horizontal scroll.
type ColMeta = { cellClass?: string; headerClass?: string };

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

export function ProjectsTable({
  items,
  onUpdate,
  onOpenProject,
  statusOptions,
  departmentOptions,
  groupByDepartment = false,
}: Props) {
  const t = useT();
  const [locale] = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);

  // Compact numeric format (de-DE → "21.06.2026", en-US → "06/21/2026") so the
  // Due Date cell stays short and the column never overflows / truncates at
  // normal desktop width. The long "month: short" form ("21. Juni 2026") used to
  // collapse the cell when Name (w-full) absorbed the slack.
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [locale],
  );

  // Badge options for the Status column. Use the translated label when the Notion
  // option name matches one of our enumerated Status values (i.e. has a
  // `status.<name>` key); otherwise show the raw Notion name. The raw name stays
  // the option value so writes round-trip cleanly with Notion's schema.
  const statusBadgeOptions = useMemo(
    () =>
      statusOptions.map((o) => {
        const key = `status.${o.name}` as TranslationKey;
        const translated = t(key);
        // useT() returns the key itself when no entry exists — fall back to the raw name.
        const label = translated && translated !== key ? translated : o.name;
        return { value: o.name, label, color: o.color };
      }),
    [statusOptions, t],
  );

  // Badge options for the Department column. If Notion hasn't returned the option list
  // yet (mount-time fetch in flight), fall back to the static DEPARTMENTS enum so the
  // table still renders interactable selects — colours degrade to the muted default.
  const departmentBadgeOptions = useMemo(() => {
    const live = departmentOptions.map((o) => ({
      value: o.name,
      label: o.name,
      color: o.color,
    }));
    if (live.length > 0) return live;
    return DEPARTMENTS.map((name) => ({ value: name, label: name, color: null }));
  }, [departmentOptions]);

  // Priority traffic-light pill options. `color` carries the priority value itself
  // so the priority colour resolvers (passed to OptionBadgeSelect) key on it.
  const priorityBadgeOptions = useMemo(
    () =>
      PRIORITIES.map((p) => ({
        value: p,
        label: t(`priority.${p}` as const),
        color: p as string,
      })),
    [t],
  );

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("projects.col.name"),
        // Name absorbs the table's free width (w-full on the column). The button
        // truncates (min-w-0) so long names ellipsize with the full text in `title`.
        meta: { cellClass: "w-full", headerClass: "w-full" } satisfies ColMeta,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenProject(row.original.id)}
              className={cn(
                "min-w-0 flex-1 truncate rounded px-1 py-1 text-left font-sans text-sm font-medium transition-colors hover:bg-muted",
                row.original.name ? "text-foreground" : "text-muted-foreground/70",
              )}
              title={row.original.name}
            >
              {row.original.name || t("projects.cell.addName")}
            </button>
            <a
              href={row.original.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("projects.drawer.openInNotion")}
              className="shrink-0 rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("projects.col.status"),
        meta: { cellClass: "w-[120px]", headerClass: "w-[120px]" } satisfies ColMeta,
        cell: ({ row }) => (
          <OptionBadgeSelect
            value={row.original.status}
            options={statusBadgeOptions}
            onChange={(v) => onUpdate(row.original.id, "Status", v)}
            placeholder="—"
            widthClass="w-[112px]"
          />
        ),
      },
      {
        accessorKey: "department",
        header: t("projects.col.department"),
        meta: { cellClass: "w-[130px]", headerClass: "w-[130px]" } satisfies ColMeta,
        cell: ({ row }) => (
          <OptionBadgeSelect
            value={row.original.department}
            options={departmentBadgeOptions}
            onChange={(v) => onUpdate(row.original.id, "Department", v)}
            placeholder={t("projects.cell.noDepartment")}
            widthClass="w-[122px]"
          />
        ),
      },
      {
        accessorKey: "priority",
        header: t("projects.col.priority"),
        meta: { cellClass: "w-[104px]", headerClass: "w-[104px]" } satisfies ColMeta,
        sortingFn: (a, b) => {
          const av = a.original.priority ? PRIORITY_ORDER[a.original.priority] : 99;
          const bv = b.original.priority ? PRIORITY_ORDER[b.original.priority] : 99;
          return av - bv;
        },
        // Traffic-light pill (High = red, Medium = amber, Low = green) via the
        // shared OptionBadgeSelect with the priority colour resolvers. Inline edit
        // is preserved — the trigger is the pill, the dropdown lists all options.
        cell: ({ row }) => (
          <OptionBadgeSelect
            value={row.original.priority}
            options={priorityBadgeOptions}
            onChange={(v) => onUpdate(row.original.id, "Priority", v)}
            placeholder="—"
            widthClass="w-[96px]"
            bgFor={priorityColourBg}
            textFor={priorityColourText}
          />
        ),
      },
      {
        accessorKey: "dueDate",
        header: t("projects.col.dueDate"),
        meta: { cellClass: "w-[112px]", headerClass: "w-[112px]" } satisfies ColMeta,
        sortingFn: (a, b) => {
          const av = a.original.dueDate ?? "";
          const bv = b.original.dueDate ?? "";
          if (!av && !bv) return 0;
          if (!av) return 1;
          if (!bv) return -1;
          return av.localeCompare(bv);
        },
        cell: ({ row }) => (
          <DueDateCell
            value={row.original.dueDate}
            onSave={(v) => onUpdate(row.original.id, "Due Date", v)}
            dateFormatter={dateFormatter}
          />
        ),
      },
    ],
    [t, dateFormatter, onUpdate, onOpenProject, priorityBadgeOptions, statusBadgeOptions, departmentBadgeOptions],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Flat list of row + group-header entries the tbody renders directly. When
  // grouping is off, just wrap each TanStack row in a `{kind:"row"}` entry.
  // When on, sort by DEPARTMENTS index (unknown departments drop to the end) and
  // inject a header entry whenever the department changes. Grouping is done in JS
  // — TanStack Table's getGroupedRowModel isn't used here.
  const rowEntries = useMemo<RowEntry[]>(() => {
    const rows = table.getRowModel().rows;
    if (!groupByDepartment) return rows.map((row) => ({ kind: "row", row }));

    const sorted = [...rows].sort((a, b) => {
      const ai = (DEPARTMENTS as readonly string[]).indexOf(a.original.department ?? "");
      const bi = (DEPARTMENTS as readonly string[]).indexOf(b.original.department ?? "");
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });

    const entries: RowEntry[] = [];
    let lastDepartment: string | null = null;
    for (const row of sorted) {
      const department = row.original.department ?? t("projects.noDepartment");
      if (department !== lastDepartment) {
        entries.push({ kind: "header", department });
        lastDepartment = department;
      }
      entries.push({ kind: "row", row });
    }
    return entries;
    // `items` MUST be in the deps: the `table` instance is a stable reference and
    // does not change when the project list changes, so without `items` here this
    // memo keeps a stale `rowEntries` array on view-switch / add / status-update.
    // Depending on `items` re-runs the memo, and table.getRowModel() then returns
    // the current rows. (`sorting` stays a dep so column-sort toggles re-derive too.)
  }, [table, items, groupByDepartment, t, sorting]);

  return (
    <>
      {/* Mobile: stacked card layout (label/value pairs) — no horizontal scroll. */}
      <div className="space-y-3 md:hidden">
        {rowEntries.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
            {t("projects.empty")}
          </div>
        ) : (
          rowEntries.map((entry) =>
            entry.kind === "header" ? (
              <h3
                key={`mgroup-${entry.department}`}
                className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {entry.department}
              </h3>
            ) : (
              <div
                key={`m-${entry.row.id}`}
                className="rounded-xl border border-border bg-card p-3 shadow-sm"
              >
                <div className="mb-2 flex items-start gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenProject(entry.row.original.id)}
                    className={cn(
                      "min-w-0 flex-1 break-words text-left text-sm font-semibold",
                      entry.row.original.name
                        ? "text-foreground"
                        : "text-muted-foreground/70",
                    )}
                  >
                    {entry.row.original.name || t("projects.cell.addName")}
                  </button>
                  <a
                    href={entry.row.original.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("projects.drawer.openInNotion")}
                    className="shrink-0 rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </div>
                <dl className="space-y-1.5">
                  <CardRow label={t("projects.col.status")}>
                    <OptionBadgeSelect
                      value={entry.row.original.status}
                      options={statusBadgeOptions}
                      onChange={(v) => onUpdate(entry.row.original.id, "Status", v)}
                      placeholder="—"
                      widthClass="w-full"
                    />
                  </CardRow>
                  <CardRow label={t("projects.col.department")}>
                    <OptionBadgeSelect
                      value={entry.row.original.department}
                      options={departmentBadgeOptions}
                      onChange={(v) => onUpdate(entry.row.original.id, "Department", v)}
                      placeholder={t("projects.cell.noDepartment")}
                      widthClass="w-full"
                    />
                  </CardRow>
                  <CardRow label={t("projects.col.priority")}>
                    <Select
                      value={entry.row.original.priority ?? undefined}
                      onValueChange={(v) =>
                        onUpdate(entry.row.original.id, "Priority", v)
                      }
                    >
                      <SelectTrigger className="h-9 w-full font-sans text-sm">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {t(`priority.${p}` as const)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardRow>
                  <CardRow label={t("projects.col.dueDate")}>
                    <DueDateCell
                      value={entry.row.original.dueDate}
                      onSave={(v) => onUpdate(entry.row.original.id, "Due Date", v)}
                      dateFormatter={dateFormatter}
                    />
                  </CardRow>
                  {/* Next Action lives in the ProjectDrawer (table parity) — not on
                      the mobile card. The onUpdate "Next Action" path stays for the drawer. */}
                </dl>
              </div>
            ),
          )
        )}
      </div>

      {/* Desktop: table layout. */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted/40">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sort = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={cn(
                      "select-none px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      (header.column.columnDef.meta as ColMeta | undefined)?.headerClass,
                    )}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "inline-flex items-center gap-1.5 transition-colors hover:text-foreground",
                          sort && "text-foreground",
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sort === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : sort === "desc" ? (
                          <ArrowDown className="size-3" />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rowEntries.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-muted-foreground"
              >
                {t("projects.empty")}
              </td>
            </tr>
          ) : (
            rowEntries.map((entry) =>
              entry.kind === "header" ? (
                <tr key={`group-${entry.department}`}>
                  <td
                    colSpan={columns.length}
                    className="bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {entry.department}
                  </td>
                </tr>
              ) : (
                <tr
                  key={entry.row.id}
                  className="border-t border-border transition-colors hover:bg-muted/30"
                >
                  {entry.row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-2.5 align-middle",
                        (cell.column.columnDef.meta as ColMeta | undefined)?.cellClass,
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ),
            )
          )}
        </tbody>
      </table>
      </div>
    </>
  );
}

function CardRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
