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
