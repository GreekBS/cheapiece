import { headers } from "next/headers";

const MAX_RETURN_PATH_LEN = 2048;

/**
 * Internal-only: validates post-login redirect targets (same-origin relative paths).
 * All successful post-auth navigation must be decided through `pickPostSignInRedirect`.
 */
function sanitizeInternalReturnPath(raw: string): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  let s = raw.trim();
  if (s.length > MAX_RETURN_PATH_LEN) {
    s = s.slice(0, MAX_RETURN_PATH_LEN);
  }
  if (!s.startsWith("/")) {
    return null;
  }
  if (s.startsWith("//")) {
    return null;
  }
  if (s.includes("://")) {
    return null;
  }
  if (s.includes("\\")) {
    return null;
  }
  if (s.includes("\0")) {
    return null;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(s)) {
    return null;
  }
  return s;
}

export type PickPostSignInRedirectInput = {
  returnUrl?: string | null;
  redirectTo?: string | null;
  /** Must resolve to a safe internal path; defaults to `/merchant` (guest gateway). */
  fallback?: string | null;
};

/**
 * Single authority for the browser destination after successful password sign-in.
 * Priority: returnUrl → redirectTo → fallback (default `/merchant` guest gateway).
 * Authenticated hub resolution happens in `signInWithPasswordAction` when dest is `/merchant`.
 */
export function pickPostSignInRedirect(input: PickPostSignInRedirectInput): string {
  const fallbackRaw = String(input.fallback ?? "/merchant").trim();
  const fallback = sanitizeInternalReturnPath(fallbackRaw) ?? "/merchant";

  const fromReturn = sanitizeInternalReturnPath(String(input.returnUrl ?? "").trim());
  if (fromReturn) {
    return fromReturn;
  }
  const fromRedirect = sanitizeInternalReturnPath(String(input.redirectTo ?? "").trim());
  if (fromRedirect) {
    return fromRedirect;
  }
  return fallback;
}

/**
 * Where to send an unauthenticated user so they can sign in at `/merchant`.
 * Passes through optional `x-return-path` as an opaque hint (not validated here);
 * `pickPostSignInRedirect` validates before any post-login redirect.
 * Auth correctness does not depend on this header being present.
 */
export function buildMerchantHubUnauthenticatedRedirect(): string {
  let raw = (headers().get("x-return-path") ?? "").trim();
  if (!raw) {
    return "/merchant";
  }
  if (raw.length > MAX_RETURN_PATH_LEN) {
    raw = raw.slice(0, MAX_RETURN_PATH_LEN);
  }
  return `/merchant?returnUrl=${encodeURIComponent(raw)}`;
}
