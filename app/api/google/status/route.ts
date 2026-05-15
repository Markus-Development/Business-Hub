import { NextResponse } from "next/server";
import { isGoogleConnected } from "@/lib/google";

export const runtime = "nodejs";

export async function GET() {
  try {
    const connected = await isGoogleConnected();
    return NextResponse.json({ connected });
  } catch {
    // If the lookup fails (e.g. table missing before first migration), treat as not connected.
    return NextResponse.json({ connected: false });
  }
}
