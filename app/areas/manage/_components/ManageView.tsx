"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import type { AreaSummary } from "@/lib/notion-areas";

const normalize = (name: string) => name.replace(/ \(v\d+\)$/, "").trim();

type Group = {
  base: string;
  live: AreaSummary | null;
  outdated: AreaSummary[];
  archived: AreaSummary[];
};

// Buckets a group's pages into live / outdated / archived.
// "live" = the most-recently-created non-archived page; the remaining
// non-archived pages are "outdated"; checkbox-archived pages are "archived".
function buildGroups(areas: AreaSummary[]): Group[] {
  const byBase = new Map<string, AreaSummary[]>();
  for (const a of areas) {
    const base = normalize(a.name);
    const list = byBase.get(base);
    if (list) list.push(a);
    else byBase.set(base, [a]);
  }

  const groups: Group[] = [];
  for (const [base, pages] of byBase) {
    const nonArchived = pages
      .filter((p) => !p.archived)
      .sort((x, y) => y.created.localeCompare(x.created));
    const archived = pages
      .filter((p) => p.archived)
      .sort((x, y) => y.created.localeCompare(x.created));
    const [live, ...outdated] = nonArchived;
    groups.push({ base, live: live ?? null, outdated, archived });
  }

  groups.sort((a, b) => a.base.localeCompare(b.base));
  return groups;
}

export function ManageView({ notConfigured }: { notConfigured?: boolean }) {
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;

  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(ROUTES.api.areas.manage, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "load_failed");
      setAreas(data.areas as AreaSummary[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (notConfigured) {
      setLoading(false);
      return;
    }
    void load();
  }, [notConfigured, load]);

  const groups = useMemo(() => buildGroups(areas), [areas]);
  const allOutdatedUrls = useMemo(
    () => groups.flatMap((g) => g.outdated.map((o) => o.url)),
    [groups],
  );

  const archive = useCallback(
    async (urls: string[]) => {
      if (urls.length === 0) {
        toast.message(tRef.current("areasManage.nothingToArchive"));
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(ROUTES.api.areas.archive, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(urls.length === 1 ? { url: urls[0] } : { urls }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok || (data.failed?.length ?? 0) > 0) {
          throw new Error("archive_failed");
        }
        toast.success(tRef.current("areasManage.archiveSuccess"));
        await load();
      } catch {
        toast.error(tRef.current("areasManage.archiveError"));
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  if (notConfigured) {
    return (
      <div className="mx-auto max-w-screen-lg px-6 py-10">
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t("areasManage.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("areas.error")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-lg px-6 py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={ROUTES.pages.areas}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("areasManage.back")}
            </Link>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-foreground">{t("areasManage.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("areasManage.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading || busy}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {t("areasManage.refresh")}
          </Button>
          <Button
            size="sm"
            onClick={() => void archive(allOutdatedUrls)}
            disabled={busy || loading || allOutdatedUrls.length === 0}
          >
            {t("areasManage.archiveAllOutdated")}
          </Button>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("areasManage.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive">{t("areasManage.error")}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("areasManage.empty")}</p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.base} className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-base font-semibold text-foreground">{g.base}</h2>
              <ul className="space-y-2">
                {g.live && <Row area={g.live} kind="live" />}
                {g.outdated.map((o) => (
                  <Row key={o.id} area={o} kind="outdated" onArchive={() => void archive([o.url])} busy={busy} />
                ))}
                {g.archived.map((a) => (
                  <Row key={a.id} area={a} kind="archived" />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  area,
  kind,
  onArchive,
  busy,
}: {
  area: AreaSummary;
  kind: "live" | "outdated" | "archived";
  onArchive?: () => void;
  busy?: boolean;
}) {
  const t = useT();
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
        kind === "archived"
          ? "border-border bg-muted/40 opacity-60"
          : "border-border bg-background"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Pill kind={kind} label={t(`areasManage.badge.${kind}`)} />
        <span
          className={`truncate text-sm ${
            kind === "archived" ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {area.name}
        </span>
        {area.status && (
          <span className="shrink-0 text-xs text-muted-foreground">· {area.status}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={area.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          title={t("areasManage.openInNotion")}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {kind === "outdated" && onArchive && (
          <Button variant="outline" size="sm" onClick={onArchive} disabled={busy}>
            {t("areasManage.archive")}
          </Button>
        )}
      </div>
    </li>
  );
}

function Pill({ kind, label }: { kind: "live" | "outdated" | "archived"; label: string }) {
  const tone =
    kind === "live"
      ? "bg-primary/15 text-primary"
      : kind === "outdated"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
  );
}
