"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
import { ROUTES } from "@/constants/routes";
import type { TranslationKey } from "@/constants/translations";
import {
  BUCHER_SHELF_ORDER,
  BUCHER_STATUSES,
  BUCHER_TAGS,
  type BucherStatus,
} from "@/constants/buecher";
import { AddBuchDialog } from "./AddBuchDialog";
import { BuchCard } from "./BuchCard";
import { BuchDrawer } from "./BuchDrawer";
import { FILTER_ALL, TAG_ALL, todayLocalIso, type Buch } from "./types";

type Props = {
  items: Buch[];
  notConfigured?: boolean;
  error?: boolean;
};

type Shelves = Record<string, Buch[]>;

function emptyShelves(): Shelves {
  const s: Shelves = {};
  for (const st of BUCHER_STATUSES) s[st] = [];
  return s;
}

export function BuecherView({ items: initial, notConfigured, error }: Props) {
  const t = useT();
  const [items, setItems] = useState<Buch[]>(initial);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>(TAG_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Optimistic status change. Mirrors the server-side reading-date tracker: stamp
  // today on Startdatum when moving to "Aktuell" (only if empty), today on
  // Enddatum when moving to "Gelesen" (only if empty); moving to "Demnächst"
  // leaves both dates untouched. Revert on failure. Shared by cards + drawer.
  const changeStatus = async (id: string, next: BucherStatus) => {
    let snapshot: Buch[] = [];
    setItems((prev) => {
      snapshot = prev;
      const today = todayLocalIso();
      return prev.map((it) => {
        if (it.id !== id) return it;
        const patched = { ...it, status: next };
        if (next === "Aktuell" && !patched.startDate) patched.startDate = today;
        if (next === "Gelesen" && !patched.endDate) patched.endDate = today;
        return patched;
      });
    });
    try {
      const res = await fetch(ROUTES.api.buecher.item(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok !== true) throw new Error(json.error ?? "update_failed");
    } catch (err) {
      setItems(snapshot);
      toast.error(t("buecher.toast.updateError"));
      // eslint-disable-next-line no-console
      console.error("buecher_status_update_failed", err);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (tagFilter !== TAG_ALL && !it.tags.includes(tagFilter)) return false;
      if (statusFilter !== FILTER_ALL && it.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${it.name}\n${it.author ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, tagFilter, statusFilter]);

  // Bucket the filtered books into status shelves. A null/unknown status lands in
  // the "Demnächst" shelf so it stays visible.
  const shelves = useMemo(() => {
    const s = emptyShelves();
    for (const it of filtered) {
      const st =
        it.status && (BUCHER_STATUSES as readonly string[]).includes(it.status)
          ? it.status
          : "Demnächst";
      s[st].push(it);
    }
    return s;
  }, [filtered]);

  const hasAny = useMemo(
    () => BUCHER_STATUSES.some((s) => shelves[s].length > 0),
    [shelves],
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
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t("buecher.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("buecher.notConfigured")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">{t("buecher.title")}</h1>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("buecher.search")}
          className="h-9 w-full min-w-[160px] flex-1 text-sm sm:max-w-md"
        />
        <Select value={tagFilter} onValueChange={(v) => setTagFilter(v)}>
          <SelectTrigger className="h-9 w-[140px] text-sm sm:w-[180px]">
            <SelectValue placeholder={t("buecher.filter.allTags")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TAG_ALL}>{t("buecher.filter.allTags")}</SelectItem>
            {BUCHER_TAGS.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="h-9 w-[140px] text-sm sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>{t("buecher.filter.all")}</SelectItem>
            {BUCHER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`buecher.status.${s}` as TranslationKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("buecher.add.button")}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{t("buecher.error")}</p>
      ) : !hasAny ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("buecher.empty")}</p>
      ) : (
        <div className="space-y-8">
          {BUCHER_SHELF_ORDER.map((s) => {
            const shelfItems = shelves[s];
            if (shelfItems.length === 0) return null;
            return (
              <section key={s} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {t(`buecher.shelf.${s}` as TranslationKey)}
                  </h2>
                  <span className="text-sm text-muted-foreground">({shelfItems.length})</span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                  {shelfItems.map((it) => (
                    <BuchCard
                      key={it.id}
                      item={it}
                      onOpen={setSelectedId}
                      onStatusChange={changeStatus}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <BuchDrawer
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedId(null);
        }}
        onStatusChange={changeStatus}
      />

      <AddBuchDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(it) => setItems((prev) => [it, ...prev])}
      />
    </div>
  );
}
