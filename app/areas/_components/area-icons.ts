import {
  Calculator,
  Code2,
  Coins,
  LayoutGrid,
  type LucideIcon,
  Megaphone,
  Package,
  PenLine,
  Settings,
  TrendingUp,
  User,
} from "lucide-react";

// Per-area icon, keyed on the NORMALIZED base name (no " (vN)" suffix). Unknown
// areas fall back to a neutral grid icon.
const AREA_ICONS: Record<string, LucideIcon> = {
  Accounting: Calculator,
  Content: PenLine,
  Development: Code2,
  Fulfillment: Package,
  Marketing: Megaphone,
  Sales: Coins,
  Operations: Settings,
  Personal: User,
  Investment: TrendingUp,
};

export const FALLBACK_AREA_ICON: LucideIcon = LayoutGrid;

export function iconForArea(baseName: string): LucideIcon {
  return AREA_ICONS[baseName] ?? FALLBACK_AREA_ICON;
}
