import "server-only";
import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { supabaseServer } from "./supabase-server";
import { TABLES } from "@/constants/tables";

const SCOPE = "https://www.googleapis.com/auth/calendar";
const USER_KEY = "markus";
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

type TokenRow = {
  user_key: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
};

export function getOAuthClient(): OAuth2Client {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_REDIRECT_URI;
  if (!id || !secret || !redirect) {
    throw new Error("Google OAuth env not configured (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)");
  }
  return new google.auth.OAuth2(id, secret, redirect);
}

export function getAuthUrl(): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
  });
}

async function readTokenRow(): Promise<TokenRow | null> {
  const db = supabaseServer();
  const { data, error } = await db
    .from(TABLES.GOOGLE_OAUTH_TOKENS)
    .select("user_key, refresh_token, access_token, access_token_expires_at")
    .eq("user_key", USER_KEY)
    .maybeSingle();
  if (error) throw new Error(`Failed to read Google tokens: ${error.message}`);
  return (data as TokenRow | null) ?? null;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<{ refreshToken: string; accessToken: string; expiresAt: string }> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh_token returned — Google reuses prior consent. Revoke this app at https://myaccount.google.com/permissions and retry.",
    );
  }
  if (!tokens.access_token) {
    throw new Error("No access_token returned from Google");
  }
  const expiresAt = new Date(tokens.expiry_date ?? Date.now() + 60 * 60 * 1000).toISOString();
  const db = supabaseServer();
  const { error } = await db.from(TABLES.GOOGLE_OAUTH_TOKENS).upsert(
    {
      user_key: USER_KEY,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      access_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_key" },
  );
  if (error) throw new Error(`Failed to persist Google tokens: ${error.message}`);
  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiresAt,
  };
}

export async function getAccessToken(): Promise<string> {
  const row = await readTokenRow();
  if (!row || !row.refresh_token) {
    throw new Error("Google not connected");
  }
  const expiresMs = row.access_token_expires_at
    ? Date.parse(row.access_token_expires_at)
    : 0;
  const stale = !row.access_token || expiresMs - Date.now() < REFRESH_BUFFER_MS;
  if (!stale && row.access_token) return row.access_token;

  const client = getOAuthClient();
  client.setCredentials({ refresh_token: row.refresh_token });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Google refresh returned no access_token");
  }
  const newExpiresAt = new Date(
    credentials.expiry_date ?? Date.now() + 60 * 60 * 1000,
  ).toISOString();

  const db = supabaseServer();
  const { error } = await db
    .from(TABLES.GOOGLE_OAUTH_TOKENS)
    .update({
      access_token: credentials.access_token,
      access_token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_key", USER_KEY);
  if (error) {
    throw new Error(`Failed to persist refreshed access token: ${error.message}`);
  }
  return credentials.access_token;
}

export async function getAuthorizedCalendarClient() {
  const accessToken = await getAccessToken();
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth: client });
}

export type GoogleCalendar = { id: string; summary: string; primary: boolean };

export async function listCalendars(): Promise<GoogleCalendar[]> {
  const calendar = await getAuthorizedCalendarClient();
  const resp = await calendar.calendarList.list();
  const items = resp.data.items ?? [];
  return items
    .filter((c): c is { id: string; summary?: string | null; primary?: boolean | null } =>
      typeof c.id === "string" && c.id.length > 0,
    )
    .map((c) => ({
      id: c.id,
      summary: c.summary ?? c.id,
      primary: c.primary === true,
    }));
}

export type BusyInterval = { start: string; end: string };

export async function getPrimaryBusy(
  timeMin: string,
  timeMax: string,
  calendarId: string = "primary",
): Promise<BusyInterval[]> {
  const calendar = await getAuthorizedCalendarClient();
  const resp = await calendar.freebusy.query({
    requestBody: { timeMin, timeMax, items: [{ id: calendarId }] },
  });
  const busy = resp.data.calendars?.[calendarId]?.busy ?? [];
  return busy
    .filter((b): b is { start: string; end: string } => !!b.start && !!b.end)
    .map((b) => ({ start: b.start, end: b.end }));
}

