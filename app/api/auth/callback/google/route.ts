import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google";
import { ROUTES } from "@/constants/routes";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams, origin: requestOrigin } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Behind the Railway reverse proxy, new URL(req.url).origin resolves to the
  // internal bind address (http://0.0.0.0:8080), so redirecting against it sends
  // the browser to an unreachable host. GOOGLE_REDIRECT_URI carries the public
  // origin and is mandatory for the OAuth flow, so derive the redirect base from
  // it; fall back to the request origin for local dev where it may be unset.
  let redirectBase = requestOrigin;
  try {
    if (process.env.GOOGLE_REDIRECT_URI) {
      redirectBase = new URL(process.env.GOOGLE_REDIRECT_URI).origin;
    }
  } catch {
    redirectBase = requestOrigin;
  }

  if (error) {
    const url = new URL(ROUTES.pages.googleError, redirectBase);
    url.searchParams.set("reason", error);
    return NextResponse.redirect(url);
  }
  if (!code) {
    const url = new URL(ROUTES.pages.googleError, redirectBase);
    url.searchParams.set("reason", "missing_code");
    return NextResponse.redirect(url);
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(new URL(ROUTES.pages.googleConnected, redirectBase));
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    const url = new URL(ROUTES.pages.googleError, redirectBase);
    url.searchParams.set("reason", reason);
    return NextResponse.redirect(url);
  }
}
