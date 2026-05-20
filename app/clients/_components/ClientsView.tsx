"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocale, useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import { ClientList } from "./ClientList";
import { ClientDetail } from "./ClientDetail";
import {
  formatEur,
  type ClientDetail as ClientDetailPayload,
  type MergedClient,
  type SortKey,
} from "./types";

type DetailCacheEntry = {
  detail: ClientDetailPayload | null;
  loading: boolean;
  hasOverdue: boolean | undefined;
  doneTaskCount: number | undefined;
};

export function ClientsView() {
  const t = useT();
  const [locale] = useLocale();
  const [clients, setClients] = useState<MergedClient[] | null>(null);
  const [selectedZohoId, setSelectedZohoId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("overdue");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailCacheEntry>>({});

  // tRef keeps the latest translator without retriggering mount-only effects on locale toggle.
  const tRef = useRef(t);
  tRef.current = t;

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(ROUTES.api.clients.list, { cache: "no-store" });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const body = (await res.json()) as { clients: MergedClient[] };
        if (cancelled) return;
        setClients(body.clients);
        if (body.clients.length > 0) {
          setSelectedZohoId((prev) => prev ?? body.clients[0].zohoContactId);
        }
      } catch (err) {
        if (cancelled) return;
        toast.error(tRef.current("clients.errorLoad"));
        // eslint-disable-next-line no-console
        console.error("clients_load_failed", err);
        setClients([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDetail = useCallback(async (zohoId: string) => {
    setDetails((prev) => ({
      ...prev,
      [zohoId]: prev[zohoId]
        ? { ...prev[zohoId], loading: true }
        : { detail: null, loading: true, hasOverdue: undefined, doneTaskCount: undefined },
    }));
    try {
      const res = await fetch(ROUTES.api.clients.detail(zohoId), { cache: "no-store" });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const body = (await res.json()) as ClientDetailPayload;
      const hasOverdue = body.invoices.some((i) => i.status === "overdue");
      const doneTaskCount = body.monthlyTasks.filter((p) => p.status === "Done").length;
      setDetails((prev) => ({
        ...prev,
        [zohoId]: { detail: body, loading: false, hasOverdue, doneTaskCount },
      }));
    } catch (err) {
      toast.error(tRef.current("clients.errorLoadDetail"));
      // eslint-disable-next-line no-console
      console.error("clients_detail_load_failed", err);
      setDetails((prev) => ({
        ...prev,
        [zohoId]: {
          detail: null,
          loading: false,
          hasOverdue: undefined,
          doneTaskCount: undefined,
        },
      }));
    }
  }, []);

  // Fetch detail for the selected client when selection changes.
  // Depend only on the primitive id — `details` must NOT be in the deps because
  // loadDetail mutates it (sets loading:true first), which would re-fire the
  // effect mid-fetch and produce an infinite GET loop.
  useEffect(() => {
    if (!selectedZohoId) return;
    if (details[selectedZohoId]) return; // already loaded or loading
    void loadDetail(selectedZohoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZohoId]);

  // Re-fetch helper called by sub-components after writes.
  const refreshSelectedDetail = useCallback(async () => {
    if (selectedZohoId) await loadDetail(selectedZohoId);
  }, [selectedZohoId, loadDetail]);

  // Patch the in-memory client (no refetch) — used after metadata edits so the
  // list row updates immediately without a full /api/clients round-trip.
  const patchClientInPlace = useCallback(
    (zohoId: string, patch: Partial<MergedClient>) => {
      setClients((prev) =>
        prev
          ? prev.map((c) => (c.zohoContactId === zohoId ? { ...c, ...patch } : c))
          : prev,
      );
    },
    [],
  );

  // Unique non-null Status values across the loaded clients, sorted A–Z.
  // Derived from data (not a hardcoded constant) so newly-added Notion options
  // surface here without a code change.
  const statusOptions = useMemo(() => {
    if (!clients) return [] as string[];
    const set = new Set<string>();
    for (const c of clients) {
      if (c.clientStatus) set.add(c.clientStatus);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [clients]);

  const sortedClients = useMemo(() => {
    if (!clients) return null;
    const filtered = statusFilter
      ? clients.filter((c) => c.clientStatus === statusFilter)
      : clients;
    const copy = [...filtered];
    if (sort === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "outstanding") {
      copy.sort((a, b) => b.outstandingAmount - a.outstandingAmount);
    } else {
      // overdue first, then outstanding, then name
      copy.sort((a, b) => {
        const aOver = details[a.zohoContactId]?.hasOverdue ? 1 : 0;
        const bOver = details[b.zohoContactId]?.hasOverdue ? 1 : 0;
        if (aOver !== bOver) return bOver - aOver;
        if (a.outstandingAmount !== b.outstandingAmount) {
          return b.outstandingAmount - a.outstandingAmount;
        }
        return a.name.localeCompare(b.name);
      });
    }
    return copy;
  }, [clients, sort, statusFilter, details]);

  const summary = useMemo(() => {
    if (!clients) return { total: 0, outstanding: 0, overdue: 0 };
    let outstanding = 0;
    let overdue = 0;
    for (const c of clients) {
      outstanding += c.outstandingAmount;
      // Detail-aware overdue total: only counts when we've already loaded the
      // detail for that client and observed an overdue invoice. Clients without
      // a loaded detail contribute 0 — better to under-state than to invent.
      if (details[c.zohoContactId]?.hasOverdue) {
        // Sum the balances of overdue invoices for that client.
        const det = details[c.zohoContactId]?.detail;
        if (det) {
          for (const inv of det.invoices) {
            if (inv.status === "overdue") overdue += inv.balance;
          }
        }
      }
    }
    return { total: clients.length, outstanding, overdue };
  }, [clients, details]);

  const selectedDetailEntry = selectedZohoId ? details[selectedZohoId] : undefined;
  const selectedClient = selectedZohoId
    ? clients?.find((c) => c.zohoContactId === selectedZohoId) ?? null
    : null;

  return (
    <div className="mx-auto min-w-[1240px] max-w-screen-2xl px-6 py-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">{t("clients.title")}</h1>
      </header>

      {/* Summary bar */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <SummaryStat label={t("clients.summary.total")} value={String(summary.total)} />
        <SummaryStat
          label={t("clients.summary.outstanding")}
          value={formatEur(summary.outstanding, locale)}
        />
        <SummaryStat
          label={t("clients.summary.overdue")}
          value={formatEur(summary.overdue, locale)}
          tone={summary.overdue > 0 ? "danger" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-4">
        <ClientList
          clients={sortedClients}
          selectedZohoId={selectedZohoId}
          onSelect={setSelectedZohoId}
          sort={sort}
          onSortChange={setSort}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusOptions={statusOptions}
          details={details}
        />
        <ClientDetail
          client={selectedClient}
          detail={selectedDetailEntry?.detail ?? null}
          loading={selectedDetailEntry?.loading ?? false}
          onRefresh={refreshSelectedDetail}
          onPatchClient={patchClientInPlace}
        />
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          tone === "danger"
            ? "mt-1 font-mono text-2xl font-semibold text-destructive"
            : "mt-1 font-mono text-2xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