export type CreatedEvent = { id: string; htmlLink: string | null };

export async function createBlock(
  summary: string,
  startIso: string,
  endIso: string,
  calendarId: string = "primary",
): Promise<CreatedEvent> {
  const calendar = await getAuthorizedCalendarClient();
  const resp = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      start: { dateTime: startIso },
      end: { dateTime: endIso },
    },
  });
  const id = resp.data.id;
  if (!id) throw new Error("Google Calendar insert returned no event id");
  return { id, htmlLink: resp.data.htmlLink ?? null };
}

export type CalendarEvent = {
  id: string;
  summary: string;
  description: string | null;
  start: string | null;
  end: string | null;
  htmlLink: string | null;
};

function readEventTime(slot: { dateTime?: string | null; date?: string | null } | undefined): string | null {
  if (!slot) return null;
  return slot.dateTime ?? slot.date ?? null;
}

export async function listEvents(
  calendarId: string,
  start: string,
  end: string,
): Promise<CalendarEvent[]> {
  const calendar = await getAuthorizedCalendarClient();
  const resp = await calendar.events.list({
    calendarId,
    timeMin: start,
    timeMax: end,
    singleEvents: true,
    orderBy: "startTime",
  });
  const items = resp.data.items ?? [];
  return items
    .filter((e): e is { id: string } & typeof e => typeof e.id === "string" && e.id.length > 0)
    .map((e) => ({
      id: e.id,
      summary: e.summary ?? "(no title)",
      description: e.description ?? null,
      start: readEventTime(e.start ?? undefined),
      end: readEventTime(e.end ?? undefined),
      htmlLink: e.htmlLink ?? null,
    }));
}

export type CreateEventPayload = {
  summary: string;
  description?: string;
  start: string;
  end: string;
  notionProjectId?: string;
};

export async function createEvent(
  calendarId: string,
  payload: CreateEventPayload,
): Promise<CreatedEvent> {
  const calendar = await getAuthorizedCalendarClient();
  const requestBody: Record<string, unknown> = {
    summary: payload.summary,
    start: { dateTime: payload.start },
    end: { dateTime: payload.end },
  };
  if (typeof payload.description === "string" && payload.description.length > 0) {
    requestBody.description = payload.description;
  }
  if (typeof payload.notionProjectId === "string" && payload.notionProjectId.length > 0) {
    requestBody.extendedProperties = {
      private: { notionProjectId: payload.notionProjectId },
    };
  }
  const resp = await calendar.events.insert({ calendarId, requestBody });
  const id = resp.data.id;
  if (!id) throw new Error("Google Calendar insert returned no event id");
  return { id, htmlLink: resp.data.htmlLink ?? null };
}

export type UpdateEventPatch = {
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
};

export async function updateEvent(
  calendarId: string,
  eventId: string,
  patch: UpdateEventPatch,
): Promise<CreatedEvent> {
  const calendar = await getAuthorizedCalendarClient();
  const requestBody: Record<string, unknown> = {};
  if (typeof patch.summary === "string") requestBody.summary = patch.summary;
  if (typeof patch.description === "string") requestBody.description = patch.description;
  if (typeof patch.start === "string") requestBody.start = { dateTime: patch.start };
  if (typeof patch.end === "string") requestBody.end = { dateTime: patch.end };
  const resp = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody,
  });
  const id = resp.data.id ?? eventId;
  return { id, htmlLink: resp.data.htmlLink ?? null };
}

export async function deleteEvent(calendarId: string, eventId: string): Promise<void> {
  const calendar = await getAuthorizedCalendarClient();
  await calendar.events.delete({ calendarId, eventId });
}

export async function isGoogleConnected(): Promise<boolean> {
  const row = await readTokenRow();
  return !!row?.refresh_token;
}

export async function disconnectGoogle(): Promise<void> {
  const db = supabaseServer();
  const { error } = await db
    .from(TABLES.GOOGLE_OAUTH_TOKENS)
    .delete()
    .eq("user_key", USER_KEY);
  if (error) throw new Error(`Failed to disconnect Google: ${error.message}`);
}
