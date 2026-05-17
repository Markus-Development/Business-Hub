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
import { AREAS } from "@/constants/areas";
import { ROUTES } from "@/constants/routes";
import type { NotionResource } from "@/lib/notion";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (resource: NotionResource) => void;
};

// Type options are local to the Resources DB and not part of any shared constant.
// Hardcoded list per the prompt spec.
const TYPE_OPTIONS = ["Note", "Reference", "Link", "Template", "Other"] as const;
const UNSET = "__unset";

export function AddResourceDialog({ open, onOpenChange, onCreated }: Props) {
  const t = useT();

  const [name, setName] = useState("");
  const [area, setArea] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameMissing = !name.trim();

  const reset = () => {
    setName("");
    setArea("");
    setType("");
    setBody("");
    setSubmitting(false);
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    if (nameMissing) return;
    setSubmitting(true);
    try {
      const res = await fetch(ROUTES.api.resources.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          area: area || undefined,
          type: type || undefined,
          body,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        resource?: NotionResource;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.resource) throw new Error(json.error ?? "create_failed");
      toast.success(t("resources.add.success"));
      onCreated(json.resource);
      reset();
      onOpenChange(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("resource_create_failed", err);
      toast.error(t("resources.add.error"));
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
          <DialogTitle>{t("resources.add.title")}</DialogTitle>
          <DialogDescription>{t("resources.add.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field
            label={t("projects.col.name")}
            error={touched && nameMissing ? t("resources.add.nameRequired") : null}
          >
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("resources.add.namePlaceholder")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("projects.col.area")}>
              <Select
                value={area || UNSET}
                onValueChange={(v) => setArea(v === UNSET ? "" : v)}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder={t("resources.add.selectArea")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSET}>{t("resources.add.selectArea")}</SelectItem>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("resources.add.typeLabel")}>
              <Select
                value={type || UNSET}
                onValueChange={(v) => setType(v === UNSET ? "" : v)}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder={t("resources.add.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSET}>{t("resources.add.selectType")}</SelectItem>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={t("resources.add.body")}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("resources.add.bodyPlaceholder")}
              rows={4}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("resources.add.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("resources.add.creating") : t("resources.add.submit")}
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
