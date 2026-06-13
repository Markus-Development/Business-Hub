"use client";

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ErfolgStatus } from "@/constants/journal";
import type { Erfolg } from "@/lib/journal";

// Status → dot tint. Read-only presentation only (Erfolg status is owned by
// Notion). Keyed by the ERFOLG_STATUSES union so a Notion-side option rename
// breaks the build here instead of silently dropping the colour. Unknown /
// null statuses fall back to the muted dot.
const STATUS_TONE: Record<ErfolgStatus, string> = {
  Done: "bg-emerald-500",
  "In progress": "bg-amber-500",
  "Not started": "bg-muted-foreground/40",
};

type Props = {
  win: Erfolg;
  // When set, shows a small week label under the title (used by the timeline).
  weekLabel?: string;
};

// One win card: name + optional Area tag + status. The whole card links out to
// the Notion page (editing happens in Notion — this tab is read-only).
export function ErfolgCard({ win, weekLabel }: Props) {
  const t = useT();
  const tone =
    (win.status && STATUS_TONE[win.status as ErfolgStatus]) || "bg-muted-foreground/40";

  const body = (
    <div className="flex items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:bg-muted">
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", tone)} title={win.status ?? ""} aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium text-foreground">{win.name}</p>
        {weekLabel && <p className="font-mono text-[11px] text-muted-foreground">{weekLabel}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {win.area ?? t("journal.card.noArea")}
          </span>
          {win.status && (
            <span className="text-[11px] text-muted-foreground">{win.status}</span>
          )}
        </div>
      </div>
    </div>
  );

  if (!win.url) return body;
  return (
    <a href={win.url} target="_blank" rel="noopener noreferrer" className="block">
      {body}
    </a>
  );
}
