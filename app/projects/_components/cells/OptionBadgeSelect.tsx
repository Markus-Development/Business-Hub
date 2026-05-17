"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notionColourBg, notionColourText } from "@/constants/priorities";

export type BadgeOption = {
  value: string;
  label: string;
  // Notion colour name (default | gray | brown | ...). null → muted default fallback.
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

// A Select whose trigger and dropdown items render the selected option as a
// Notion-style pill (light background + matching text colour). The trigger
// itself stays a neutral container so the table columns keep stable widths;
// `h-9 font-sans text-sm` matches the layout of other Projects-table cells.
export function OptionBadgeSelect({
  value,
  options,
  onChange,
  placeholder,
  widthClass = "w-[150px]",
}: Props) {
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className={`h-9 ${widthClass} font-sans text-sm`}>
        <SelectValue placeholder={placeholder}>
          {selected ? (
            <span
              style={{
                background: notionColourBg(selected.color),
                color: notionColourText(selected.color),
              }}
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
            >
              {selected.label}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span
              style={{
                background: notionColourBg(o.color),
                color: notionColourText(o.color),
              }}
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
            >
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
