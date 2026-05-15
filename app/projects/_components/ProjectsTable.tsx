"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
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
import { AreaCell } from "./cells/AreaCell";
import { DueDateCell } from "./cells/DueDateCell";
import { NextActionCell } from "./cells/NextActionCell";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PRIORITIES, STATUSES, type Priority } from "@/constants/priorities";
import type { Project } from "@/lib/notion";
import type { UpdateField } from "./api";

type Props = {
  items: Project[];
  onUpdate: (pageId: string, field: UpdateField, value: string | null) => void;
  onOpenProject: (pageId: string) => void;
};

const PRIORITY_ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

export function ProjectsTable({ items, onUpdate, onOpenProject }: Props) {
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
                "min-w-0 flex-1 truncate rounded px-1 py-1 text-left font-medium transition-colors hover:bg-muted",
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
          <Select
            value={row.original.status ?? undefined}
            onValueChange={(v) => onUpdate(row.original.id, "Status", v)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}` as const)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        accessorKey: "area",
        header: t("projects.col.area"),
        cell: ({ row }) => (
          <AreaCell
            value={row.original.area}
            onSave={(v) => onUpdate(row.original.id, "Area", v)}
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
            <SelectTrigger className="h-8 w-[120px] text-xs">
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
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-muted-foreground"
              >
                {t("projects.empty")}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-border transition-colors hover:bg-muted/30">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
