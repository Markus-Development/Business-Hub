"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  ExternalLink,
  Link as LinkIcon,
  Plus,
  Rows2,
  Rows3,
} from "lucide-react";
import { toast } from "sonner";
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
import { ROUTES } from "@/constants/routes";
import { notionColour, notionColourBg, notionColourText } from "@/constants/priorities";
import type { ReasonArchived } from "@/constants/archive";
import type { NotionResource, SelectOption } from "@/lib/notion";
import { AddResourceDialog } from "./AddResourceDialog";
import { ResourceDrawer } from "./ResourceDrawer";

type Props = {
  resources: NotionResource[];
  notConfigured?: boolean;
  error?: boolean;
};

const ALL = "__all";
const DENSITY_KEY = "bh.resources.density";

type Density = "compact" | "comfortable";
// name -> Notion colour name (default | gray | ...) for each of the three
// Resources select properties. Empty until /api/resources/options resolves;
// a missing entry falls back to the muted default pill.
type ColorMaps = {
  area: Record<string, string | null>;
  type: Record<string, string | null>;
  status: Record<string, string | null>;
};

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
  const [density, setDensity] = useState<Density>("compact");
  const [colorMaps, setColorMaps] = useState<ColorMaps>({ area: {}, type: {}, status: {} });

  // Mount-read of the persisted density. Empty deps, primitive value → loop-safe.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DENSITY_KEY);
      if (stored === "comfortable") setDensity("comfortable");
    } catch {
      // localStorage unavailable — keep default compact.
    }
  }, []);

  const toggleDensity = () => {
    setDensity((prev) => {
      const next: Density = prev === "compact" ? "comfortable" : "compact";
      try {
        window.localStorage.setItem(DENSITY_KEY, next);
      } catch {
        // ignore persistence failure
      }
      return next;
    });
  };

  // Fetch the Notion option colours once on mount. Non-fatal: any failure leaves
  // the maps empty and the pills fall back to a muted default. Empty deps keeps
  // it loop-safe; a cancelled flag guards against a late setState after unmount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(ROUTES.api.resources.options);
        if (!res.ok) return;
        const json = (await res.json()) as {
          area?: SelectOption[];
          type?: SelectOption[];
          status?: SelectOption[];
        };
        if (cancelled) return;
        setColorMaps({
          area: toColorMap(json.area),
          type: toColorMap(json.type),
          status: toColorMap(json.status),
        });
      } catch {
        // non-fatal — degrade to neutral pills
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cellPad = density === "compact" ? "px-3 py-1.5" : "px-4 py-2.5";
  const headPad = density === "compact" ? "px-3 py-2" : "px-4 py-2.5";

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
        cell: ({ row }) =>
          row.original.area ? (
            <ColorPill label={row.original.area} color={colorMaps.area[row.original.area] ?? null} />
          ) : (
            <Dash />
          ),
      },
      {
        accessorKey: "type",
        header: t("resources.col.type"),
        cell: ({ row }) =>
          row.original.type ? (
            <ColorPill label={row.original.type} color={colorMaps.type[row.original.type] ?? null} />
          ) : (
            <Dash />
          ),
      },
      {
        accessorKey: "status",
        header: t("resources.col.status"),
        cell: ({ row }) =>
          row.original.status ? (
            <StatusDotLabel
              label={row.original.status}
              color={colorMaps.status[row.original.status] ?? null}
            />
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
            <span className="font-mono text-sm tabular-nums text-muted-foreground">
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
    [t, dateFormatter, colorMaps],
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

  // Archive a resource: optimistically drop the row and close the drawer, then
  // POST. On failure restore the list + toast — the drawer stays closed and the
  // row reappears in the table, so the user can reopen and retry.
  const archiveResource = async (resource: NotionResource, reason: ReasonArchived) => {
    const snapshot = resources;
    setResources(snapshot.filter((r) => r.id !== resource.id));
    setSelectedResourceId(null);
    try {
      const res = await fetch(ROUTES.api.resources.archive(resource.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok !== true) throw new Error(json.error ?? "archive_failed");
      toast.success(t("resources.archive.success"));
    } catch (err) {
      setResources(snapshot);
      toast.error(t("resources.archive.error"));
      // eslint-disable-next-line no-console
      console.error("resource_archive_failed", err);
    }
  };

  if (notConfigured) {
    return (
      <div className="mx-auto max-w-screen-xl px-6 py-10">
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t("resources.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("resources.notConfigured")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">{t("resources.title")}</h1>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("resources.search")}
          className="h-9 w-full min-w-[160px] flex-1 text-sm sm:max-w-md"
        />
        <Select
          value={areaFilter || ALL}
          onValueChange={(v) => setAreaFilter(v === ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[140px] text-sm sm:w-[200px]">
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
          <SelectTrigger className="h-9 w-[140px] text-sm sm:w-[180px]">
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
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleDensity}
            aria-label={
              density === "compact"
                ? t("resources.density.toComfortable")
                : t("resources.density.toCompact")
            }
            title={
              density === "compact"
                ? t("resources.density.toComfortable")
                : t("resources.density.toCompact")
            }
          >
            {density === "compact" ? (
              <Rows2 className="size-4" aria-hidden />
            ) : (
              <Rows3 className="size-4" aria-hidden />
            )}
            <span className="hidden sm:inline">
              {density === "compact"
                ? t("resources.density.compact")
                : t("resources.density.comfortable")}
            </span>
          </Button>
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
          <table className="w-full border-collapse text-left font-sans text-sm">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sort = header.column.getIsSorted();
                    const isOpenCol = header.column.id === "open";
                    const isAreaCol = header.column.id === "area";
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          "sticky top-0 z-10 select-none bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                          headPad,
                          isAreaCol && "min-w-[180px]",
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
                          "align-middle font-sans text-sm",
                          cellPad,
                          cell.column.id === "area" && "min-w-[180px]",
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
        onArchive={archiveResource}
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

// Builds a `name -> colour` lookup from a Notion option list. A missing list
// (property absent / wrong type → empty array from the route) yields {}.
function toColorMap(options: SelectOption[] | undefined): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const o of options ?? []) map[o.name] = o.color;
  return map;
}

// Read-only Notion-style pill (light fill + matching text colour). A null colour
// (no lookup yet, or option missing) falls back to the muted default fill via the
// NOTION_COLOUR_* helpers. `whitespace-nowrap` keeps long labels on one line.
function ColorPill({ label, color }: { label: string; color: string | null }) {
  return (
    <span
      style={{ background: notionColourBg(color), color: notionColourText(color) }}
      className="inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium"
    >
      {label}
    </span>
  );
}

// Status rendered as a 6px colour dot + label, quieter than a full pill so the
// Status column stays calm. Solid dot colour via `notionColour()`.
function StatusDotLabel({ label, color }: { label: string; color: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-sans text-sm text-foreground">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: notionColour(color) }}
        aria-hidden
      />
      {label}
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
