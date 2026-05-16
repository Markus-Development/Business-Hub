"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
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

export type EventDraft = {
  summary: string;
  description: string;
  start: string; // datetime-local "YYYY-MM-DDTHH:mm"
  end: string;
  notionProjectId: string | null;
};

export type EventEdit = {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
};

type Mode = "closed" | "create" | "edit";

type Props = {
  mode: Mode;
  createDefaults: EventDraft | null;
  editEvent: EventEdit | null;
  projectOptions: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (draft: EventDraft) => Promise<boolean>;
  onUpdate: (id: string, draft: EventDraft) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

const NO_PROJECT_VALUE = "__none__";

export function EventDialog({
  mode,
  createDefaults,
  editEvent,
  projectOptions,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const t = useT();
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync internal state when the dialog opens. The mode toggle is the trigger;
  // we depend on the actual props that drive the initial values.
  useEffect(() => {
    if (mode === "create" && createDefaults) {
      setSummary(createDefaults.summary);
      setDescription(createDefaults.description);
      setStart(createDefaults.start);
      setEnd(createDefaults.end);
      setProjectId(createDefaults.notionProjectId);
      setTouched(false);
      setConfirmDelete(false);
    } else if (mode === "edit" && editEvent) {
      setSummary(editEvent.summary);
      setDescription(editEvent.description);
      setStart(editEvent.start);
      setEnd(editEvent.end);
      setProjectId(null);
      setTouched(false);
      setConfirmDelete(false);
    }
  }, [mode, createDefaults, editEvent]);

  const open = mode !== "closed";
  const summaryMissing = !summary.trim();
  const endBeforeStart =
    start.length > 0 &&
    end.length > 0 &&
    new Date(end).getTime() <= new Date(start).getTime();
  const hasError = summaryMissing || endBeforeStart;

  const submit = async () => {
    setTouched(true);
    if (hasError) return;
    setSubmitting(true);
    const draft: EventDraft = {
      summary: summary.trim(),
      description,
      start,
      end,
      notionProjectId: projectId,
    };
    const ok =
      mode === "edit" && editEvent
        ? await onUpdate(editEvent.id, draft)
        : await onCreate(draft);
    setSubmitting(false);
    if (ok) onClose();
  };

  const performDelete = async () => {
    if (!editEvent) return;
    setDeleting(true);
    const ok = await onDelete(editEvent.id);
    setDeleting(false);
    if (ok) {
      setConfirmDelete(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? t("calendar.dialog.editTitle") : t("calendar.dialog.newTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Field
              label={t("calendar.dialog.field.title")}
              error={touched && summaryMissing ? t("calendar.dialog.titleRequired") : null}
            >
              <Input
                autoFocus
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </Field>

            <Field label={t("calendar.dialog.field.project")}>
              <Select
                value={projectId ?? NO_PROJECT_VALUE}
                onValueChange={(v) => setProjectId(v === NO_PROJECT_VALUE ? null : v)}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_VALUE}>
                    {t("calendar.dialog.field.projectNone")}
                  </SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("calendar.dialog.field.description")}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t("calendar.dialog.field.start")}>
                <Input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field
                label={t("calendar.dialog.field.end")}
                error={endBeforeStart ? t("calendar.dialog.endBeforeStart") : null}
              >
                <Input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <div>
              {mode === "edit" ? (
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={submitting || deleting}
                >
                  {t("calendar.dialog.delete")}
                </Button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={submitting || deleting}>
                {t("calendar.dialog.cancel")}
              </Button>
              <Button onClick={submit} disabled={submitting || deleting}>
                {submitting ? t("calendar.dialog.saving") : t("calendar.dialog.save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={(o) => (!o ? setConfirmDelete(false) : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("calendar.dialog.deleteConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("calendar.dialog.deleteConfirmBody")}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              {t("calendar.dialog.cancel")}
            </Button>
            <Button variant="destructive" onClick={performDelete} disabled={deleting}>
              {deleting
                ? t("calendar.dialog.deleting")
                : t("calendar.dialog.deleteConfirmAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
