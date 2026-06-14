import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { google } from "googleapis";
import { ROUTES } from "@/constants/routes";
import { LOGIN_STATE_COOKIE } from "@/constants/auth";

export const runtime = "nodejs";

// Google-LOGIN start endpoint. Deliberately independent from the calendar OAuth
// in lib/google.ts: its own redirect URI (GOOGLE_LOGIN_REDIRECT_URI), only the
// identity scopes (openid email profile), and NO access_type=offline /
// prompt=consent (we never want a refresh token here and never persist any
// token — the callback reads the verified email once and discards everything).
function loginErrorUrl(base: string): URL {
  const url = new URL(ROUTES.pages.login, base);
  url.searchParams.set("error", "auth");
  return url;
}

export async function GET(req: Request) {
  const { origin: requestOrigin } = new URL(req.url);

  // Behind the Railway reverse proxy, new URL(req.url).origin resolves to the
  // internal bind address; derive the public base from the redirect URI.
  let redirectBase = requestOrigin;
  try {
    if (process.env.GOOGLE_LOGIN_REDIRECT_URI) {
      redirectBase = new URL(process.env.GOOGLE_LOGIN_REDIRECT_URI).origin;
    }
  } catch {
    redirectBase = requestOrigin;
  }

  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_LOGIN_REDIRECT_URI;
  if (!id || !secret || !redirect) {
    return NextResponse.redirect(loginErrorUrl(redirectBase));
  }

  const client = new google.auth.OAuth2(id, secret, redirect);
  const state = crypto.randomBytes(32).toString("hex");
  const authUrl = client.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    state,
  });

  // Mirror the state in a short-lived httpOnly cookie for CSRF validation in the
  // callback. Set on the cookie store so it rides along with the redirect.
  const store = await cookies();
  store.set(LOGIN_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — only needs to survive the round trip.
  });

  return NextResponse.redirect(authUrl);
}
