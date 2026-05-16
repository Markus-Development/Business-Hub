"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type Props = {
  value: string | null;
  onSave: (next: string | null) => void;
  dateFormatter: Intl.DateTimeFormat;
};

export function DueDateCell({ value, onSave, dateFormatter }: Props) {
  const t = useT();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        defaultValue={value ?? ""}
        onChange={(e) => {
          const next = e.target.value || null;
          if (next !== value) onSave(next);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-9 w-[150px] rounded-md border border-input bg-background px-2 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    );
  }

  let label: string;
  if (value) {
    try {
      label = dateFormatter.format(new Date(value));
    } catch {
      label = value;
    }
  } else {
    label = t("projects.cell.setDueDate");
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "block h-9 w-[150px] rounded px-1.5 text-left font-sans text-sm leading-9 transition-colors hover:bg-muted",
        value ? "text-foreground" : "text-muted-foreground/70",
      )}
    >
      {label}
    </button>
  );
}
