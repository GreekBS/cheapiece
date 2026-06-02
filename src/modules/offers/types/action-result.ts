/**
 * Domain-level action results (aligned with UI + server actions).
 * DB/RLS failures map here in the service layer only.
 */
export type OfferActionErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

export type OfferActionResult =
  | { ok: true }
  | { ok: false; code: OfferActionErrorCode; message: string };
