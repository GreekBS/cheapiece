import "server-only";

import type { AuthError, PostgrestError, SupabaseClient } from "@supabase/supabase-js";

/**
 * TEMPORARY: enable with DEBUG_PROVISION_OFFER=1 in .env.local (remove after root-cause found).
 * Logs to server terminal (npm run dev). Does not change RPC/RLS/migrations.
 */
export function isProvisionOfferDebugEnabled(): boolean {
  const v = process.env.DEBUG_PROVISION_OFFER?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export type ProvisionOfferDebugContext = {
  requestId: string;
  userId?: string;
  resolvedProductId?: string;
  caller: string;
};

function logPayload(payload: Record<string, unknown>): void {
  // eslint-disable-next-line no-console -- debug-only instrumentation
  console.error(
    JSON.stringify(
      {
        ts: new Date().toISOString(),
        domain: "provision_offer_debug",
        ...payload,
      },
      null,
      2,
    ),
  );
}

export async function logProvisionOfferSessionContext(
  supabase: SupabaseClient,
  ctx: ProvisionOfferDebugContext,
): Promise<void> {
  if (!isProvisionOfferDebugEnabled()) {
    return;
  }

  const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] =
    await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);

  logPayload({
    event: "session_context",
    ...ctx,
    session: {
      exists: !!sessionData.session,
      hasAccessToken: !!sessionData.session?.access_token,
      userId: sessionData.session?.user?.id ?? null,
      expiresAt: sessionData.session?.expires_at ?? null,
      error: sessionError?.message ?? null,
    },
    getUser: {
      userId: userData.user?.id ?? null,
      error: userError?.message ?? null,
    },
  });
}

export function logProvisionOfferPostgrestError(
  error: PostgrestError,
  ctx: ProvisionOfferDebugContext,
  extras?: { mappedCode?: string; data?: unknown },
): void {
  if (!isProvisionOfferDebugEnabled()) {
    return;
  }

  logPayload({
    event: "postgrest_rpc_error",
    ...ctx,
    mappedCode: extras?.mappedCode ?? null,
    rpcData: extras?.data ?? null,
    postgrest: {
      code: error.code ?? null,
      message: error.message,
      details: error.details ?? null,
      hint: error.hint ?? null,
    },
    postgrestFull: error,
  });
}

export function logProvisionOfferDebugEvent(
  event: string,
  ctx: ProvisionOfferDebugContext,
  fields?: Record<string, unknown>,
): void {
  if (!isProvisionOfferDebugEnabled()) {
    return;
  }

  logPayload({
    event,
    ...ctx,
    ...fields,
  });
}

export function formatProvisionOfferDebugUserMessage(
  mappedMessage: string,
  error: PostgrestError,
  mappedCode: string,
): string {
  if (!isProvisionOfferDebugEnabled()) {
    return mappedMessage;
  }

  const parts = [
    mappedMessage,
    `[DEBUG provision] mapped=${mappedCode}`,
    `pg.code=${error.code ?? "n/a"}`,
    `pg.message=${error.message}`,
  ];
  if (error.details) {
    parts.push(`pg.details=${error.details}`);
  }
  if (error.hint) {
    parts.push(`pg.hint=${error.hint}`);
  }
  return parts.join(" | ");
}

export function formatProvisionOfferDebugSkipMessage(skipReason: string, data: unknown): string {
  if (!isProvisionOfferDebugEnabled()) {
    return skipReason;
  }

  return `${skipReason} | [DEBUG provision] rpc returned null/undefined (data=${JSON.stringify(data)})`;
}

export function logProvisionOfferAuthError(error: AuthError, ctx: ProvisionOfferDebugContext): void {
  if (!isProvisionOfferDebugEnabled()) {
    return;
  }

  logPayload({
    event: "auth_error",
    ...ctx,
    auth: {
      name: error.name,
      message: error.message,
      status: error.status ?? null,
    },
  });
}
