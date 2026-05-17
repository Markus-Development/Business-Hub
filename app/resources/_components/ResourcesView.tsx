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
import { ArrowDown, ArrowUp, ChevronsUpDown, ExternalLink, Link as LinkIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NotionResource } from "@/lib/notion";
import { AddResourceDialog } from "./AddResourceDialog";
import { ResourceDrawer } from "./ResourceDrawer";

type Props = {
  resources: NotionResource[];
  notConfigured?: boolean;
  error?: boolean;
};

const ALL = "__all";

export function ResourcesView({ resources: initial, notConfigured, error }: Props) {
  const t = useT();
  const [locale] = useLocale();
  const [resources, setResources] = useState<NotionResource[]>(initial);
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", { dateStyle: "medium" }),
    [locale],
  );

  // Unique non-null values, sorted A–Z. Same pattern for both filters so the
  // option lists reflect the actual data, not a hardcoded enum.
  const areaOptions = useMemo(() => uniqSorted(resources.map((r) => r.area)), [resources]);
  const typeOptions = useMemo(() => uniqSorted(resources.map((r) => r.type)), [resources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (areaFilter && r.area !== areaFilter) return false;
      if (typeFilter && r.type !== typeFilter) return false;
      if (!q) return true;
      const hay = `${r.name}\n${r.summary ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [resources, query, areaFilter, typeFilter]);

  const columns = useMemo<ColumnDef<NotionResource>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("resources.col.name"),
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            // Clicking the cell opens the drawer — bubble up to the row click
            // handler rather than handling here; the row handler dispatches.
            // (Keeping the button for keyboard a11y / hover affordance.)
            onClick={() => setSelectedResourceId(row.original.id)}
            className="block w-full truncate text-left font-medium text-foreground hover:underline"
            title={row.original.name}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: "area",
        header: t("resources.col.area"),
        cell: ({ row }) => (row.original.area ? <Pill>{row.original.area}</Pill> : <Dash />),
      },
      {
        accessorKey: "type",
        header: t("resources.col.type"),
        cell: ({ row }) => (row.original.type ? <Pill>{row.original.type}</Pill> : <Dash />),
      },
      {
        accessorKey: "status",
        header: t("resources.col.status"),
        cell: ({ row }) =>
          row.original.status ? (
            <span className="text-sm text-foreground">{row.original.status}</span>
          ) : (
            <Dash />
          ),
      },
      {
        id: "tags",
        header: t("resources.col.tags"),
        enableSorting: false,
        cell: ({ row }) => {
          const tags = row.original.tags;
          if (tags.length === 0) return <Dash />;
          const joined = tags.join(", ");
          return (
            <span
              className="block max-w-[160px] truncate text-sm text-muted-foreground"
              title={joined}
            >
              {joined}
            </span>
          );
        },
      },
      {
        id: "source",
        header: t("resources.col.source"),
        enableSorting: false,
        cell: ({ row }) => {
          const src = row.original.source;
          if (!src) return <Dash />;
          const host = safeHostname(src) ?? src;
          return (
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex max-w-[180px] items-center gap-1 truncate text-sm text-primary hover:underline"
              title={src}
            >
              <LinkIcon size={12} aria-hidden className="shrink-0" />
              <span className="truncate">{host}</span>
            </a>
          );
        },
      },
      {
        accessorKey: "lastReviewed",
        header: t("resources.col.lastReviewed"),
        sortingFn: (a, b) => {
          const av = a.original.lastReviewed ?? "";
          const bv = b.original.lastReviewed ?? "";
          if (!av && !bv) return 0;
          if (!av) return 1;
          if (!bv) return -1;
          return av.localeCompare(bv);
        },
        cell: ({ row }) =>
          row.original.lastReviewed ? (
            <span className="font-mono text-sm text-muted-foreground">
              {safeFormat(dateFormatter, row.original.lastReviewed)}
            </span>
          ) : (
            <Dash />
          ),
      },
      {
        id: "open",
        header: "",
        enableSorting: false,
        // Fixed-width column for the "Open in Notion" icon. Stop propagation so
        // clicking the icon doesn't also open the drawer.
        cell: ({ row }) => (
          <a
            href={row.original.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={t("projects.drawer.openInNotion")}
            className="inline-flex size-7 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink size={14} aria-hidden />
          </a>
        ),
      },
    ],
    [t, dateFormatter],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Drawer source is the full `resources` list, NOT the filtered view, so the
  // drawer stays open if a subsequent filter change would otherwise hide the row.
  const selectedResource = useMemo(
    () =>
      selectedResourceId
        ? resources.find((r) => r.id === selectedResourceId) ?? null
        : null,
    [resources, selectedResourceId],
  );

  if (notConfigured) {
    return (
      <div className="mx-auto max-w-screen-xl px-6 py-10">
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t("resources.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("resources.notConfigured")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">{t("resources.title")}</h1>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("resources.search")}
          className="h-9 max-w-md flex-1 text-sm"
        />
        <Select
          value={areaFilter || ALL}
          onValueChange={(v) => setAreaFilter(v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[200px] text-sm">
            <SelectValue placeholder={t("resources.allAreas")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("resources.allAreas")}</SelectItem>
            {areaOptions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter || ALL}
          onValueChange={(v) => setTypeFilter(v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[180px] text-sm">
            <SelectValue placeholder={t("resources.filter.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("resources.filter.allTypes")}</SelectItem>
            {typeOptions.map((tp) => (
              <SelectItem key={tp} value={tp}>
                {tp}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("resources.addNote")}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{t("resources.error")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted/40">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sort = header.column.getIsSorted();
                    const isOpenCol = header.column.id === "open";
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          "select-none px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                          isOpenCol && "w-[48px] px-2",
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
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    {t("resources.empty")}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedResourceId(row.original.id)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-muted/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-4 py-2.5 align-middle",
                          cell.column.id === "open" && "w-[48px] px-2",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ResourceDrawer
        resource={selectedResource}
        open={selectedResource !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedResourceId(null);
        }}
      />

      <AddResourceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(r) => setResources((prev) => [r, ...prev])}
      />
    </div>
  );
}

function uniqSorted(values: (string | null)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (v) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function Dash() {
  return <span className="text-sm text-muted-foreground/70">—</span>;
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function safeFormat(fmt: Intl.DateTimeFormat, iso: string): string {
  try {
    return fmt.format(new Date(iso));
  } catch {
    return iso;
  }
}
