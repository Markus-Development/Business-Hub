"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
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
import type { TranslationKey } from "@/constants/translations";
import { ROUTES } from "@/constants/routes";
import { NAV_GROUPS } from "@/constants/nav";

// Flat list of the real sidebar tabs, used for the default-tab dropdown.
const TAB_OPTIONS = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ href: i.href, label: i.label })));
const HORIZON_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

// Collapsed-by-default accordion state for the task-type-windows card persists
// here. Same pattern as app/areas/_components/CategorySection.tsx.
const WINDOWS_STORAGE_KEY = "bh.profile.windows";

type TaskTypeWindow = {
  task_type: string;
  start_hour: number;
  end_hour: number;
};

type UserSettings = {
  user_key: string;
  timezone: string;
  master_calendar_id: string | null;
  task_type_windows: TaskTypeWindow[];
  timeblock_horizon_days: number;
  workday_start_hour: number;
  workday_end_hour: number;
  default_tab: string;
  updated_at: string;
};

type Calendar = { id: string; summary: string; primary: boolean };
type TaskTypeOption = { id: string; name: string };

// Curated list of zones; user can also free-text any IANA zone.
const COMMON_TIMEZONES = [
  "Asia/Dubai",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Athens",
  "Europe/Zurich",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Sao_Paulo",
  "Asia/Singapore",
  "Asia/Tokyo",
] as const;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T | null; error?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    const body = (await res.json().catch(() => null)) as T | null;
    const error =
      body && typeof body === "object" && "error" in (body as Record<string, unknown>)
        ? String((body as { error?: unknown }).error ?? "")
        : undefined;
    return { ok: res.ok, status: res.status, body, error };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: err instanceof Error ? err.message : "fetch_failed",
    };
  }
}

// Group windows by task_type, preserving order within each group.
// Multiple entries with the same task_type are valid — that's the multi-window shape.
function groupWindowsByTaskType(
  windows: TaskTypeWindow[],
): Map<string, { window: TaskTypeWindow; index: number }[]> {
  const out = new Map<string, { window: TaskTypeWindow; index: number }[]>();
  windows.forEach((w, index) => {
    const list = out.get(w.task_type) ?? [];
    list.push({ window: w, index });
    out.set(w.task_type, list);
  });
  return out;
}

function clampHour(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 23) return null;
  return n;
}

