"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";
import { MONTHLY_TASK_NAMES, type MonthlyTaskName } from "@/constants/client-tasks";
import type { TranslationKey } from "@/constants/translations";
import type { NotionProject } from "./types";

const NEXT_STATUS: Record<NonNullable<NotionProject["status"]>, NonNullable<NotionProject["status"]>> = {
  Active: "Done",
  Done: "Active",
  "On Hold": "Done",
};

function taskLabelKey(name: MonthlyTaskName): TranslationKey {
  return `clients.task.${name}` as TranslationKey;
}

function statusKey(status: NotionProject["status"]): TranslationKey | null {
  if (!status) return null;
  return `status.${status}` as TranslationKey;
}

function statusTone(status: NotionProject["status"]): string {
  switch (status) {
    case "Done":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "On Hold":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "Active":
      return "bg-primary/10 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function MonthlyTaskChecklist({
  zohoId,
  clientName,
  tasks,
  onRefresh,
}: {
  zohoId: string;
  clientName: string;
  tasks: NotionProject[];
  onRefresh: () => Promise<void>;
}) {
  const t = useT();
  const [generating, setGenerating] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  // Optimistic local override for status badges keyed by task name (one task per name this month).
  const [statusOverride, setStatusOverride] = useState<Record<string, NotionProject["status"]>>({});

  const byName = new Map(tasks.map((p) => [p.name, p]));
  const allExist = MONTHLY_TASK_NAMES.every((n) => byName.has(n));

  const handleGenerate = useCallback(async () => {
    if (!clientName) return;
    setGenerating(true);
    try {
      const res = await fetch(ROUTES.api.clients.generateTasks(zohoId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName }),
      });
      if (res.status === 409) {
        setAlreadyGenerated(true);
        return;
      }
      if (!res.ok) throw new Error(`http_${res.status}`);
      toast.success(t("clients.tasks.created"));
      await onRefresh();
    } catch (err) {
      toast.error(t("clients.tasks.errorCreate"));
      // eslint-disable-next-line no-console
      console.error("clients_generate_tasks_failed", err);
    } finally {
      setGenerating(false);
    }
  }, [clientName, zohoId, t, onRefresh]);

  const handleCycleStatus = useCallback(
    async (task: NotionProject) => {
      if (!task.status) return;
      const next = NEXT_STATUS[task.status];
      setPendingTaskId(task.id);
      setStatusOverride((prev) => ({ ...prev, [task.name]: next }));
      try {
        const res = await fetch(ROUTES.api.projects.update, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: task.id, field: "Status", value: next }),
        });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const body = (await res.json()) as { ok?: boolean; error?: string };
        if (body.ok !== true) throw new Error(body.error ?? "update_failed");
        toast.success(t("clients.tasks.statusUpdated"));
      } catch (err) {
        // Revert the optimistic override.
        setStatusOverride((prev) => {
          const copy = { ...prev };
          delete copy[task.name];
          return copy;
        });
        toast.error(t("clients.tasks.errorUpdate"));
        // eslint-disable-next-line no-console
        console.error("clients_task_status_update_failed", err);
      } finally {
        setPendingTaskId(null);
      }
    },
    [t],
  );

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {MONTHLY_TASK_NAMES.map((name) => {
          const task = byName.get(name);
          const effectiveStatus = statusOverride[name] ?? task?.status ?? null;
          const sKey = statusKey(effectiveStatus);
          return (
            <li
              key={name}
              className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm"
            >
              <span className="text-foreground">{t(taskLabelKey(name))}</span>
              {task ? (
                <button
                  type="button"
                  onClick={() => handleCycleStatus(task)}
                  disabled={pendingTaskId === task.id}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-opacity ${statusTone(
                    effectiveStatus,
                  )} ${pendingTaskId === task.id ? "opacity-60" : "hover:opacity-80"}`}
                >
                  {sKey ? t(sKey) : "—"}
                </button>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {t("clients.tasks.notCreated")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {!allExist ? (
        alreadyGenerated ? (
          <p className="text-xs text-muted-foreground">{t("clients.tasks.alreadyGenerated")}</p>
        ) : (
          <Button size="sm" onClick={handleGenerate} disabled={generating || !clientName}>
            {generating ? t("clients.tasks.generating") : t("clients.tasks.generate")}
          </Button>
        )
      ) : null}
    </div>
  );
}
