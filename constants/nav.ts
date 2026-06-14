import {
  Inbox,
  FolderKanban,
  Code2,
  Sparkles,
  CalendarDays,
  Users,
  ClipboardCheck,
  LayoutGrid,
  BookOpen,
  BookMarked,
  NotebookPen,
  Phone,
  Gamepad2,
  Coins,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { TranslationKey } from "@/constants/translations";

export type NavItem = {
  href: string;
  label: TranslationKey;
  icon: LucideIcon;
};

export type NavGroup = {
  labelKey: TranslationKey;
  items: NavItem[];
};

// Grouped navigation for the left sidebar. Order + grouping is the source of
// truth for the Sidebar component. All hrefs come from ROUTES.pages — never a
// hardcoded path. Icons mirror the previous top-nav tab strip exactly.
export const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "nav.group.control",
    items: [
      { href: ROUTES.pages.digest, label: "nav.digest", icon: Sparkles },
      { href: ROUTES.pages.calendar, label: "nav.calendar", icon: CalendarDays },
      { href: ROUTES.pages.einnahmen, label: "nav.einnahmen", icon: Coins },
      { href: ROUTES.pages.inbox, label: "nav.inbox", icon: Inbox },
    ],
  },
  {
    labelKey: "nav.group.work",
    items: [
      { href: ROUTES.pages.projects, label: "nav.projects", icon: FolderKanban },
      { href: ROUTES.pages.development, label: "nav.development", icon: Code2 },
      { href: ROUTES.pages.areas, label: "nav.areas", icon: LayoutGrid },
      { href: ROUTES.pages.clients, label: "nav.clients", icon: Users },
      { href: ROUTES.pages.fulfillment, label: "nav.fulfillment", icon: ClipboardCheck },
      { href: ROUTES.pages.calls, label: "nav.calls", icon: Phone },
    ],
  },
  {
    labelKey: "nav.group.personal",
    items: [
      { href: ROUTES.pages.resources, label: "nav.resources", icon: BookOpen },
      { href: ROUTES.pages.journal, label: "nav.journal", icon: NotebookPen },
      { href: ROUTES.pages.freizeit, label: "nav.freizeit", icon: Gamepad2 },
      { href: ROUTES.pages.buecher, label: "nav.buecher", icon: BookMarked },
    ],
  },
];
