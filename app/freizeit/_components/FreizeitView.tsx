"use client";

import { useMemo, useState } from "react";
import { Clapperboard, Gamepad2, Plus, type LucideIcon } from "lucide-react";
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
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import type { TranslationKey } from "@/constants/translations";
import {
  FREIZEIT_CATEGORIES,
  FREIZEIT_STATUSES,
  type FreizeitStatus,
} from "@/constants/freizeit";
import { AddFreizeitDialog } from "./AddFreizeitDialog";
import { FreizeitCard } from "./FreizeitCard";
import { FreizeitDrawer } from "./FreizeitDrawer";
import {
  FILTER_ACTIVE,
  FILTER_ALL,
  sectionForCategory,
  todayLocalIso,
  type FreizeitItem,
  type FreizeitSection,
} from "./types";

type Props = {
  items: FreizeitItem[];
  notConfigured?: boolean;
  error?: boolean;
};

const CAT_ALL = "__allcats";

// The active list = Offen + Läuft. Erledigt drops out unless explicitly filtered.
const ACTIVE_STATUSES: ReadonlySet<string> = new Set(["Offen", "Läuft"]);

// Two top-level sections. Grid column widths differ: portrait posters get
// narrower columns, landscape Steam headers wider ones. Static arbitrary
// Tailwind classes so JIT picks them up.
const SECTION_DEFS: {
  key: FreizeitSection;
  titleKey: TranslationKey;
  icon: LucideIcon;
  grid: string;
}[] = [
  {
    key: "filmSeries",
    titleKey: "freizeit.section.filmSeries",
    icon: Clapperboard,
    grid: "grid-cols-[repeat(auto-fill,minmax(120px,1fr))]",
  },
  {
    key: "games",
    titleKey: "freizeit.section.games",
    icon: Gamepad2,
    grid: "grid-cols-[repeat(auto-fill,minmax(220px,1fr))]",
  },
];

type Shelves = Record<string, FreizeitItem[]>;

function emptyShelves(): Shelves {
  const s: Shelves = {};
  for (const st of FREIZEIT_STATUSES) s[st] = [];
  return s;
}

export function FreizeitView({ items: initial, notConfigured, error }: Props) {
  const t = useT();
  const [items, setItems] = useState<FreizeitItem[]>(initial);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ACTIVE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Optimistic status change. Mirrors the server-side done-date tracker: set
  // doneDate to today when moving to "Erledigt", clear it otherwise. Revert on
  // failure. Shared by the cards and the drawer.
  const changeStatus = async (id: string, next: FreizeitStatus) => {
    // Capture the revert snapshot inside the functional updater so it reflects
    // the latest state.
    let snapshot: FreizeitItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.map((it) =>
        it.id === id
          ? { ...it, status: next, doneDate: next === "Erledigt" ? todayLocalIso() : null }
          : it,
      );
    });
    try {
      const res = await fetch(ROUTES.api.freizeit.item(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok !== true) throw new Error(json.error ?? "update_failed");
    } catch (err) {
      setItems(snapshot);
      toast.error(t("freizeit.toast.updateError"));
      // eslint-disable-next-line no-console
      console.error("freizeit_status_update_failed", err);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter && it.category !== categoryFilter) return false;
      if (statusFilter === FILTER_ACTIVE) {
        if (!it.status || !ACTIVE_STATUSES.has(it.status)) return false;
      } else if (statusFilter !== FILTER_ALL) {
        if (it.status !== statusFilter) return false;
      }
      if (!q) return true;
      const hay = `${it.name}\n${it.note ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, categoryFilter, statusFilter]);

  // Bucket the filtered items into section → status shelf. A null/unknown status
  // lands in the "Offen" shelf so it stays visible.
  const grouped = useMemo(() => {
    const sections: Record<FreizeitSection, Shelves> = {
      filmSeries: emptyShelves(),
      games: emptyShelves(),
    };
    for (const it of filtered) {
      const sec = sectionForCategory(it.category);
      const st =
        it.status && (FREIZEIT_STATUSES as readonly string[]).includes(it.status)
          ? it.status
          : "Offen";
      sections[sec][st].push(it);
    }
    return sections;
  }, [filtered]);

  const sectionsToRender = useMemo(
    () =>
      SECTION_DEFS.filter((def) =>
        FREIZEIT_STATUSES.some((s) => grouped[def.key][s].length > 0),
      ),
    [grouped],
  );

  // Drawer source is the full `items` list, NOT the filtered view, so the drawer
  // stays open if a status change / filter switch would otherwise hide the card.
  const selectedItem = useMemo(
    () => (selectedId ? items.find((it) => it.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  if (notConfigured) {
    return (
      <div className="mx-auto max-w-screen-xl px-6 py-10">
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t("freizeit.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("freizeit.notConfigured")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">{t("freizeit.title")}</h1>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("freizeit.search")}
          className="h-9 w-full min-w-[160px] flex-1 text-sm sm:max-w-md"
        />
        <Select
          value={categoryFilter || CAT_ALL}
          onValueChange={(v) => setCategoryFilter(v === CAT_ALL ? "" : v)}
        >
          <SelectTrigger className="h-9 w-[140px] text-sm sm:w-[180px]">
            <SelectValue placeholder={t("freizeit.filter.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CAT_ALL}>{t("freizeit.filter.allCategories")}</SelectItem>
            {FREIZEIT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`freizeit.category.${c}` as TranslationKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="h-9 w-[140px] text-sm sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ACTIVE}>{t("freizeit.filter.active")}</SelectItem>
            {FREIZEIT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`freizeit.status.${s}` as TranslationKey)}
              </SelectItem>
            ))}
            <SelectItem value={FILTER_ALL}>{t("freizeit.filter.all")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("freizeit.add.button")}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{t("freizeit.error")}</p>
      ) : sectionsToRender.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("freizeit.empty")}</p>
      ) : (
        <div className="space-y-10">
          {sectionsToRender.map((def) => {
            const shelves = grouped[def.key];
            const total = FREIZEIT_STATUSES.reduce((n, s) => n + shelves[s].length, 0);
            const SectionIcon = def.icon;
            return (
              <section key={def.key} className="space-y-5">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <SectionIcon className="size-5 text-muted-foreground" aria-hidden />
                  <h2 className="text-base font-semibold text-foreground">{t(def.titleKey)}</h2>
                  <span className="text-sm text-muted-foreground">({total})</span>
                </div>
                {FREIZEIT_STATUSES.map((s) => {
                  const shelfItems = shelves[s];
                  if (shelfItems.length === 0) return null;
                  return (
                    <div key={s} className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t(`freizeit.shelf.${s}` as TranslationKey)}
                        </h3>
                        <span className="text-xs text-muted-foreground/70">
                          ({shelfItems.length})
                        </span>
                      </div>
                      <div className={cn("grid gap-3", def.grid)}>
                        {shelfItems.map((it) => (
                          <FreizeitCard
                            key={it.id}
                            item={it}
                            onOpen={setSelectedId}
                            onStatusChange={changeStatus}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}

      <FreizeitDrawer
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedId(null);
        }}
        onStatusChange={changeStatus}
      />

      <AddFreizeitDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(it) => setItems((prev) => [it, ...prev])}
      />
    </div>
  );
}
