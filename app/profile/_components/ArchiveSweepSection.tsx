"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { ROUTES } from "@/constants/routes";

type Processed = { pageId: string; name: string; archiveId: string };
type Errored = { pageId: string; name: string; error: string };
type CategoryResult = { processed: Processed[]; errors: Errored[] };

type RunResult =
  | { kind: "done"; projects: CategoryResult; resources: CategoryResult }
  | { kind: "failed" };

// Archive sweep — catches Projects/Resources flipped to Status="Archived"
// directly in Notion (outside Business Hub), which the immediate trigger never
// sees. Manual button only in v1; a cron trigger is a post-deployment follow-up.
export function ArchiveSweepSection() {
  const t = useT();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  const runSweep = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(ROUTES.api.archive.sweep, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        projects?: CategoryResult;
        resources?: CategoryResult;
        error?: string;
      };
      if (!res.ok || json.ok !== true || !json.projects || !json.resources) {
        throw new Error(json.error ?? "sweep_failed");
      }
      setResult({ kind: "done", projects: json.projects, resources: json.resources });

      const processed = json.projects.processed.length + json.resources.processed.length;
      const errCount = json.projects.errors.length + json.resources.errors.length;
      if (processed === 0 && errCount === 0) {
        toast.success(t("profile.archive.none"));
      } else {
        const msg = t("profile.archive.success")
          .replace("{projects}", String(json.projects.processed.length))
          .replace("{resources}", String(json.resources.processed.length));
        if (errCount === 0) toast.success(msg);
        else toast.error(msg);
      }
    } catch (err) {
      setResult({ kind: "failed" });
      toast.error(t("profile.archive.toastError"));
      // eslint-disable-next-line no-console
      console.error("archive_sweep_failed", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{t("profile.archive.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("profile.archive.description")}</p>
        </div>
        <Button size="sm" onClick={runSweep} disabled={running}>
          {running ? t("profile.archive.running") : t("profile.archive.button")}
        </Button>
      </div>

      {result ? <ResultPanel result={result} /> : null}
    </section>
  );
}

function ResultPanel({ result }: { result: RunResult }) {
  const t = useT();

  if (result.kind === "failed") {
    return <p className="mt-3 text-sm text-destructive">{t("profile.archive.toastError")}</p>;
  }

  const { projects, resources } = result;
  const errors = [...projects.errors, ...resources.errors];
  const nothing =
    projects.processed.length === 0 &&
    resources.processed.length === 0 &&
    errors.length === 0;

  if (nothing) {
    return <p className="mt-3 text-sm text-muted-foreground">{t("profile.archive.none")}</p>;
  }

  const summary = t("profile.archive.success")
    .replace("{projects}", String(projects.processed.length))
    .replace("{resources}", String(resources.processed.length));

  return (
    <div className="mt-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <p className="text-foreground">{summary}</p>
      {errors.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-destructive">
            {t("profile.archive.errorsTitle")}
          </p>
          <ul className="mt-1 space-y-1">
            {errors.map((e) => (
              <li key={e.pageId} className="font-mono text-xs text-muted-foreground">
                {t("profile.archive.errorItem")
                  .replace("{name}", e.name)
                  .replace("{error}", e.error)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
