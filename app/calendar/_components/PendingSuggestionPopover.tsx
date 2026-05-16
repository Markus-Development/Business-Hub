"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export type PendingSuggestion = {
  id: string;
  created_at: string;
  date: string;
  project_name: string;
  start_at: string;
  end_at: string;
  rationale: string;
  status: string;
  google_event_id: string | null;
  batch_id: string;
};

function formatRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

type Props = {
  suggestion: PendingSuggestion | null;
  onClose: () => void;
  onConfirm: (s: PendingSuggestion) => void;
  onDismiss: (s: PendingSuggestion) => void;
};

export function PendingSuggestionDialog({
  suggestion,
  onClose,
  onConfirm,
  onDismiss,
}: Props) {
  const t = useT();
  const open = suggestion !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("calendar.pending.title")}</DialogTitle>
        </DialogHeader>
        {suggestion ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{suggestion.project_name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatRange(suggestion.start_at, suggestion.end_at)}
            </p>
            <p className="text-sm text-foreground">{suggestion.rationale}</p>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => suggestion && onDismiss(suggestion)}
            disabled={!suggestion}
          >
            {t("calendar.pending.dismiss")}
          </Button>
          <Button
            onClick={() => suggestion && onConfirm(suggestion)}
            disabled={!suggestion}
          >
            {t("calendar.pending.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
