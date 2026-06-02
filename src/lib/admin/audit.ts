import "server-only";

/**
 * Admin audit hook — replace with persistent audit store later.
 * Every service_role mutation should call this.
 */
export function auditAdminAction(action: string, meta: Record<string, unknown>): void {
  console.info("[admin-audit]", { action, ...meta, at: new Date().toISOString() });
}
