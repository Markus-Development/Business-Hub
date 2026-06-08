"use client";

import { useState } from "react";
import { Clapperboard, Gamepad2, Tv } from "lucide-react";
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
import { FREIZEIT_STATUSES, type FreizeitStatus } from "@/constants/freizeit";
import {
  categoryFallbackTone,
  coverAspectClass,
  type FreizeitItem,
} from "./types";

// Static category icon — returns concrete lucide components (not created during
// render), so it satisfies react-hooks/static-components. Shared by the card and
// the drawer cover.
export function CategoryIcon({
  category,
  className,
}: {
  category: string | null;
  className?: string;
}) {
  switch (category) {
    case "Videospiel":
      return <Gamepad2 className={className} aria-hidden />;
    case "Serie":
      return <Tv className={className} aria-hidden />;
    default:
      return <Clapperboard className={className} aria-hidden />; // Film + unknown
  }
}

// Cover image with a category-tinted icon fallback. Plain <img> (no next/image,
// no domain config); onError swaps to the fallback without a layout shift because
// the wrapper owns the aspect ratio. Shared by the card and the drawer.
export function CoverImage({
  item,
  iconClassName,
  imgClassName,
}: {
  item: FreizeitItem;
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
          categoryFallbackTone(item.category),
        )}
      >
        <CategoryIcon category={item.category} className={iconClassName} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- intentional plain <img>: covers are external Steam/TMDB URLs, no next/image domain config wanted
    <img
      src={item.cover ?? ""}
      alt={t("freizeit.cover.alt")}
      loading="lazy"
      onError={() => setImgError(true)}
      className={cn("h-full w-full object-cover", imgClassName)}
    />
  );
}

type Props = {
  item: FreizeitItem;
  // Open the shared drawer for this item.
  onOpen: (id: string) => void;
  // Optimistic status change, owned by FreizeitView.changeStatus (revert + toast).
  onStatusChange: (id: string, next: FreizeitStatus) => void;
};

// A single leisure item rendered as a cover card. Clicking the card (anywhere
// except the status control) opens the drawer; the status <Select> stops click
// propagation so editing it doesn't also open the drawer.
export function FreizeitCard({ item, onOpen, onStatusChange }: Props) {
  const t = useT();

  return (
    <div
      onClick={() => onOpen(item.id)}
      className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-colors hover:bg-muted/30"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-muted",
          coverAspectClass(item.category),
        )}
      >
        <CoverImage
          item={item}
          iconClassName="size-10 opacity-70"
          imgClassName="transition-transform duration-200 group-hover:scale-[1.02]"
        />
      </div>

      <div className="flex flex-col gap-1.5 px-0.5">
        <p className="truncate text-sm font-medium text-foreground" title={item.name}>
          {item.name}
        </p>
        {item.note ? (
          <p className="truncate text-xs text-muted-foreground" title={item.note}>
            {item.note}
          </p>
        ) : null}
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            value={(item.status as FreizeitStatus | null) ?? undefined}
            onValueChange={(v) => onStatusChange(item.id, v as FreizeitStatus)}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder={t("freizeit.field.status")} />
            </SelectTrigger>
            <SelectContent>
              {FREIZEIT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`freizeit.status.${s}` as TranslationKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
