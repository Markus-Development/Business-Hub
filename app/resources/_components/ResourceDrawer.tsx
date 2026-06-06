"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Archive,
  BookOpen,
  CalendarDays,
  CircleDashed,
  ExternalLink,
  Gauge,
  LayoutGrid,
  Link as LinkIcon,
  Tag,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DEFAULT_REASON_RESOURCE,
  REASONS_ARCHIVED,
  type ReasonArchived,
} from "@/constants/archive";
import type { NotionBlock, NotionResource } from "@/lib/notion";

type Props = {
  resource: NotionResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Fire-and-forget: the parent owns the optimistic removal, the POST, the
  // toasts, and the revert-on-failure (see ResourcesView.archiveResource).
  onArchive: (resource: NotionResource, reason: ReasonArchived) => void;
};

type BlockEntry = { loading: boolean; blocks: NotionBlock[] | null };

export function ResourceDrawer({ resource, open, onOpenChange, onArchive }: Props) {
  const t = useT();
  const [locale] = useLocale();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [reason, setReason] = useState<ReasonArchived>(DEFAULT_REASON_RESOURCE);

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
          <SheetTitle className="sr-only">{resource?.name ?? t("resources.title")}</SheetTitle>
          {resource ? (
            <h2 className="truncate text-lg font-semibold text-foreground">{resource.name}</h2>
          ) : null}
        </SheetHeader>

        {resource ? (
          <div className="flex-1 overflow-y-auto">
            <section className="space-y-0.5 border-b border-border px-5 py-3">
              <MetaRow icon={<LayoutGrid className="size-3.5" />} label={t("resources.field.area")}>
                <ReadValue value={resource.area} />
              </MetaRow>
              <MetaRow icon={<BookOpen className="size-3.5" />} label={t("resources.field.type")}>
                <ReadValue value={resource.type} />
              </MetaRow>
              <MetaRow icon={<CircleDashed className="size-3.5" />} label={t("resources.field.status")}>
                <ReadValue value={resource.status} />
              </MetaRow>
              <MetaRow icon={<Gauge className="size-3.5" />} label={t("resources.field.confidence")}>
                <ReadValue value={resource.confidence} />
              </MetaRow>
              <MetaRow icon={<Tag className="size-3.5" />} label={t("resources.field.tags")}>
                <ReadValue value={resource.tags.length > 0 ? resource.tags.join(", ") : null} />
              </MetaRow>
              <MetaRow icon={<LinkIcon className="size-3.5" />} label={t("resources.field.source")}>
                {resource.source ? (
                  <a
                    href={resource.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <LinkIcon size={12} aria-hidden />
                    <span className="truncate">{safeHostname(resource.source) ?? resource.source}</span>
                  </a>
                ) : (
                  <Dash />
                )}
              </MetaRow>
              <MetaRow icon={<CalendarDays className="size-3.5" />} label={t("resources.field.lastReviewed")}>
                {resource.lastReviewed ? (
                  <span className="text-sm font-mono text-muted-foreground">
                    {safeFormat(dateLong, resource.lastReviewed)}
                  </span>
                ) : (
                  <Dash />
                )}
              </MetaRow>
              <MetaRow icon={<CalendarDays className="size-3.5" />} label={t("resources.field.created")}>
                {resource.created ? (
                  <span className="text-sm font-mono text-muted-foreground">
                    {safeFormat(dateLong, resource.created)}
                  </span>
                ) : (
                  <Dash />
                )}
              </MetaRow>
            </section>

            <section className="px-5 py-4">
              <PageBody resourceId={resource.id} />
            </section>
          </div>
        ) : null}

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border px-5 py-3 sm:justify-between">
          {resource ? (
            <a
              href={resource.notionUrl}
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
          <div className="flex items-center gap-2">
            {resource ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setReason(DEFAULT_REASON_RESOURCE);
                  setArchiveOpen(true);
                }}
              >
                <Archive className="size-3.5" aria-hidden />
                {t("resources.archive.button")}
              </Button>
            ) : null}
            <SheetClose asChild>
              <Button variant="outline" size="sm">
                {t("projects.drawer.close")}
              </Button>
            </SheetClose>
          </div>
        </SheetFooter>

        {resource ? (
          <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("resources.archive.title")}</DialogTitle>
                <DialogDescription>{t("resources.archive.body")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("resources.archive.reasonLabel")}
                </label>
                <Select value={reason} onValueChange={(v) => setReason(v as ReasonArchived)}>
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS_ARCHIVED.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setArchiveOpen(false)}>
                  {t("resources.archive.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setArchiveOpen(false);
                    onArchive(resource, reason);
                  }}
                >
                  <Archive className="size-3.5" aria-hidden />
                  {t("resources.archive.confirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </SheetContent>
    </Sheet>
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

// Lazy-fetch page body. Loop-safe pattern from CLAUDE.md / AreaDrawer:
// dep array contains a primitive id, guard short-circuits on the presence of
// any entry for that id (including the in-flight "loading: true" placeholder),
// not on loaded data — so the effect doesn't re-fire mid-fetch.
function PageBody({ resourceId }: { resourceId: string }) {
  const t = useT();
  const [cache, setCache] = useState<Record<string, BlockEntry>>({});

  useEffect(() => {
    if (!resourceId) return;
    if (cache[resourceId]) return;
    let cancelled = false;
    setCache((prev) => ({ ...prev, [resourceId]: { loading: true, blocks: null } }));
    fetch(ROUTES.api.resources.blocks(resourceId))
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.ok) throw new Error(j?.error || "failed");
        setCache((prev) => ({
          ...prev,
          [resourceId]: { loading: false, blocks: Array.isArray(j.blocks) ? j.blocks : [] },
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setCache((prev) => ({
          ...prev,
          [resourceId]: { loading: false, blocks: [] },
        }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId]);

  const entry = cache[resourceId];

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
    return <p className="text-sm italic text-muted-foreground">{t("blocks.empty")}</p>;
  }

  return <PageBodyRenderer blocks={entry.blocks} />;
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
