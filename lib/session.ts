// Shared iron-session configuration for the app-wide password gate.
//
// This is the single source of truth for the session cookie shape and seal
// options. It is imported by BOTH the Edge middleware (middleware.ts) and the
// Node route handler (/api/auth/login) so the cookie sealed on login is the
// exact one the middleware unseals on every request. iron-session v8 seals via
// iron-webcrypto, which is Edge-runtime compatible.
//
// IMPORTANT: this file must stay free of any `server-only` / Node-only imports
// (e.g. lib/notion) so it can be bundled into the Edge middleware.

import type { SessionOptions } from "iron-session";

export type SessionData = {
  isLoggedIn: boolean;
};

// iron-session requires a password of at least 32 characters. SESSION_SECRET
// must therefore be >= 32 chars (see .env.local.example). The non-null
// assertion is intentional: a missing secret should fail loudly at startup
// rather than silently sealing with `undefined`.
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "bh_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // 30 days — solo app, long-lived session is acceptable.
    maxAge: 60 * 60 * 24 * 30,
  },
};
