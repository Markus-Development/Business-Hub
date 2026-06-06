import { CaptureForm } from "./_components/CaptureForm";

// Quick Capture is the one deliberately mobile-friendly surface (phone PWA for
// fast inbox capture). `fixed inset-0` escapes the global min-w-[1280px] <main>
// wrapper so it renders single-column and full-width on a narrow screen. This is
// scoped to /capture only — the rest of the hub stays desktop-first.
export default function CapturePage() {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <CaptureForm />
    </div>
  );
}
