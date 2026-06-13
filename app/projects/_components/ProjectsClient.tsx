"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ProjectsTable } from "./ProjectsTable";
import { ProjectsKanban } from "./ProjectsKanban";
import { ProjectsCalendar } from "./ProjectsCalendar";
import { ProjectDrawer } from "./ProjectDrawer";
import { AddProjectDialog } from "./AddProjectDialog";
import {
  ProjectsToolbar,
  VIEWS,
  DEFAULT_SCOPE,
  parseScope,
  presetKeyOf,
  statusOf,
  type View,
} from "./ProjectsToolbar";
import { postProjectUpdate, type UpdateField } from "./api";
import { useT } from "@/lib/i18n";
import { PROJECT_VIEWS } from "@/constants/project-views";
import { DEPARTMENTS } from "@/constants/departments";
import { DEVELOPMENT_DEPARTMENT } from "@/constants/development";
import { ROUTES } from "@/constants/routes";
import type { Project, SelectOption } from "@/lib/notion";

const VIEW_STORAGE_KEY = "bh.projects.view";
// Reused (not migrated to a new key): the combined Status dropdown now stores a
// prefixed scope string ("view:<key>" | "status:<name>"); legacy bare preset
// values written before this change are migrated on read by `parseScope`.
const VIEW_PRESET_STORAGE_KEY = "bh.projects.viewPreset";

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
  // Combined Status scope: "view:<key>" (preset, narrows Table+Calendar only) or
  // "status:<name>" (single status, filters ALL views incl. Kanban). Default 'open'.
  const [scope, setScope] = useState<string>(DEFAULT_SCOPE);
  const [items, setItems] = useState<Project[]>(projects);

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
      const storedScope = window.localStorage.getItem(VIEW_PRESET_STORAGE_KEY);
      // parseScope migrates legacy bare preset keys and rejects unknown values.
      setScope(parseScope(storedScope));
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

  const changeScope = (next: string) => {
    setScope(next);
    try {
      window.localStorage.setItem(VIEW_PRESET_STORAGE_KEY, next);
    } catch {}
  };

  const handleUpdate = async (pageId: string, field: UpdateField, value: string | null) => {
    const prev = items;
    const isStatusChange = field === "Status";
    // Status -> Archived is not a normal edit: it moves the project to the
    // Archive DB and trashes the source page. Optimistically drop the row;
    // reconcile (restore) only if the request fails.
    const archiving = isStatusChange && value === "Archived";

    if (archiving) {
      setItems(prev.filter((p) => p.id !== pageId));
    } else {
      // The hub loads every view-relevant status (listProjectsForViews), so a
      // status change is an in-place edit: the derived `listItems` re-filters
      // automatically, dropping the row from the table/calendar when its new
      // status no longer matches the active view preset.
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

  // Derive the active scope: either a preset key (narrows Table+Calendar only) or
  // a single status (filters ALL views). Exactly one is non-null.
  const presetKey = presetKeyOf(scope);
  const singleStatus = statusOf(scope);

  // `filteredItems` applies the single-status filter (when a status is selected)
  // plus department + priority. Kanban renders this set: with a preset selected
  // `singleStatus` is "", so Kanban keeps its full Active/On Hold/Done columns;
  // with a single status selected, Kanban shows only that status.
  const filteredItems = useMemo(() => {
    return items.filter((p) => {
      if (singleStatus && p.status !== singleStatus) return false;
      if (departmentFilter) {
        if (p.department !== departmentFilter) return false;
      } else if (p.department === DEVELOPMENT_DEPARTMENT) {
        // No department filter: hide Development projects by default — they have
        // their own Development tab (Tab 10). Selecting "Development" in the
        // department filter brings them back via the branch above.
        return false;
      }
      if (priorityFilter && p.priority !== priorityFilter) return false;
      return true;
    });
  }, [items, singleStatus, departmentFilter, priorityFilter]);

  // `listItems` (Table + Calendar) narrows `filteredItems` to the active preset's
  // status set. When a single status is selected (no preset), it equals
  // `filteredItems` — the status filter already applied, so all views agree.
  const listItems = useMemo(() => {
    if (!presetKey) return filteredItems;
    const presetStatuses =
      PROJECT_VIEWS.find((v) => v.key === presetKey)?.statuses ?? [];
    return filteredItems.filter(
      (p) => p.status != null && (presetStatuses as readonly string[]).includes(p.status),
    );
  }, [filteredItems, presetKey]);

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
      <ProjectsToolbar
        view={view}
        onChangeView={changeView}
        scope={scope}
        onChangeScope={changeScope}
        statusOptions={statusOptions}
        departmentFilter={departmentFilter}
        onChangeDepartment={setDepartmentFilter}
        priorityFilter={priorityFilter}
        onChangePriority={setPriorityFilter}
        groupByDepartment={groupByDepartment}
        onToggleGroupByDepartment={() => setGroupByDepartment((v) => !v)}
        onAdd={() => setAddOpen(true)}
      />

      {view === "kanban" ? (
        <ProjectsKanban
          items={filteredItems}
          onUpdate={handleUpdate}
          onOpenProject={openProject}
        />
      ) : view === "calendar" ? (
        <ProjectsCalendar
          items={listItems}
          onOpenProject={openProject}
          onUpdate={handleUpdate}
        />
      ) : (
        <ProjectsTable
          items={listItems}
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
