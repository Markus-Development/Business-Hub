"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { DEPARTMENTS } from "@/constants/departments";
import { PRIORITIES } from "@/constants/priorities";
import { RESOURCE_TYPES } from "@/constants/resource-types";
import { DEVELOPMENT_DEPARTMENT, PRODUCTS, DEV_TYPES } from "@/constants/development";

const AREA_NONE = "__none";

export type Suggestion = {
  destination: "project" | "resource";
  title: string;
  body: string;
  project: {
    department: string;
    priority: string;
    nextAction: string;
    dueDate: string | null;
    product: string | null;
    devType: string | null;
  };
  resource: { area: string | null; type: string };
};

export type ProcessPayload = {
  title: string;
  body: string;
  department: string;
  priority: string;
  nextAction: string;
  dueDate: string | null;
  area: string | null;
  type: string;
  product: string | null;
  devType: string | null;
};

export function SuggestionForm({
  suggestion,
  areaOptions,
  busy,
  onProcess,
  onSomeday,
  onSkip,
}: {
  suggestion: Suggestion;
  areaOptions: string[];
  busy: boolean;
  onProcess: (action: "project" | "resource", payload: ProcessPayload) => void;
  onSomeday: () => void;
  onSkip: () => void;
}) {
  const t = useT();

  const [destination, setDestination] = useState<"project" | "resource">(suggestion.destination);
  const [title, setTitle] = useState(suggestion.title);
  const [bodyText, setBodyText] = useState(suggestion.body);
  const [department, setDepartment] = useState(suggestion.project.department);
  const [priority, setPriority] = useState(suggestion.project.priority);
  const [nextAction, setNextAction] = useState(suggestion.project.nextAction);
  const [dueDate, setDueDate] = useState(suggestion.project.dueDate ?? "");
  const [product, setProduct] = useState(suggestion.project.product ?? "");
  const [devType, setDevType] = useState(suggestion.project.devType ?? "");
  const [area, setArea] = useState(suggestion.resource.area ?? "");
  const [type, setType] = useState(suggestion.resource.type);

  // Re-seed the editable form whenever a new suggestion arrives (new entry, or a
  // "Vorschlag holen" regenerate for the same entry). The parent creates a fresh
  // suggestion object per fetch, so the reference change is a reliable signal.
  useEffect(() => {
    setDestination(suggestion.destination);
    setTitle(suggestion.title);
    setBodyText(suggestion.body);
    setDepartment(suggestion.project.department);
    setPriority(suggestion.project.priority);
    setNextAction(suggestion.project.nextAction);
    setDueDate(suggestion.project.dueDate ?? "");
    setProduct(suggestion.project.product ?? "");
    setDevType(suggestion.project.devType ?? "");
    setArea(suggestion.resource.area ?? "");
    setType(suggestion.resource.type);
  }, [suggestion]);

  const isDevProject = department === DEVELOPMENT_DEPARTMENT && destination === "project";
  const devFieldsMissing = isDevProject && (!product || !devType);

  const submit = () => {
    onProcess(destination, {
      title: title.trim(),
      body: bodyText,
      department,
      priority,
      nextAction: nextAction.trim(),
      dueDate: dueDate || null,
      area: area || null,
      type,
      product: isDevProject ? product || null : null,
      devType: isDevProject ? devType || null : null,
    });
  };

  const titleMissing = !title.trim();

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
      {/* Destination segmented control */}
      <div className="inline-flex rounded-md border border-border bg-background p-0.5">
        {(["project", "resource"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDestination(d)}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              destination === d
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {d === "project" ? t("inbox.dest.project") : t("inbox.dest.resource")}
          </button>
        ))}
      </div>

      <Field label={t("inbox.field.title")} error={titleMissing ? t("inbox.field.titleRequired") : null}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field label={t("inbox.field.body")}>
        <textarea
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={8}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </Field>

      {destination === "project" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("inbox.field.department")}>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("inbox.field.priority")}>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("inbox.field.nextAction")}>
            <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
          </Field>
          <Field label={t("inbox.field.dueDate")}>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          {department === DEVELOPMENT_DEPARTMENT ? (
            <>
              <Field
                label={t("development.add.product")}
                error={!product ? t("development.add.productRequired") : null}
              >
                <Select value={product} onValueChange={setProduct}>
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder={t("development.add.selectProduct")} />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label={t("development.add.devType")}
                error={!devType ? t("development.add.devTypeRequired") : null}
              >
                <Select value={devType} onValueChange={setDevType}>
                  <SelectTrigger className="h-9 w-full text-sm">
                    <SelectValue placeholder={t("development.add.selectDevType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DEV_TYPES.map((dt) => (
                      <SelectItem key={dt} value={dt}>
                        {dt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("inbox.field.area")}>
            <Select
              value={area || AREA_NONE}
              onValueChange={(v) => setArea(v === AREA_NONE ? "" : v)}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder={t("inbox.field.areaNone")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AREA_NONE}>{t("inbox.field.areaNone")}</SelectItem>
                {areaOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("inbox.field.type")}>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((rt) => (
                  <SelectItem key={rt} value={rt}>
                    {rt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button onClick={submit} disabled={busy || titleMissing || devFieldsMissing}>
          {busy ? t("inbox.creating") : t("inbox.create")}
        </Button>
        <Button variant="outline" onClick={onSomeday} disabled={busy}>
          {t("inbox.someday")}
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={busy} className="ml-auto">
          {t("inbox.skip")}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
