import { DailyDigest } from "./_components/DailyDigest";
import { TimeBlockSuggestions } from "./_components/TimeBlockSuggestions";

export const dynamic = "force-dynamic";

export default function DigestPage() {
  return (
    <>
      <DailyDigest />
      <TimeBlockSuggestions />
    </>
  );
}
