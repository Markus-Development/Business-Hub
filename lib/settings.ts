import "server-only";
import { supabaseServer } from "./supabase-server";
import { TABLES } from "@/constants/tables";

const USER_KEY = "markus";
const DEFAULT_TIMEZONE = "Asia/Dubai";

export type TaskTypeWindow = {
  task_type: string;
  start_hour: number;
  end_hour: number;
};

export type UserSettings = {
  user_key: string;
  timezone: string;
  master_calendar_id: string | null;
  task_type_windows: TaskTypeWindow[];
  updated_at: string;
};

export type UserSettingsPatch = Partial<{
  timezone: string;
  master_calendar_id: string | null;
  task_type_windows: TaskTypeWindow[];
}>;

const COLS = "user_key, timezone, master_calendar_id, task_type_windows, updated_at";

function defaults(): UserSettings {
  return {
    user_key: USER_KEY,
    timezone: DEFAULT_TIMEZONE,
    master_calendar_id: null,
    task_type_windows: [],
    updated_at: new Date(0).toISOString(),
  };
}

// Lazily resolved set of valid IANA zones, cached for the lifetime of the process.
let zoneSet: Set<string> | null = null;
function validIanaZone(tz: string): boolean {
  if (typeof tz !== "string" || tz.length === 0) return false;
  if (!zoneSet) {
    const supported = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (typeof supported === "function") {
      zoneSet = new Set(supported("timeZone"));
    }
  }
  if (zoneSet) return zoneSet.has(tz);
  // Fallback: try to construct a formatter; throws on invalid zones.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function validateWindow(w: unknown): asserts w is TaskTypeWindow {
  if (!w || typeof w !== "object") throw new Error("invalid_window_shape");
  const obj = w as Record<string, unknown>;
  if (typeof obj.task_type !== "string" || obj.task_type.length === 0) {
    throw new Error("invalid_task_type");
  }
  if (typeof obj.start_hour !== "number" || !Number.isInteger(obj.start_hour)) {
    throw new Error("invalid_start_hour");
  }
  if (typeof obj.end_hour !== "number" || !Number.isInteger(obj.end_hour)) {
    throw new Error("invalid_end_hour");
  }
  if (obj.start_hour < 0 || obj.start_hour > 23) throw new Error("start_hour_out_of_range");
  if (obj.end_hour < 0 || obj.end_hour > 23) throw new Error("end_hour_out_of_range");
  if (obj.start_hour >= obj.end_hour) throw new Error("start_not_before_end");
}

function normalizeRow(row: Record<string, unknown> | null): UserSettings {
  if (!row) return defaults();
  const windows = Array.isArray(row.task_type_windows)
    ? (row.task_type_windows as TaskTypeWindow[])
    : [];
  return {
    user_key: typeof row.user_key === "string" ? row.user_key : USER_KEY,
    timezone: typeof row.timezone === "string" ? row.timezone : DEFAULT_TIMEZONE,
    master_calendar_id:
      typeof row.master_calendar_id === "string" ? row.master_calendar_id : null,
    task_type_windows: windows,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date(0).toISOString(),
  };
}

export async function getUserSettings(): Promise<UserSettings> {
  const db = supabaseServer();
  const { data, error } = await db
    .from(TABLES.USER_SETTINGS)
    .select(COLS)
    .eq("user_key", USER_KEY)
    .maybeSingle();
  if (error) {
    // Table missing (pre-migration) or other read error: fall back to defaults so the UI
    // can still render without a crash. The route handler may surface its own error path.
    return defaults();
  }
  return normalizeRow(data as Record<string, unknown> | null);
}

export async function updateUserSettings(patch: UserSettingsPatch): Promise<UserSettings> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (Object.prototype.hasOwnProperty.call(patch, "timezone")) {
    const tz = patch.timezone;
    if (typeof tz !== "string" || !validIanaZone(tz)) throw new Error("invalid_timezone");
    update.timezone = tz;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "master_calendar_id")) {
    const cal = patch.master_calendar_id;
    if (cal !== null && (typeof cal !== "string" || cal.length === 0)) {
      throw new Error("invalid_master_calendar_id");
    }
    update.master_calendar_id = cal;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "task_type_windows")) {
    const windows = patch.task_type_windows;
    if (!Array.isArray(windows)) throw new Error("invalid_task_type_windows");
    for (const w of windows) validateWindow(w);
    update.task_type_windows = windows;
  }

  const db = supabaseServer();
  const { data, error } = await db
    .from(TABLES.USER_SETTINGS)
    .upsert({ user_key: USER_KEY, ...update }, { onConflict: "user_key" })
    .select(COLS)
    .single();
  if (error) throw new Error(`Failed to update settings: ${error.message}`);
  return normalizeRow(data as Record<string, unknown>);
}
