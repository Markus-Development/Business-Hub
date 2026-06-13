import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { NAV_GROUPS } from "@/constants/nav";
import { getUserSettings } from "@/lib/settings";

// Valid landing targets are the real sidebar tabs — never a hardcoded list.
const VALID_TAB_HREFS = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)));

export default async function Home() {
  let target: string = ROUTES.pages.projects;
  try {
    const settings = await getUserSettings();
    if (settings.default_tab && VALID_TAB_HREFS.has(settings.default_tab)) {
      target = settings.default_tab;
    }
  } catch {
    // Fall back to /projects on any settings read failure.
  }
  redirect(target);
}
