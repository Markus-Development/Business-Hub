"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

type Props = {
  value: string;
  onSave: (next: string) => void;
};

export function NextActionCell({ value, onSave }: Props) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  if (editing) {
    const commit = () => {
      if (draft !== value) onSave(draft);
      setEditing(false);
    };
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-9 w-full max-w-[32ch] rounded-md border border-input bg-background px-2 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="block h-9 w-full max-w-[32ch] truncate rounded px-1.5 text-left font-sans text-sm leading-9 text-foreground transition-colors hover:bg-muted"
      title={value}
    >
      {value || <span className="text-muted-foreground/70">{t("projects.cell.addNextAction")}</span>}
    </button>
  );
}
