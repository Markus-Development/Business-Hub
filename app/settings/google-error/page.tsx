import { GoogleErrorClient } from "./_client";

export default async function GoogleErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "unknown_error";
  return <GoogleErrorClient reason={reason} />;
}
