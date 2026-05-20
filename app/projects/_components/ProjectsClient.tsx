"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Layers, Plus } from "lucide-react";
import { toast } from "sonner";
import { ProjectsTable } from "./ProjectsTable";
import { ProjectsKanban } from "./ProjectsKanban";
import { ProjectsCalendar } from "./ProjectsCalendar";
import { ProjectDrawer } from "./ProjectDrawer";
import { AddProjectDialog } from "./AddProjectDialog";
import { postProjectUpdate, type UpdateField } from "./api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PRIORITIES, STATUSES } from "@/constants/priorities";
import { DEPARTMENTS } from "@/constants/departments";
import { ROUTES } from "@/constants/routes";
import type { Project, SelectOption } from "@/lib/notion";

const VIEW_STORAGE_KEY = "bh.projects.view";
type View = "table" | "kanban" | "calendar";
const VIEWS = ["table", "kanban", "calendar"] as const;
const ALL = "__all";

const FIELD_KEY: Record<UpdateField, keyof Project> = {
  Status: "status",
  Priority: "priority",
  Name: "name",
  Department: "department",
  "Due Date": "dueDate",
  "Next Action": "nextAction",
};

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const t = useT();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("table");
  const [items, setItems] = useState<Project[]>(projects);

  const [statusFilter, setStatusFilter] = useState<string>("");
  // Pre-seed from `?department=<name>` on mount when the value matches a known
  // Department (e.g. links from Tab 5's project-count badge). Lazy initialiser
  // intentionally ignores later URL changes — once mounted, the user's filter
  // selection wins.
  const [departmentFilter, setDepartmentFilter] = useState<string>(() => {
    const fromUrl = searchParams.get("department");
    return fromUrl && (DEPARTMENTS as readonly string[]).includes(fromUrl) ? fromUrl : "";
  });
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  // Group-by-department is a table-only display mode. Preserved across view
  // switches — re-appears with active state when the user returns to the table.
  const [groupByDepartment, setGroupByDepartment] = useState<boolean>(false);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored && (VIEWS as readonly string[]).includes(stored)) {
        setView(stored as View);
      }
    } catch {}
  }, []);

  // Notion Status + Department option lists, including each option's `color`. Used by
  // the table cells to paint a coloured left-border on the badge that matches the
  // option colour set in Notion. Failure is non-fatal — cells fall back to the muted default.
  useEffect(() => {
    let cancelled = false;
    fetch(ROUTES.api.projects.options, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`http_${r.status}`))))
      .then((body: { status?: SelectOption[]; department?: SelectOption[] }) => {
        if (cancelled) return;
        setStatusOptions(body.status ?? []);
        setDepartmentOptions(body.department ?? []);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("projects_options_load_failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setItems(projects);
  }, [projects]);

  const changeView = (v: View) => {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {}
  };

  const handleUpdate = async (pageId: string, field: UpdateField, value: string | null) => {
    const prev = items;
    // Status -> Archived is not a normal edit: it moves the project to the
    // Archive DB and trashes the source page. Optimistically drop the row;
    // reconcile (restore) only if the request fails.
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
      toast.error(t("projects.errorUpdate"));
      return;
    }
    if (result.archived) {
      // Row already removed optimistically. Close the drawer if it was open.
      if (selectedProjectId === pageId) setSelectedProjectId(null);
      toast.success(t("projects.archivedToast"));
      return;
    }
    toast.success(t("projects.updateSuccess"));
  };

  const handleCreated = (project: Project) => {
    setItems((prev) => [project, ...prev]);
  };

  const filteredItems = useMemo(() => {
    return items.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (departmentFilter && p.department !== departmentFilter) return false;
      if (priorityFilter && p.priority !== priorityFilter) return false;
      return true;
    });
  }, [items, statusFilter, departmentFilter, priorityFilter]);

  // Drawer follows live items so optimistic edits are reflected.
  const selectedProject = useMemo(
    () => (selectedProjectId ? items.find((p) => p.id === selectedProjectId) ?? null : null),
    [items, selectedProjectId],
  );

  const openProject = (pageId: string) => setSelectedProjectId(pageId);
  const closeDrawer = (open: boolean) => {
    if (!open) setSelectedProjectId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label={t("projects.viewToggle.ariaLabel")}
            className="inline-flex items-center rounded-md border border-border bg-card p-0.5"
          >
            {VIEWS.map((v) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => changeView(v)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-sm px-3 py-1 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`projects.view.${v}` as const)}
                </button>
              );
            })}
          </div>
          <div className="hidden h-6 w-px bg-border md:block" aria-hidden />
          <Select
            value={statusFilter || ALL}
            onValueChange={(v) => setStatusFilter(v === ALL ? "" : v)}
          >
            <SelectTrigger className="h-9 w-[180px] text-sm">
              <SelectValue placeholder={t("projects.filter.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("projects.filter.allStatuses")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}` as const)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={departmentFilter || ALL}
            onValueChange={(v) => setDepartmentFilter(v === ALL ? "" : v)}
          >
            <SelectTrigger className="h-9 w-[180px] text-sm">
              <SelectValue placeholder={t("projects.filter.allDepartments")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("projects.filter.allDepartments")}</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter || ALL}
            onValueChange={(v) => setPriorityFilter(v === ALL ? "" : v)}
          >
            <SelectTrigger className="h-9 w-[180px] text-sm">
              <SelectValue placeholder={t("projects.filter.allPriorities")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("projects.filter.allPriorities")}</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`priority.${p}` as const)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {view === "table" && (
            <button
              type="button"
              onClick={() => setGroupByDepartment((v) => !v)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
                groupByDepartment
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <Layers size={14} aria-hidden />
              {t("projects.groupByDepartment")}
            </button>
          )}
        </div>

        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" aria-hidden />
          {t("projects.add.button")}
        </Button>
      </div>

      {view === "kanban" ? (
        <ProjectsKanban
          items={filteredItems}
          onUpdate={handleUpdate}
          onOpenProject={openProject}
        />
      ) : view === "calendar" ? (
        <ProjectsCalendar
          items={filteredItems}
          onOpenProject={openProject}
          onUpdate={handleUpdate}
        />
      ) : (
        <ProjectsTable
          items={filteredItems}
          onUpdate={handleUpdate}
          onOpenProject={openProject}
          statusOptions={statusOptions}
          departmentOptions={departmentOptions}
          groupByDepartment={groupByDepartment}
        />
      )}

      <ProjectDrawer
        project={selectedProject}
        open={!!selectedProject}
        onOpenChange={closeDrawer}
        onUpdate={handleUpdate}
      />

      <AddProjectDialog open={addOpen} onOpenChange={setAddOpen} onCreated={handleCreated} />
    </div>
  );
}
