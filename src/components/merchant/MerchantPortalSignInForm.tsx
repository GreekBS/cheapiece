"use client";

import { useFormState } from "react-dom";

import { signInWithPasswordAction, type AuthFormState } from "@/actions/auth";
import { dsInput, dsLabel, dsPrimaryButtonLg, dsMuted } from "@/components/ui/merchant-ds";

type Props = {
  /** Opaque hint from `?returnUrl=`; final path is chosen only in `pickPostSignInRedirect` after sign-in. */
  returnUrl?: string | null;
};

export function MerchantPortalSignInForm({ returnUrl }: Props = {}) {
  const [state, formAction] = useFormState(signInWithPasswordAction, null as AuthFormState | null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value="/merchant" />
      {returnUrl ? <input type="hidden" name="returnUrl" value={returnUrl} /> : null}
      {state && !state.ok ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.message}</div>
      ) : null}

      <label className={dsLabel}>
        Email
        <input name="email" type="email" autoComplete="email" required className={`mt-1 ${dsInput}`} />
      </label>

      <label className={dsLabel}>
        Password
        <input name="password" type="password" autoComplete="current-password" required className={`mt-1 ${dsInput}`} />
      </label>

      <button type="submit" className={dsPrimaryButtonLg}>
        Sign in to merchant portal
      </button>

      <p className={`${dsMuted} text-xs`}>
        Need access? Contact your platform administrator to enable merchant permissions for your account.
      </p>
    </form>
  );
}
