import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { ROUTES } from "@/constants/routes";
import { isEmailAllowed, LOGIN_STATE_COOKIE } from "@/constants/auth";
import { getUserSettings } from "@/lib/settings";

export const runtime = "nodejs";

// Google-LOGIN callback. Strictly separate from the calendar OAuth callback
// (/api/auth/callback/google): this one verifies an identity, sets the session,
// and DISCARDS the tokens. No write to google_oauth_tokens, no refresh token.
function loginErrorUrl(base: string, kind: "auth" | "forbidden"): URL {
  const url = new URL(ROUTES.pages.login, base);
  url.searchParams.set("error", kind);
  return url;
}

export async function GET(req: Request) {
  const { searchParams, origin: requestOrigin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Public origin from the login redirect URI (Railway proxy hides the real one).
  let redirectBase = requestOrigin;
  try {
    if (process.env.GOOGLE_LOGIN_REDIRECT_URI) {
      redirectBase = new URL(process.env.GOOGLE_LOGIN_REDIRECT_URI).origin;
    }
  } catch {
    redirectBase = requestOrigin;
  }

  const store = await cookies();
  const expectedState = store.get(LOGIN_STATE_COOKIE)?.value;
  // Single-use: clear the state cookie no matter the outcome.
  store.delete(LOGIN_STATE_COOKIE);

  // CSRF: the round-trip state must match the cookie we set in /start.
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(loginErrorUrl(redirectBase, "auth"));
  }

  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_LOGIN_REDIRECT_URI;
  if (!id || !secret || !redirect) {
    return NextResponse.redirect(loginErrorUrl(redirectBase, "auth"));
  }

  try {
    const client = new google.auth.OAuth2(id, secret, redirect);
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) {
      return NextResponse.redirect(loginErrorUrl(redirectBase, "auth"));
    }

    // Verify the id_token signature + audience and read the identity claims.
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: id });
    const payload = ticket.getPayload();
    const email = payload?.email;
    const emailVerified = payload?.email_verified === true;
    // Tokens are intentionally NOT persisted — login only needs the email.

    if (!email || !emailVerified || !isEmailAllowed(email)) {
      return NextResponse.redirect(loginErrorUrl(redirectBase, "forbidden"));
    }

    const session = await getIronSession<SessionData>(store, sessionOptions);
    session.isLoggedIn = true;
    session.email = email.trim().toLowerCase();
    await session.save();

    // Land on the configured default tab; getUserSettings falls back to
    // /projects on any read error, so this never throws the login away.
    let dest: string = ROUTES.pages.projects;
    try {
      const settings = await getUserSettings();
      if (settings.default_tab) dest = settings.default_tab;
    } catch {
      dest = ROUTES.pages.projects;
    }
    return NextResponse.redirect(new URL(dest, redirectBase));
  } catch {
    return NextResponse.redirect(loginErrorUrl(redirectBase, "auth"));
  }
}
