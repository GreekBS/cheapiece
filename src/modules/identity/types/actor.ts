export type PlatformRole = "user" | "platform_admin";

/**
 * Immutable per-request actor — resolved from session + profiles; no business rules.
 */
export type Actor = {
  userId: string;
  platformRole: PlatformRole;
};
