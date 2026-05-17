"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/lib/i18n";

export type ActionSuggesterProject = {
  // Stable Notion page id when available — used as the localStorage key so the
  // suggester survives renames. Falls back to `name` for the AddProjectDialog
  // case where the project hasn't been created yet.
  id?: string;
  name: string;
  area: string | null;
  priority: string | null;
  dueDate: string | null;
  nextAction: string | null;
  estimatedMinutes: number | null;
};

type Props = {
  project: ActionSuggesterProject;
  onAccept: (step: string) => void;
};

const CTX_KEY_PREFIX = "bh.suggest.ctx.";
const STEPS_KEY_PREFIX = "bh.suggest.steps.";

export function ActionSuggester({ project, onAccept }: Props) {
  const t = useT();
  const storageKey = project.id ?? project.name;
  const [context, setContext] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Hydrate persisted context AND steps whenever the project changes. Deps are
  // both primitives — id (stable) and name (fallback / rename trigger).
  useEffect(() => {
    try {
      const ctx = window.localStorage.getItem(`${CTX_KEY_PREFIX}${storageKey}`);
      setContext(ctx ?? "");
    } catch {
      setContext("");
    }
    try {
      const raw = window.localStorage.getItem(`${STEPS_KEY_PREFIX}${storageKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setSteps(parsed.filter((s): s is string => typeof s === "string"));
        } else {
          setSteps([]);
        }
      } else {
        setSteps([]);
      }
    } catch {
      setSteps([]);
    }
    setError(false);
  }, [project.id, project.name, storageKey]);

  // Persist the textarea on every edit. Steps are NOT persisted via effect —
  // they're written explicitly inside suggest() to avoid clobbering the cache
  // before a successful response replaces it.
  useEffect(() => {
    try {
      window.localStorage.setItem(`${CTX_KEY_PREFIX}${storageKey}`, context);
    } catch {
      /* private mode / quota errors are non-critical */
    }
  }, [context, storageKey]);

  const suggest = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(ROUTES.api.projects.suggest, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project, context }),
      });
      const json = (await res.json()) as { ok?: boolean; steps?: unknown };
      if (!res.ok || !json.ok || !Array.isArray(json.steps)) throw new Error("bad_response");
      const newSteps = json.steps.filter((s): s is string => typeof s === "string");
      setSteps(newSteps);
      try {
        window.localStorage.setItem(
          `${STEPS_KEY_PREFIX}${storageKey}`,
          JSON.stringify(newSteps),
        );
      } catch {
        /* persistence is best-effort */
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <section className="rounded-xl border border-primary/15 bg-primary/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-primary" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-wide text-primary">
            {t("projects.suggest.title")}
          </span>
        </div>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={t("projects.suggest.contextPlaceholder")}
          rows={2}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {error ? (
          <p className="mt-2 text-xs text-destructive">{t("projects.suggest.error")}</p>
        ) : null}
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={suggest} disabled={loading}>
            {loading ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <Sparkles size={14} aria-hidden />
            )}
            {steps.length > 0
              ? t("projects.suggest.regenerate")
              : t("projects.suggest.button")}
          </Button>
        </div>
      </section>

      {steps.length > 0 ? (
        <section className="mt-2 rounded-xl border border-border bg-muted/30 p-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("projects.suggest.savedLabel")}
          </p>
          <ul className="space-y-1.5">
            {steps.map((step, i) => (
              <li
                key={`${i}-${step.slice(0, 40)}`}
                className="flex items-start justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <span className="flex flex-1 gap-2 text-sm leading-relaxed text-foreground">
                  <span aria-hidden className="text-muted-foreground">
                    •
                  </span>
                  <span>{step}</span>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 px-2 text-xs"
                  onClick={() => onAccept(step)}
                >
                  {t("projects.suggest.use")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
