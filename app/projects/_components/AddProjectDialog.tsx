"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ActionSuggester } from "./ActionSuggester";
import { postProjectCreate } from "./api";
import { PRIORITIES, STATUSES, type Priority, type Status } from "@/constants/priorities";
import { AREAS } from "@/constants/areas";
import type { Project } from "@/lib/notion";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: Project) => void;
};

export function AddProjectDialog({ open, onOpenChange, onCreated }: Props) {
  const t = useT();

  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("Active");
  const [area, setArea] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [nextAction, setNextAction] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameMissing = !name.trim();
  const areaMissing = !area;

  const reset = () => {
    setName("");
    setStatus("Active");
    setArea("");
    setPriority("Medium");
    setDueDate("");
    setNextAction("");
    setBody("");
    setSubmitting(false);
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    if (nameMissing || areaMissing) return;
    setSubmitting(true);
    const result = await postProjectCreate({
      name: name.trim(),
      status,
      area,
      priority,
      dueDate: dueDate || null,
      nextAction,
      body,
    });
    setSubmitting(false);
    if (!result.ok || !result.project) {
      toast.error(t("projects.add.error"));
      return;
    }
    toast.success(t("projects.add.success"));
    onCreated(result.project);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("projects.add.title")}</DialogTitle>
          <DialogDescription>{t("projects.add.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label={t("projects.col.name")} error={touched && nameMissing ? t("projects.add.nameRequired") : null}>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("projects.add.namePlaceholder")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("projects.col.status")}>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`status.${s}` as const)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("projects.col.priority")}>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`priority.${p}` as const)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={t("projects.col.area")} error={touched && areaMissing ? t("projects.add.areaRequired") : null}>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder={t("projects.add.selectArea")} />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("projects.col.dueDate")}>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>

          <Field label={t("projects.col.nextAction")}>
            <Input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder={t("projects.add.nextActionPlaceholder")}
            />
          </Field>

          <Field label={t("projects.add.notes")}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("projects.add.notesPlaceholder")}
              rows={4}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <ActionSuggester
            project={{
              name: name.trim() || "(draft)",
              area: area || null,
              priority,
              dueDate: dueDate || null,
              nextAction: nextAction || null,
              estimatedMinutes: null,
            }}
            onAccept={(step) => setNextAction(step)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("projects.add.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("projects.add.creating") : t("projects.add.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: ReactNode;
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
