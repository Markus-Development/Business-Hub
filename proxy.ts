import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { ROUTES } from "@/constants/routes";

// App-wide password gate. Every request is gated EXCEPT the exact paths below.
//
// Why these exceptions exist (do not gate them):
//  - /login + /api/auth/login: the gate would lock the user out of the gate.
//  - /api/auth/callback/google: Google calls this server-side during the OAuth
//    handshake; it carries no session cookie, so gating it breaks calendar auth.
//  - /api/auth/google/start + /api/auth/google/callback: the Google-LOGIN flow
//    (separate from calendar OAuth). Both run before a session exists, so gating
//    them would create a redirect loop back to /login.
//  - /api/calls/create: the external Call Miner skill posts here unauthenticated
//    in v1 (it has no session cookie). Re-evaluate when that endpoint gets its
//    own bearer token.
//
// Static assets (_next, favicon, public files) are excluded via the matcher.
const PUBLIC_PATHS = new Set<string>([
  ROUTES.pages.login,
  ROUTES.api.auth.login,
  ROUTES.api.auth.googleStart,
  ROUTES.api.auth.googleCallback,
  ROUTES.api.google.callback,
  ROUTES.api.calls.create,
]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  if (!session.isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = ROUTES.pages.login;
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // Run on everything except Next internals and the favicon. The fine-grained
  // public-path allowlist above handles the auth/OAuth/call-miner exceptions.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
