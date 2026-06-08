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
import type { TranslationKey } from "@/constants/translations";
import { FREIZEIT_CATEGORIES } from "@/constants/freizeit";
import type { FreizeitItem } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (item: FreizeitItem) => void;
};

const UNSET = "__unset";

export function AddFreizeitDialog({ open, onOpenChange, onCreated }: Props) {
  const t = useT();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameMissing = !name.trim();

  const reset = () => {
    setName("");
    setCategory("");
    setLink("");
    setNote("");
    setBody("");
    setSubmitting(false);
    setTouched(false);
  };

  const submit = async () => {
    setTouched(true);
    if (nameMissing) return;
    setSubmitting(true);
    try {
      const res = await fetch(ROUTES.api.freizeit.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category || undefined,
          link: link.trim() || undefined,
          note: note.trim() || undefined,
          body,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        item?: FreizeitItem;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.item) throw new Error(json.error ?? "create_failed");
      toast.success(t("freizeit.add.success"));
      onCreated(json.item);
      reset();
      onOpenChange(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("freizeit_create_failed", err);
      toast.error(t("freizeit.add.error"));
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
          <DialogTitle>{t("freizeit.add.title")}</DialogTitle>
          <DialogDescription>{t("freizeit.add.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field
            label={t("freizeit.add.nameLabel")}
            error={touched && nameMissing ? t("freizeit.add.nameRequired") : null}
          >
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("freizeit.add.namePlaceholder")}
            />
          </Field>

          <Field label={t("freizeit.add.categoryLabel")}>
            <Select
              value={category || UNSET}
              onValueChange={(v) => setCategory(v === UNSET ? "" : v)}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder={t("freizeit.add.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET}>{t("freizeit.add.selectCategory")}</SelectItem>
                {FREIZEIT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`freizeit.category.${c}` as TranslationKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("freizeit.add.linkLabel")}>
            <Input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={t("freizeit.add.linkPlaceholder")}
            />
          </Field>

          <Field label={t("freizeit.add.noteLabel")}>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("freizeit.add.notePlaceholder")}
            />
          </Field>

          <Field label={t("freizeit.add.body")}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("freizeit.add.bodyPlaceholder")}
              rows={4}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("freizeit.add.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("freizeit.add.creating") : t("freizeit.add.submit")}
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
