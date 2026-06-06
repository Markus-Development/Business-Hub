import { LoginForm } from "./_components/LoginForm";

// Full-viewport, single-column login. `fixed inset-0` intentionally escapes the
// global min-w-[1280px] <main> wrapper in the root layout so the gate is usable
// on a phone as well as desktop.
export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background p-6">
      <LoginForm />
    </div>
  );
}
