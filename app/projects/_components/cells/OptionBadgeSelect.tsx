"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notionColour } from "@/constants/priorities";

export type BadgeOption = {
  value: string;
  label: string;
  // Notion colour name (default | gray | brown | ...). null → muted-foreground fallback.
  color: string | null;
};

type Props = {
  value: string | null;
  options: BadgeOption[];
  onChange: (next: string) => void;
  placeholder: string;
  // Single shared width for all option-badge cells in the table so columns line up
  // and no size jump happens when the colour map for an option changes.
  widthClass?: string;
};

// A Select whose trigger carries a 3px solid left border matching the selected
// option's Notion `color`. Read state and edit state share the same dimensions,
// so clicking to edit doesn't visually resize the cell.
export function OptionBadgeSelect({
  value,
  options,
  onChange,
  placeholder,
  widthClass = "w-[150px]",
}: Props) {
  const selected = options.find((o) => o.value === value) ?? null;
  const accent = notionColour(selected?.color);

  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger
        className={`h-9 ${widthClass} font-sans text-sm`}
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span
              className="inline-flex items-center gap-2"
              style={{
                borderLeft: `3px solid ${notionColour(o.color)}`,
                paddingLeft: "8px",
              }}
            >
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
