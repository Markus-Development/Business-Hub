import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google";
import { ROUTES } from "@/constants/routes";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    const url = new URL(ROUTES.pages.googleError, origin);
    url.searchParams.set("reason", error);
    return NextResponse.redirect(url);
  }
  if (!code) {
    const url = new URL(ROUTES.pages.googleError, origin);
    url.searchParams.set("reason", "missing_code");
    return NextResponse.redirect(url);
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(new URL(ROUTES.pages.googleConnected, origin));
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    const url = new URL(ROUTES.pages.googleError, origin);
    url.searchParams.set("reason", reason);
    return NextResponse.redirect(url);
  }
}
