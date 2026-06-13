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
import { ROUTES } from "@/constants/routes";
import { PRIORITIES, type Priority } from "@/constants/priorities";
import { PRODUCTS, DEV_TYPES, DEVELOPMENT_DEPARTMENT } from "@/constants/development";
import type { Project } from "@/lib/notion";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: Project) => void;
};

// Dev items are normal Projects-DB rows. We reuse /api/projects/create directly
// (no /api/development/create endpoint) and post the additive Product / Dev Type
// selects. Department is fixed to "Development" and Status to "Active".
export function AddDevItemDialog({ open, onOpenChange, onCreated }: Props) {
  const t = useT();

  const [name, setName] = useState("");
  const [product, setProduct] = useState<string>("");
  const [devType, setDevType] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [nextAction, setNextAction] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameMissing = !name.trim();
  const productMissing = !product;
  const devTypeMissing = !devType;

  const reset = () => {
    setName("");
    setProduct("");
    setDevType("");
    setPriority("Medium");
    setDueDate("");
    setNextAction("");
    setBody("");
    setSubmitting(false);
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    if (nameMissing || productMissing || devTypeMissing) return;
    setSubmitting(true);
    try {
      const res = await fetch(ROUTES.api.projects.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          status: "Active",
          department: DEVELOPMENT_DEPARTMENT,
          priority,
          dueDate: dueDate || null,
          nextAction,
          body,
          product,
          devType,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        project?: Project;
      };
      if (!res.ok || json.ok !== true || !json.project) {
        toast.error(t("development.add.error"));
        return;
      }
      toast.success(t("development.add.success"));
      onCreated(json.project);
      reset();
      onOpenChange(false);
    } catch {
      toast.error(t("development.add.error"));
    } finally {
      setSubmitting(false);
    }
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
          <DialogTitle>{t("development.add.title")}</DialogTitle>
          <DialogDescription>{t("development.add.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field label={t("development.add.name")} error={touched && nameMissing ? t("development.add.nameRequired") : null}>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("development.add.namePlaceholder")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label={t("development.add.product")}
              error={touched && productMissing ? t("development.add.productRequired") : null}
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
              error={touched && devTypeMissing ? t("development.add.devTypeRequired") : null}
            >
              <Select value={devType} onValueChange={setDevType}>
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder={t("development.add.selectDevType")} />
                </SelectTrigger>
                <SelectContent>
                  {DEV_TYPES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("development.add.department")}>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                {DEVELOPMENT_DEPARTMENT}
              </div>
            </Field>

            <Field label={t("development.add.priority")}>
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

          <Field label={t("development.add.dueDate")}>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>

          <Field label={t("development.add.nextAction")}>
            <Input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder={t("development.add.nextActionPlaceholder")}
            />
          </Field>

          <Field label={t("development.add.notes")}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("development.add.notesPlaceholder")}
              rows={4}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("development.add.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("development.add.creating") : t("development.add.submit")}
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
