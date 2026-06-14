// Login whitelist for the Google-login fallback to the app-wide password gate.
//
// Solo app: exactly one Google account may sign in. The list is intentionally a
// plain array so it can be extended later without code changes elsewhere — the
// whitelist check (isEmailAllowed) is the single gate, used ONLY server-side in
// the Google login callback. Never hardcode a login email anywhere else.

// Emails are stored lowercase; the helper normalises the incoming address so a
// differently-cased Google email still matches.
export const ALLOWED_LOGIN_EMAILS: readonly string[] = ["mlange1998@gmail.com"];

export function isEmailAllowed(email: string): boolean {
  return ALLOWED_LOGIN_EMAILS.includes(email.trim().toLowerCase());
}

// Short-lived, httpOnly cookie that mirrors the OAuth `state` value between the
// login-start redirect and the callback (CSRF protection). Single-use: the
// callback deletes it after reading. Not a route, not user-facing.
export const LOGIN_STATE_COOKIE = "bh_login_state";
