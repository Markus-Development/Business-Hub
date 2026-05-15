"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREAS } from "@/constants/areas";
import { useT } from "@/lib/i18n";

type Props = {
  value: string | null;
  onSave: (next: string) => void;
};

export function AreaCell({ value, onSave }: Props) {
  const t = useT();
  return (
    <Select value={value ?? undefined} onValueChange={onSave}>
      <SelectTrigger className="h-8 w-[150px] text-xs">
        <SelectValue placeholder={t("projects.cell.noArea")} />
      </SelectTrigger>
      <SelectContent>
        {AREAS.map((a) => (
          <SelectItem key={a} value={a}>
            {a}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
