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
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { BUCHER_TAGS } from "@/constants/buecher";
import type { Buch } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (item: Buch) => void;
};

export function AddBuchDialog({ open, onOpenChange, onCreated }: Props) {
  const t = useT();

  const [name, setName] = useState("");
  const [author, setAuthor] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameMissing = !name.trim();

  const reset = () => {
    setName("");
    setAuthor("");
    setTags([]);
    setLink("");
    setNote("");
    setBody("");
    setSubmitting(false);
    setTouched(false);
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  };

  const submit = async () => {
    setTouched(true);
    if (nameMissing) return;
    setSubmitting(true);
    try {
      const res = await fetch(ROUTES.api.buecher.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          author: author.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          link: link.trim() || undefined,
          note: note.trim() || undefined,
          body,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        item?: Buch;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.item) throw new Error(json.error ?? "create_failed");
      toast.success(t("buecher.add.success"));
      onCreated(json.item);
      reset();
      onOpenChange(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("buecher_create_failed", err);
      toast.error(t("buecher.add.error"));
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
          <DialogTitle>{t("buecher.add.title")}</DialogTitle>
          <DialogDescription>{t("buecher.add.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field
            label={t("buecher.add.nameLabel")}
            error={touched && nameMissing ? t("buecher.add.nameRequired") : null}
          >
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("buecher.add.namePlaceholder")}
            />
          </Field>

          <Field label={t("buecher.add.authorLabel")}>
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t("buecher.add.authorPlaceholder")}
            />
          </Field>

          <Field label={t("buecher.add.tagsLabel")}>
            <div className="flex flex-wrap gap-2">
              {BUCHER_TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label={t("buecher.add.linkLabel")}>
            <Input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={t("buecher.add.linkPlaceholder")}
            />
          </Field>

          <Field label={t("buecher.add.noteLabel")}>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("buecher.add.notePlaceholder")}
            />
          </Field>

          <Field label={t("buecher.add.body")}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("buecher.add.bodyPlaceholder")}
              rows={4}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("buecher.add.cancel")}
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("buecher.add.creating") : t("buecher.add.submit")}
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