export function SettingsSection() {
  const t = useT();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [calendars, setCalendars] = useState<Calendar[] | null>(null);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [taskTypes, setTaskTypes] = useState<TaskTypeOption[] | null>(null);
  const [taskTypesMissing, setTaskTypesMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Task-type-windows accordion, collapsed by default. Mount-only read with no
  // deps keeps this loop-safe (mirrors CategorySection.tsx).
  const [windowsOpen, setWindowsOpen] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(WINDOWS_STORAGE_KEY);
      if (stored === "expanded") setWindowsOpen(true);
    } catch {
      // localStorage unavailable — keep default collapsed.
    }
  }, []);

  const toggleWindows = () => {
    setWindowsOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(WINDOWS_STORAGE_KEY, next ? "expanded" : "collapsed");
      } catch {
        // ignore persistence failure
      }
      return next;
    });
  };

  // Same loop-safe pattern as the other client components: keep current t in a ref
  // and mount the fetch effect with empty deps so locale toggles don't refetch.
  const tRef = useRef(t);
  tRef.current = t;

  const loadCalendars = useCallback(async () => {
    const res = await fetchJson<{ calendars: Calendar[] }>(ROUTES.api.profile.calendars);
    if (res.ok && res.body && "calendars" in res.body) {
      setGoogleConnected(true);
      setCalendars(res.body.calendars);
    } else if (res.status === 409 && res.error === "google_not_connected") {
      setGoogleConnected(false);
      setCalendars(null);
    } else {
      setGoogleConnected(true);
      setCalendars([]);
      toast.error(tRef.current("settings.errorCalendars"));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, tt] = await Promise.all([
        fetchJson<{ settings: UserSettings }>(ROUTES.api.profile.settings),
        fetchJson<{ options: TaskTypeOption[]; missing: boolean }>(ROUTES.api.profile.taskTypes),
        loadCalendars(),
      ]);
      if (cancelled) return;
      if (s.ok && s.body) setSettings(s.body.settings);
      else toast.error(tRef.current("settings.errorLoad"));
      if (tt.ok && tt.body) {
        setTaskTypes(tt.body.options);
        setTaskTypesMissing(tt.body.missing);
      } else {
        toast.error(tRef.current("settings.errorTaskTypes"));
      }
      setLoading(false);
    })();
    const handler = () => {
      void loadCalendars();
    };
    window.addEventListener("bh:google-status-changed", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("bh:google-status-changed", handler);
    };
  }, [loadCalendars]);

  const patchSettings = useCallback(
    async (
      patch: Partial<
        Pick<
          UserSettings,
          | "timezone"
          | "master_calendar_id"
          | "task_type_windows"
          | "timeblock_horizon_days"
          | "workday_start_hour"
          | "workday_end_hour"
          | "default_tab"
        >
      >,
    ) => {
      const snapshot = settings;
      if (!snapshot) return;
      // Optimistic update.
      setSettings({ ...snapshot, ...patch });
      const res = await fetchJson<{ settings: UserSettings }>(ROUTES.api.profile.settings, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok || !res.body) {
        setSettings(snapshot);
        toast.error(t("settings.errorSave"));
        // eslint-disable-next-line no-console
        console.error("settings_patch_failed", res.error);
        return;
      }
      setSettings(res.body.settings);
      toast.success(t("settings.saved"));
    },
    [settings, t],
  );

  const [zoneInput, setZoneInput] = useState("");
  useEffect(() => {
    if (settings) setZoneInput(settings.timezone);
  }, [settings?.timezone]);

  const handleZoneSave = () => {
    const tz = zoneInput.trim();
    if (!tz || tz === settings?.timezone) return;
    void patchSettings({ timezone: tz });
  };

  const handleCalendarPick = (id: string) => {
    void patchSettings({ master_calendar_id: id });
  };

  const handleHorizonPick = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (!Number.isInteger(n) || n < 1 || n > 7) return;
    void patchSettings({ timeblock_horizon_days: n });
  };

  const handleDefaultTabPick = (href: string) => {
    void patchSettings({ default_tab: href });
  };

  // Local workday-window state so an invalid edit (start >= end) shows inline
  // and is not persisted, mirroring the task-type-windows editor.
  const [workdayStart, setWorkdayStart] = useState(9);
  const [workdayEnd, setWorkdayEnd] = useState(18);
  useEffect(() => {
    if (settings) {
      setWorkdayStart(settings.workday_start_hour);
      setWorkdayEnd(settings.workday_end_hour);
    }
  }, [settings?.workday_start_hour, settings?.workday_end_hour]);

  const handleWorkdayChange = (field: "start" | "end", raw: string) => {
    const hour = clampHour(raw);
    if (hour === null) return;
    const nextStart = field === "start" ? hour : workdayStart;
    const nextEnd = field === "end" ? hour : workdayEnd;
    setWorkdayStart(nextStart);
    setWorkdayEnd(nextEnd);
    // Only PATCH when the window is valid; invalid shows the inline error.
    if (nextStart >= nextEnd) return;
    void patchSettings({ workday_start_hour: nextStart, workday_end_hour: nextEnd });
  };
  const workdayInvalid = workdayStart >= workdayEnd;

  const handleWindowChange = (
    index: number,
    field: "start_hour" | "end_hour",
    raw: string,
  ) => {
    if (!settings) return;
    const hour = clampHour(raw);
    if (hour === null) return;
    const existing = settings.task_type_windows[index];
    if (!existing) return;
    const next: TaskTypeWindow = { ...existing, [field]: hour };
    const updated = settings.task_type_windows.map((w, i) => (i === index ? next : w));
    // Update visually regardless; only PATCH when the row is valid (start < end).
    if (next.start_hour >= next.end_hour) {
      setSettings({ ...settings, task_type_windows: updated });
      return;
    }
    void patchSettings({ task_type_windows: updated });
  };

  const handleAddWindow = (taskType: string) => {
    if (!settings) return;
    const updated = [
      ...settings.task_type_windows,
      { task_type: taskType, start_hour: 9, end_hour: 17 } satisfies TaskTypeWindow,
    ];
    void patchSettings({ task_type_windows: updated });
  };

  const handleRemoveWindow = (index: number) => {
    if (!settings) return;
    const updated = settings.task_type_windows.filter((_, i) => i !== index);
    void patchSettings({ task_type_windows: updated });
  };

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-foreground">{t("settings.title")}</h2>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("settings.loading")}</p>
      ) : !settings ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("settings.errorLoad")}</p>
      ) : (
        <div className="mt-4 grid items-start gap-4 sm:grid-cols-2">
          {/* Timezone */}
          <SubsectionCard
            titleKey="settings.tz.title"
            descriptionKey="settings.tz.description"
            t={t}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                list="bh-tz-list"
                value={zoneInput}
                onChange={(e) => setZoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleZoneSave();
                  }
                }}
                placeholder={t("settings.tz.placeholder")}
                className="w-full min-w-0 flex-1 font-mono sm:w-72 sm:flex-none"
              />
              <datalist id="bh-tz-list">
                {COMMON_TIMEZONES.map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
              <Button
                size="sm"
                onClick={handleZoneSave}
                disabled={!zoneInput.trim() || zoneInput.trim() === settings.timezone}
              >
                {t("settings.tz.save")}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("settings.tz.currentValue")}: <span className="font-mono">{settings.timezone}</span>
            </p>
          </SubsectionCard>

          {/* Master Calendar */}
          <SubsectionCard
            titleKey="settings.cal.title"
            descriptionKey="settings.cal.description"
            t={t}
          >
            {googleConnected === null ? (
              <p className="text-sm text-muted-foreground">{t("settings.cal.loading")}</p>
            ) : googleConnected === false ? (
              <p className="text-sm text-muted-foreground">{t("settings.cal.notConnected")}</p>
            ) : !calendars ? (
              <p className="text-sm text-muted-foreground">{t("settings.cal.loading")}</p>
            ) : calendars.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("settings.cal.empty")}</p>
            ) : (
              <Select
                value={settings.master_calendar_id ?? undefined}
                onValueChange={handleCalendarPick}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("settings.cal.title")} />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.primary ? `${c.summary} (${t("settings.cal.primary")})` : c.summary}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </SubsectionCard>

          {/* Time-block horizon */}
          <SubsectionCard
            titleKey="settings.horizon.title"
            descriptionKey="settings.horizon.description"
            t={t}
          >
            <Select
              value={String(settings.timeblock_horizon_days)}
              onValueChange={handleHorizonPick}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORIZON_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {t("settings.horizon.days").replace("{count}", String(n))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SubsectionCard>

          {/* Default workday window */}
          <SubsectionCard
            titleKey="settings.workday.title"
            descriptionKey="settings.workday.description"
            t={t}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={23}
                value={workdayStart}
                onChange={(e) => handleWorkdayChange("start", e.target.value)}
                className="w-20 font-mono"
                aria-label={t("settings.workday.start")}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                min={0}
                max={23}
                value={workdayEnd}
                onChange={(e) => handleWorkdayChange("end", e.target.value)}
                className="w-20 font-mono"
                aria-label={t("settings.workday.end")}
              />
              {workdayInvalid ? (
                <span className="text-xs text-destructive">{t("settings.workday.invalid")}</span>
              ) : null}
            </div>
          </SubsectionCard>

          {/* Default tab on app open */}
          <SubsectionCard
            titleKey="settings.defaultTab.title"
            descriptionKey="settings.defaultTab.description"
            t={t}
          >
            <Select value={settings.default_tab} onValueChange={handleDefaultTabPick}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAB_OPTIONS.map((tab) => (
                  <SelectItem key={tab.href} value={tab.href}>
                    {t(tab.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SubsectionCard>

          {/* Task Type Windows — collapsed-by-default accordion (CategorySection pattern) */}
          <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm sm:col-span-2">
            <button
              type="button"
              onClick={toggleWindows}
              aria-expanded={windowsOpen}
              aria-label={
                windowsOpen ? t("settings.windows.collapse") : t("settings.windows.expand")
              }
              className="flex w-full items-start gap-2 text-left"
            >
              {windowsOpen ? (
                <ChevronDown size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronRight size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {t("settings.windows.title")}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t("settings.windows.description")}
                </span>
              </span>
            </button>
            {windowsOpen ? (
              <div className="mt-3">
                {taskTypesMissing ? (
              <p className="text-sm text-muted-foreground">{t("settings.windows.missing")}</p>
            ) : !taskTypes ? (
              <p className="text-sm text-muted-foreground">{t("settings.windows.loading")}</p>
            ) : taskTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("settings.windows.noOptions")}</p>
            ) : (
              <ul className="space-y-4">
                {taskTypes.map((opt) => {
                  const grouped = groupWindowsByTaskType(settings.task_type_windows);
                  const rows = grouped.get(opt.name) ?? [];
                  return (
                    <li key={opt.id} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-foreground">{opt.name}</p>
                      <div className="mt-2 space-y-2">
                        {rows.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {t("settings.windows.empty")}
                          </p>
                        ) : (
                          rows.map(({ window: w, index }) => {
                            const invalid = w.start_hour >= w.end_hour;
                            return (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  max={23}
                                  value={w.start_hour}
                                  onChange={(e) =>
                                    handleWindowChange(index, "start_hour", e.target.value)
                                  }
                                  className="w-20 font-mono"
                                  aria-label={t("settings.windows.col.start")}
                                />
                                <span className="text-muted-foreground">–</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={23}
                                  value={w.end_hour}
                                  onChange={(e) =>
                                    handleWindowChange(index, "end_hour", e.target.value)
                                  }
                                  className="w-20 font-mono"
                                  aria-label={t("settings.windows.col.end")}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWindow(index)}
                                  aria-label={t("settings.windows.remove")}
                                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                >
                                  <X className="size-3.5" />
                                </button>
                                {invalid ? (
                                  <span className="text-xs text-destructive">
                                    {t("settings.windows.invalid")}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddWindow(opt.name)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Plus className="size-3" />
                          {t("settings.windows.add")}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function SubsectionCard({
  titleKey,
  descriptionKey,
  t,
  children,
}: {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  t: (key: TranslationKey) => string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{t(descriptionKey)}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
