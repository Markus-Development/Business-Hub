"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Link as LinkIcon,
  StickyNote,
  Tag,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PageBodyRenderer } from "@/app/projects/_components/PageBodyRenderer";
import { useLocale, useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/constants/translations";
import { BUCHER_STATUSES, type BucherStatus } from "@/constants/buecher";
import type { NotionBlock } from "@/lib/notion";
import { CoverImage } from "./BuchCard";
import { COVER_ASPECT_CLASS, safeFormat, safeHostname, type Buch } from "./types";

type Props = {
  item: Buch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Shared with the card — optimistic status change + reading-date tracking is
  // owned by the parent (BuecherView.changeStatus).
  onStatusChange: (id: string, next: BucherStatus) => void;
};

type BlockEntry = { loading: boolean; blocks: NotionBlock[] | null };

export function BuchDrawer({ item, open, onOpenChange, onStatusChange }: Props) {
  const t = useT();
  const [locale] = useLocale();

  const dateLong = useMemo(
    () => new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", { dateStyle: "medium" }),
    [locale],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[min(90vw,1400px)] flex-col gap-0 p-0 sm:max-w-[min(90vw,1400px)]"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="sr-only">{item?.name ?? t("buecher.title")}</SheetTitle>
          {item ? (
            <h2 className="truncate text-lg font-semibold text-foreground">{item.name}</h2>
          ) : null}
        </SheetHeader>

        {item ? (
          <div className="flex-1 overflow-y-auto">
            <DrawerCover item={item} />
            <section className="space-y-0.5 border-b border-border px-5 py-3">
              <MetaRow icon={<User className="size-3.5" />} label={t("buecher.field.author")}>
                <ReadValue value={item.author} />
              </MetaRow>
              <MetaRow icon={<CheckCircle2 className="size-3.5" />} label={t("buecher.field.status")}>
                <Select
                  value={(item.status as BucherStatus | null) ?? undefined}
                  onValueChange={(v) => onStatusChange(item.id, v as BucherStatus)}
                >
                  <SelectTrigger className="h-8 w-[160px] text-sm">
                    <SelectValue placeholder={t("buecher.field.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BUCHER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`buecher.status.${s}` as TranslationKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </MetaRow>
              <MetaRow icon={<CalendarDays className="size-3.5" />} label={t("buecher.field.startDate")}>
                {item.startDate ? (
                  <span className="font-mono text-sm text-muted-foreground">
                    {safeFormat(dateLong, item.startDate)}
                  </span>
                ) : (
                  <Dash />
                )}
              </MetaRow>
              <MetaRow icon={<CalendarDays className="size-3.5" />} label={t("buecher.field.endDate")}>
                {item.endDate ? (
                  <span className="font-mono text-sm text-muted-foreground">
                    {safeFormat(dateLong, item.endDate)}
                  </span>
                ) : (
                  <Dash />
                )}
              </MetaRow>
              <MetaRow icon={<Tag className="size-3.5" />} label={t("buecher.field.tags")}>
                {item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <Dash />
                )}
              </MetaRow>
              <MetaRow icon={<LinkIcon className="size-3.5" />} label={t("buecher.field.link")}>
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <LinkIcon size={12} aria-hidden />
                    <span className="truncate">{safeHostname(item.link) ?? item.link}</span>
                  </a>
                ) : (
                  <Dash />
                )}
              </MetaRow>
              <MetaRow icon={<StickyNote className="size-3.5" />} label={t("buecher.field.note")}>
                <ReadValue value={item.note} />
              </MetaRow>
              <MetaRow icon={<CalendarDays className="size-3.5" />} label={t("buecher.field.created")}>
                {item.createdTime ? (
                  <span className="font-mono text-sm text-muted-foreground">
                    {safeFormat(dateLong, item.createdTime)}
                  </span>
                ) : (
                  <Dash />
                )}
              </MetaRow>
            </section>

            <section className="px-5 py-4">
              <PageBody buchId={item.id} notionUrl={item.notionUrl} />
            </section>
          </div>
        ) : null}

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border px-5 py-3 sm:justify-between">
          {item ? (
            <a
              href={item.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              {t("projects.drawer.openInNotion")}
            </a>
          ) : (
            <span />
          )}
          <SheetClose asChild>
            <Button variant="outline" size="sm">
              {t("projects.drawer.close")}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Cover at the top of the drawer — reuses the shared CoverImage (plain <img> +
// onError icon fallback). Always portrait; the fallback keeps the aspect ratio
// so there's no layout shift on a missing/broken cover.
function DrawerCover({ item }: { item: Buch }) {
  return (
    <div className="border-b border-border px-5 py-4">
      <div
        className={cn(
          "overflow-hidden rounded-lg bg-muted w-[200px]",
          COVER_ASPECT_CLASS,
        )}
      >
        <CoverImage item={item} iconClassName="size-12 opacity-70" />
      </div>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-1 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Dash() {
  return <span className="text-sm italic text-muted-foreground/70">—</span>;
}

function ReadValue({ value }: { value: string | null }) {
  if (!value) return <Dash />;
  return <span className="text-sm text-foreground">{value}</span>;
}

// Lazy-fetch page body. Loop-safe pattern from CLAUDE.md / ResourceDrawer: dep
// array holds the primitive id only, the guard short-circuits on the presence of
// ANY entry for that id (including the in-flight loading placeholder), not on
// loaded data — so the effect never re-fires mid-fetch.
function PageBody({ buchId, notionUrl }: { buchId: string; notionUrl: string }) {
  const t = useT();
  const [cache, setCache] = useState<Record<string, BlockEntry>>({});

  useEffect(() => {
    if (!buchId) return;
    if (cache[buchId]) return;
    let cancelled = false;
    setCache((prev) => ({ ...prev, [buchId]: { loading: true, blocks: null } }));
    fetch(ROUTES.api.buecher.blocks(buchId))
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.ok) throw new Error(j?.error || "failed");
        setCache((prev) => ({
          ...prev,
          [buchId]: { loading: false, blocks: Array.isArray(j.blocks) ? j.blocks : [] },
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setCache((prev) => ({
          ...prev,
          [buchId]: { loading: false, blocks: [] },
        }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buchId]);

  const entry = cache[buchId];

  if (!entry || entry.loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-3 w-3/4 rounded bg-muted/60" />
        <div className="h-3 w-5/6 rounded bg-muted/60" />
        <div className="h-3 w-2/3 rounded bg-muted/60" />
      </div>
    );
  }

  if (!entry.blocks || entry.blocks.length === 0) {
    return (
      <a
        href={notionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ExternalLink className="size-3.5" aria-hidden />
        {t("projects.drawer.openInNotion")}
      </a>
    );
  }

  return <PageBodyRenderer blocks={entry.blocks} />;
}
