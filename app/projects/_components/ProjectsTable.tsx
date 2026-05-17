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
import { NextActionCell } from "./cells/NextActionCell";
import { OptionBadgeSelect } from "./cells/OptionBadgeSelect";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PRIORITIES, type Priority } from "@/constants/priorities";
import { AREAS } from "@/constants/areas";
import type { Project, SelectOption } from "@/lib/notion";
import type { TranslationKey } from "@/constants/translations";
import type { UpdateField } from "./api";

type Props = {
  items: Project[];
  onUpdate: (pageId: string, field: UpdateField, value: string | null) => void;
  onOpenProject: (pageId: string) => void;
  statusOptions: SelectOption[];
  areaOptions: SelectOption[];
  groupByArea?: boolean;
};

type RowEntry =
  | { kind: "header"; area: string }
  | { kind: "row"; row: Row<Project> };

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

export function ProjectsTable({
  items,
  onUpdate,
  onOpenProject,
  statusOptions,
  areaOptions,
  groupByArea = false,
}: Props) {
  const t = useT();
  const [locale] = useLocale();
  const [sorting, setSorting] = useState<SortingState>([]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
        year: "numeric",
        month: "short",
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

  // Badge options for the Area column. If Notion hasn't returned the option list yet
  // (mount-time fetch in flight), fall back to the static AREAS enum so the table
  // still renders interactable selects — colours degrade to the muted default.
  const areaBadgeOptions = useMemo(() => {
    const live = areaOptions.map((o) => ({
      value: o.name,
      label: o.name,
      color: o.color,
    }));
    if (live.length > 0) return live;
    return AREAS.map((name) => ({ value: name, label: name, color: null }));
  }, [areaOptions]);

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("projects.col.name"),
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
        cell: ({ row }) => (
          <OptionBadgeSelect
            value={row.original.status}
            options={statusBadgeOptions}
            onChange={(v) => onUpdate(row.original.id, "Status", v)}
            placeholder="—"
            widthClass="w-[150px]"
          />
        ),
      },
      {
        accessorKey: "area",
        header: t("projects.col.area"),
        cell: ({ row }) => (
          <OptionBadgeSelect
            value={row.original.area}
            options={areaBadgeOptions}
            onChange={(v) => onUpdate(row.original.id, "Area", v)}
            placeholder={t("projects.cell.noArea")}
            widthClass="w-[160px]"
          />
        ),
      },
      {
        accessorKey: "priority",
        header: t("projects.col.priority"),
        sortingFn: (a, b) => {
          const av = a.original.priority ? PRIORITY_ORDER[a.original.priority] : 99;
          const bv = b.original.priority ? PRIORITY_ORDER[b.original.priority] : 99;
          return av - bv;
        },
        cell: ({ row }) => (
          <Select
            value={row.original.priority ?? undefined}
            onValueChange={(v) => onUpdate(row.original.id, "Priority", v)}
          >
            <SelectTrigger className="h-9 w-[130px] font-sans text-sm">
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
        ),
      },
      {
        accessorKey: "dueDate",
        header: t("projects.col.dueDate"),
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
      {
        accessorKey: "nextAction",
        header: t("projects.col.nextAction"),
        enableSorting: true,
        cell: ({ row }) => (
          <NextActionCell
            value={row.original.nextAction}
            onSave={(v) => onUpdate(row.original.id, "Next Action", v)}
          />
        ),
      },
    ],
    [t, dateFormatter, onUpdate, onOpenProject],
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
  // When on, sort by AREAS index (unknown areas drop to the end) and inject a
  // header entry whenever the area changes. Grouping is done in JS — TanStack
  // Table's getGroupedRowModel isn't used here.
  const rowEntries = useMemo<RowEntry[]>(() => {
    const rows = table.getRowModel().rows;
    if (!groupByArea) return rows.map((row) => ({ kind: "row", row }));

    const sorted = [...rows].sort((a, b) => {
      const ai = (AREAS as readonly string[]).indexOf(a.original.area ?? "");
      const bi = (AREAS as readonly string[]).indexOf(b.original.area ?? "");
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });

    const entries: RowEntry[] = [];
    let lastArea: string | null = null;
    for (const row of sorted) {
      const area = row.original.area ?? t("projects.noArea");
      if (area !== lastArea) {
        entries.push({ kind: "header", area });
        lastArea = area;
      }
      entries.push({ kind: "row", row });
    }
    return entries;
    // table identity is stable across renders; sorting state already triggers
    // table.getRowModel() to recompute internally.
  }, [table, groupByArea, t, sorting]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
                    className="select-none px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
                <tr key={`group-${entry.area}`}>
                  <td
                    colSpan={columns.length}
                    className="bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {entry.area}
                  </td>
                </tr>
              ) : (
                <tr
                  key={entry.row.id}
                  className="border-t border-border transition-colors hover:bg-muted/30"
                >
                  {entry.row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5 align-middle">
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
  );
}
