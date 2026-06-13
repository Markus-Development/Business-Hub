"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Code2, Plus } from "lucide-react";
import { ProjectDrawer } from "@/app/projects/_components/ProjectDrawer";
import { postProjectUpdate, type UpdateField } from "@/app/projects/_components/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BadgeOption } from "@/app/projects/_components/cells/OptionBadgeSelect";
import { useT } from "@/lib/i18n";
import {
  PRODUCTS,
  DEV_TYPES,
  DEV_STATUS_BUCKETS,
  DEFAULT_DEV_STATUS_BUCKET,
  matchesDevStatusBucket,
  type DevStatusBucket,
} from "@/constants/development";
import { ROUTES } from "@/constants/routes";
import type { TranslationKey } from "@/constants/translations";
import type { Project, SelectOption } from "@/lib/notion";
import { DevSection } from "./DevSection";
import { AddDevItemDialog } from "./AddDevItemDialog";

const ALL = "__all";

// Known Notion Status names that carry an i18n label; everything else (Backlog,
// In Progress, Later, Waiting, Nicht relevant, …) renders its raw Notion name.
const STATUS_LABEL_KEYS: Record<string, TranslationKey> = {
  Active: "status.Active",
  "On Hold": "status.On Hold",
  Done: "status.Done",
  Archived: "status.Archived",
};

// Mirror of ProjectsClient.FIELD_KEY — maps the wire field name onto the local
// Project key for the optimistic update.
const FIELD_KEY: Record<UpdateField, keyof Project> = {
  Status: "status",
  Priority: "priority",
  Name: "name",
  Department: "department",
  "Due Date": "dueDate",
  "Next Action": "nextAction",
};

type Props = {
  projects: Project[];
  notConfigured?: boolean;
  error?: boolean;
};

export function DevelopmentView({ projects, notConfigured, error }: Props) {
  const t = useT();
  const [items, setItems] = useState<Project[]>(projects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [devTypeFilter, setDevTypeFilter] = useState<string>("");
  const [statusBucket, setStatusBucket] = useState<DevStatusBucket>(DEFAULT_DEV_STATUS_BUCKET);
  const [search, setSearch] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);

  // Live Notion Status options (name + colour) from /api/projects/options. Feeds
  // the inline Status pill on each row (incl. the new "Nicht relevant" option,
  // which appears automatically). Loop-safe: empty deps, runs once on mount;
  // failure is non-fatal.
  const [statusOptionList, setStatusOptionList] = useState<SelectOption[]>([]);

  useEffect(() => {
    setItems(projects);
  }, [projects]);

  useEffect(() => {
    let cancelled = false;
    fetch(ROUTES.api.projects.options, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http_${r.status}`))))
      .then((body: { status?: SelectOption[] }) => {
        if (cancelled) return;
        setStatusOptionList(body.status ?? []);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("development_options_load_failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Translated/raw-labelled BadgeOptions for the inline Status select.
  const statusBadgeOptions = useMemo<BadgeOption[]>(
    () =>
      statusOptionList.map((o) => {
        const key = STATUS_LABEL_KEYS[o.name];
        return { value: o.name, label: key ? t(key) : o.name, color: o.color };
      }),
    [statusOptionList, t],
  );

  const handleUpdate = async (pageId: string, field: UpdateField, value: string | null) => {
    const prev = items;
    const archiving = field === "Status" && value === "Archived";

    if (archiving) {
      setItems(prev.filter((p) => p.id !== pageId));
    } else {
      const key = FIELD_KEY[field];
      setItems(prev.map((p) => (p.id === pageId ? { ...p, [key]: value } : p)));
    }

    const result = await postProjectUpdate(pageId, field, value);
    if (!result.ok) {
      setItems(prev);
      toast.error(t("development.updateError"));
      return;
    }
    if (result.archived) {
      if (selectedProjectId === pageId) setSelectedProjectId(null);
      toast.success(t("projects.archivedToast"));
      return;
    }
    toast.success(t("projects.updateSuccess"));
  };

  // Re-derives from the selected bucket, so an inline Status change that no
  // longer matches the active bucket drops the row (same UX as Projects presets).
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (devTypeFilter && p.devType !== devTypeFilter) return false;
      if (!matchesDevStatusBucket(statusBucket, p.status)) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, devTypeFilter, statusBucket, search]);

  // Build the product sections in PRODUCTS order + a trailing "Ohne Produkt"
  // bucket for items whose Product is null / not a known option.
  const sections = useMemo(() => {
    const out: { key: string; title: string; rows: Project[] }[] = [];
    for (const product of PRODUCTS) {
      out.push({
        key: product,
        title: product,
        rows: filteredItems.filter((p) => p.product === product),
      });
    }
    const orphan = filteredItems.filter(
      (p) => p.product == null || !(PRODUCTS as readonly string[]).includes(p.product),
    );
    out.push({ key: "__none", title: t("development.noProduct"), rows: orphan });
    return out;
  }, [filteredItems, t]);

  const selectedProject = useMemo(
    () => (selectedProjectId ? items.find((p) => p.id === selectedProjectId) ?? null : null),
    [items, selectedProjectId],
  );

  const hasAny = filteredItems.length > 0;

  // New dev item prepends into local state so it appears immediately (subject to
  // the active filters) — the Notion read on reload then carries Product/Dev Type.
  const handleCreated = (project: Project) => {
    setItems((prev) => [project, ...prev]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            <Code2 className="size-5 text-primary" aria-hidden />
            {t("development.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("development.subtitle")}</p>
        </div>
        {!notConfigured && !error ? (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("development.add.button")}
          </Button>
        ) : null}
      </div>

      {notConfigured ? (
        <p className="text-sm text-muted-foreground">{t("development.notConfigured")}</p>
      ) : error ? (
        <p className="text-sm text-destructive">{t("development.error")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={devTypeFilter || ALL}
              onValueChange={(v) => setDevTypeFilter(v === ALL ? "" : v)}
            >
              <SelectTrigger className="h-9 w-[150px] text-sm sm:w-[180px]">
                <SelectValue placeholder={t("development.filter.allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("development.filter.allTypes")}</SelectItem>
                {DEV_TYPES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusBucket}
              onValueChange={(v) => setStatusBucket(v as DevStatusBucket)}
            >
              <SelectTrigger
                aria-label={t("development.statusLabel")}
                className="h-9 w-[150px] text-sm sm:w-[180px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEV_STATUS_BUCKETS.map((b) => (
                  <SelectItem key={b.key} value={b.key}>
                    {t(b.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("development.search.placeholder")}
              className="h-9 w-full text-sm sm:w-[240px]"
            />
          </div>

          {hasAny ? (
            <div className="space-y-8">
              {sections.map((s) => (
                <DevSection
                  key={s.key}
                  title={s.title}
                  items={s.rows}
                  statusOptions={statusBadgeOptions}
                  statusPlaceholder={t("development.statusLabel")}
                  onStatusChange={(id, value) => handleUpdate(id, "Status", value)}
                  onOpenProject={(id) => setSelectedProjectId(id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("development.empty")}</p>
          )}
        </>
      )}

      <ProjectDrawer
        project={selectedProject}
        open={!!selectedProject}
        onOpenChange={(open) => {
          if (!open) setSelectedProjectId(null);
        }}
        onUpdate={handleUpdate}
      />

      <AddDevItemDialog open={addOpen} onOpenChange={setAddOpen} onCreated={handleCreated} />
    </div>
  );
}
