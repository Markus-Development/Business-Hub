"use client";

import { useCallback, useMemo, useState } from "react";
import { ExternalLink, Pencil } from "lucide-react";
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
import { ROUTES } from "@/constants/routes";
import { PageBodyRenderer } from "@/app/projects/_components/PageBodyRenderer";
import { InvoiceList } from "./InvoiceList";
import { MonthlyTaskChecklist } from "./MonthlyTaskChecklist";
import { WhatsAppTemplates } from "./WhatsAppTemplates";
import {
  formatEur,
  INDUSTRIES,
  type ClientDetail as ClientDetailPayload,
  type MergedClient,
} from "./types";

type ClientDetailProps = {
  client: MergedClient | null;
  detail: ClientDetailPayload | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onPatchClient: (zohoId: string, patch: Partial<MergedClient>) => void;
};

export function ClientDetail({
  client,
  detail,
  loading,
  onRefresh,
  onPatchClient,
}: ClientDetailProps) {
  const t = useT();
  const [locale] = useLocale();

  const overdueTotal = useMemo(() => {
    if (!detail) return 0;
    return detail.invoices
      .filter((i) => i.status === "overdue")
      .reduce((sum, i) => sum + i.balance, 0);
  }, [detail]);

  if (!client) {
    return (
      <section className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground shadow-sm">
        {t("clients.empty")}
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold text-foreground">{client.name}</h2>
          {client.person ? (
            <p className="mt-1 text-sm text-foreground">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("clients.person")}:
              </span>{" "}
              {client.person}
            </p>
          ) : null}
          {client.email ? (
            <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          {client.dashboardLink ? (
            <Button variant="outline" size="sm" asChild>
              <a href={client.dashboardLink} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                <span className="ml-1.5">{t("clients.detail.openDashboard")}</span>
              </a>
            </Button>
          ) : null}
          {client.notionUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={client.notionUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                <span className="ml-1.5">{t("clients.detail.openNotion")}</span>
              </a>
            </Button>
          ) : null}
        </div>
      </header>

      {/* Financial summary */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t("clients.financial.title")}
        </h3>
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Stat
            label={t("clients.financial.lifetime")}
            value={
              detail ? formatEur(detail.lifetimeTurnover, locale) : t("clients.loading")
            }
          />
          <Stat
            label={t("clients.financial.outstanding")}
            value={formatEur(client.outstandingAmount, locale)}
          />
          <Stat
            label={t("clients.financial.overdue")}
            value={formatEur(overdueTotal, locale)}
            tone={overdueTotal > 0 ? "danger" : "neutral"}
          />
        </div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("clients.invoices.title")}
        </h4>
        {loading && !detail ? (
          <p className="text-sm text-muted-foreground">{t("clients.loading")}</p>
        ) : (
          <InvoiceList invoices={detail?.invoices ?? []} />
        )}
      </section>

      {/* Monthly tasks */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t("clients.tasks.title")}
        </h3>
        <MonthlyTaskChecklist
          zohoId={client.zohoContactId}
          clientName={client.name}
          tasks={detail?.monthlyTasks ?? []}
          onRefresh={onRefresh}
        />
      </section>

      {/* WhatsApp templates */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t("clients.whatsapp.title")}
        </h3>
        <WhatsAppTemplates
          clientName={client.name}
          phone={client.phone}
          outstandingAmount={client.outstandingAmount}
          invoices={detail?.invoices ?? []}
        />
      </section>

      {/* Metadata */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t("clients.metadata.title")}
        </h3>
        {client.notionPageId ? (
          <MetadataGrid
            client={client}
            onPatchClient={onPatchClient}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t("clients.detail.notLinked")}</p>
        )}
      </section>

      {/* Notes */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {t("clients.notes.title")}
        </h3>
        {client.notionPageId ? (
          <>
            {loading && !detail ? (
              <p className="text-sm text-muted-foreground">{t("clients.loading")}</p>
            ) : (
              <PageBodyRenderer blocks={detail?.notionBlocks ?? []} />
            )}
            {client.notionUrl ? (
              <a
                href={client.notionUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
              >
                {t("clients.notes.editInNotion")} →
              </a>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("clients.detail.notLinked")}</p>
        )}
      </section>
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          tone === "danger"
            ? "mt-1 font-mono text-lg font-semibold text-destructive"
            : "mt-1 font-mono text-lg font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

// ----- Metadata grid -------------------------------------------------------

function MetadataGrid({
  client,
  onPatchClient,
}: {
  client: MergedClient;
  onPatchClient: (zohoId: string, patch: Partial<MergedClient>) => void;
}) {
  const t = useT();
  const [locale] = useLocale();

  const patchField = useCallback(
    async (field: string, value: unknown, optimistic: Partial<MergedClient>) => {
      const snapshot = { ...client };
      onPatchClient(client.zohoContactId, optimistic);
      try {
        const res = await fetch(ROUTES.api.clients.notionPatch(client.zohoContactId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, value }),
        });
        if (!res.ok) throw new Error(`http_${res.status}`);
        toast.success(t("clients.metadata.saved"));
      } catch (err) {
        onPatchClient(client.zohoContactId, snapshot);
        toast.error(t("clients.metadata.errorSave"));
        // eslint-disable-next-line no-console
        console.error("clients_metadata_save_failed", err);
      }
    },
    [client, onPatchClient, t],
  );

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border bg-background px-5 py-4">
      <IndustryField client={client} onSave={(v) => patchField("Industry", v, { industry: v })} />
      <NumberField
        label={t("clients.metadata.employees")}
        value={client.employees}
        onSave={(v) => patchField("Employees", v, { employees: v })}
        placeholder=""
      />
      <NumberField
        label={t("clients.metadata.monthlyRevenue")}
        value={client.monthlyRevenue}
        onSave={(v) => patchField("Monthly Revenue", v, { monthlyRevenue: v })}
        placeholder=""
        formatter={(n) => formatEur(n, locale)}
      />
      <ReadOnlyField
        label={t("clients.monthlyFee")}
        value={client.monthlyFee === null ? null : formatEur(client.monthlyFee, locale)}
      />
      <UrlField
        label={t("clients.metadata.callNotesLink")}
        value={client.callNotesLink}
        onSave={(v) => patchField("Call Notes Link", v, { callNotesLink: v })}
      />
      <UrlField
        label={t("clients.metadata.clientDatabaseLink")}
        value={client.clientDatabaseLink}
        onSave={(v) => patchField("Client Database Link", v, { clientDatabaseLink: v })}
      />
      <UrlField
        label={t("clients.metadata.dashboardLink")}
        value={client.dashboardLink}
        onSave={(v) => patchField("Dashboard Link", v, { dashboardLink: v })}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  const t = useT();
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <p className="mt-1 text-sm text-foreground">{value ?? t("clients.metadata.empty")}</p>
    </div>
  );
}

function FieldShell({
  label,
  children,
  onEdit,
  editing,
}: {
  label: string;
  children: React.ReactNode;
  onEdit: () => void;
  editing: boolean;
}) {
  const t = useT();
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        {!editing ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("clients.metadata.edit")}
          >
            <Pencil className="size-3" />
          </button>
        ) : null}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function IndustryField({
  client,
  onSave,
}: {
  client: MergedClient;
  onSave: (value: string | null) => Promise<void>;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(client.industry);

  const commit = async () => {
    if (draft === client.industry) {
      setEditing(false);
      return;
    }
    await onSave(draft);
    setEditing(false);
  };

  if (!editing) {
    return (
      <FieldShell
        label={t("clients.metadata.industry")}
        editing={false}
        onEdit={() => {
          setDraft(client.industry);
          setEditing(true);
        }}
      >
        <p className="text-sm text-foreground">{client.industry ?? t("clients.metadata.empty")}</p>
      </FieldShell>
    );
  }

  return (
    <FieldShell label={t("clients.metadata.industry")} editing onEdit={() => {}}>
      <div className="flex items-center gap-1">
        <Select value={draft ?? ""} onValueChange={(v) => setDraft(v || null)}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder={t("clients.metadata.industryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={commit}>
          {t("clients.metadata.save")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(client.industry);
            setEditing(false);
          }}
        >
          {t("clients.metadata.cancel")}
        </Button>
      </div>
    </FieldShell>
  );
}

function NumberField({
  label,
  value,
  onSave,
  placeholder,
  formatter,
}: {
  label: string;
  value: number | null;
  onSave: (value: number | null) => Promise<void>;
  placeholder: string;
  formatter?: (n: number) => string;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value === null ? "" : String(value));

  const commit = async () => {
    const trimmed = draft.trim();
    const parsed: number | null = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && !Number.isFinite(parsed)) {
      toast.error(t("clients.metadata.errorSave"));
      return;
    }
    if (parsed === value) {
      setEditing(false);
      return;
    }
    await onSave(parsed);
    setEditing(false);
  };

  if (!editing) {
    return (
      <FieldShell
        label={label}
        editing={false}
        onEdit={() => {
          setDraft(value === null ? "" : String(value));
          setEditing(true);
        }}
      >
        <p className="text-sm text-foreground">
          {value === null
            ? t("clients.metadata.empty")
            : formatter
              ? formatter(value)
              : String(value)}
        </p>
      </FieldShell>
    );
  }

  return (
    <FieldShell label={label} editing onEdit={() => {}}>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button size="sm" onClick={commit}>
          {t("clients.metadata.save")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
          {t("clients.metadata.cancel")}
        </Button>
      </div>
    </FieldShell>
  );
}

function UrlField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | null;
  onSave: (value: string | null) => Promise<void>;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value ?? "");

  const commit = async () => {
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : trimmed;
    if (next === value) {
      setEditing(false);
      return;
    }
    await onSave(next);
    setEditing(false);
  };

  if (!editing) {
    return (
      <FieldShell
        label={label}
        editing={false}
        onEdit={() => {
          setDraft(value ?? "");
          setEditing(true);
        }}
      >
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm text-foreground">{t("clients.metadata.empty")}</p>
        )}
      </FieldShell>
    );
  }

  return (
    <FieldShell label={label} editing onEdit={() => {}}>
      <div className="flex items-center gap-1">
        <Input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-8 text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <Button size="sm" onClick={commit}>
          {t("clients.metadata.save")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
          {t("clients.metadata.cancel")}
        </Button>
      </div>
    </FieldShell>
  );
}

