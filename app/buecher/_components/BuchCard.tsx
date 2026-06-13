"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/constants/translations";
import { BUCHER_STATUSES, type BucherStatus } from "@/constants/buecher";
import { COVER_ASPECT_CLASS, COVER_FALLBACK_TONE, type Buch } from "./types";

// Static fallback icon — concrete lucide component (not created during render),
// so it satisfies react-hooks/static-components. Shared by the card and drawer.
export function CategoryIcon({ className }: { className?: string }) {
  return <BookOpen className={className} aria-hidden />;
}

// Cover image with a tinted BookOpen fallback. Plain <img> (no next/image, no
// domain config); onError swaps to the fallback without a layout shift because
// the wrapper owns the aspect ratio. Shared by the card and the drawer.
export function CoverImage({
  item,
  iconClassName,
  imgClassName,
}: {
  item: Buch;
  iconClassName?: string;
  imgClassName?: string;
}) {
  const t = useT();
  const [imgError, setImgError] = useState(false);
  const showFallback = !item.cover || imgError;

  if (showFallback) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          COVER_FALLBACK_TONE,
        )}
      >
        <CategoryIcon className={iconClassName} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional plain <img>: covers are external Google Books/OpenLibrary URLs, no next/image domain config wanted
    <img
      src={item.cover ?? ""}
      alt={t("buecher.cover.alt")}
      loading="lazy"
      onError={() => setImgError(true)}
      className={cn("h-full w-full object-cover", imgClassName)}
    />
  );
}

type Props = {
  item: Buch;
  // Open the shared drawer for this item.
  onOpen: (id: string) => void;
  // Optimistic status change, owned by BuecherView.changeStatus (revert + toast).
  onStatusChange: (id: string, next: BucherStatus) => void;
};

// A single book rendered as a cover card. Clicking the card (anywhere except the
// status control) opens the drawer; the status <Select> stops click propagation
// so editing it doesn't also open the drawer.
export function BuchCard({ item, onOpen, onStatusChange }: Props) {
  const t = useT();

  return (
    <div
      onClick={() => onOpen(item.id)}
      className="group flex h-full cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-colors hover:bg-muted/30"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-muted",
          COVER_ASPECT_CLASS,
        )}
      >
        <CoverImage
          item={item}
          iconClassName="size-10 opacity-70"
          imgClassName="transition-transform duration-200 group-hover:scale-[1.02]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-0.5">
        <p className="line-clamp-2 text-sm font-medium text-foreground" title={item.name}>
          {item.name}
        </p>
        {item.author ? (
          <p className="truncate text-xs text-muted-foreground" title={item.author}>
            {item.author}
          </p>
        ) : null}
        {item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-auto pt-0.5" onClick={(e) => e.stopPropagation()}>
          <Select
            value={(item.status as BucherStatus | null) ?? undefined}
            onValueChange={(v) => onStatusChange(item.id, v as BucherStatus)}
          >
            <SelectTrigger className="h-8 w-full text-xs">
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
        </div>
      </div>
    </div>
  );
}
