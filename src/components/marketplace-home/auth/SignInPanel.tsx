"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";

import { customerSignInAction, type CustomerAuthState } from "@/actions/customer-auth";
import {
  marketplaceAuthError,
  marketplaceAuthInput,
  marketplaceAuthLabel,
  marketplaceAuthLink,
  marketplaceSignInCta,
} from "@/components/marketplace-home/auth/marketplace-auth-tokens";

type Props = {
  onSuccess: () => void;
  onForgot: () => void;
  onSignUp: () => void;
};

export function SignInPanel({ onSuccess, onForgot, onSignUp }: Props) {
  const [state, formAction] = useFormState(customerSignInAction, null as CustomerAuthState | null);
  const emailRef = useRef<HTMLInputElement>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state?.ok && !handledRef.current) {
      handledRef.current = true;
      onSuccess();
    }
    if (!state?.ok) {
      handledRef.current = false;
    }
  }, [state, onSuccess]);

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">Σύνδεση</h2>
      <p className="mt-1 text-sm text-slate-600">Συνδέσου για να διαχειρίζεσαι τον λογαριασμό σου.</p>

      <form action={formAction} className="mt-6 space-y-4">
        {state && !state.ok ? <div className={marketplaceAuthError}>{state.message}</div> : null}

        <label className={marketplaceAuthLabel}>
          Email
          <input
            ref={emailRef}
            name="email"
            type="email"
            autoComplete="email"
            required
            className={`mt-1.5 ${marketplaceAuthInput}`}
          />
        </label>

        <label className={marketplaceAuthLabel}>
          Κωδικός
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={`mt-1.5 ${marketplaceAuthInput}`}
          />
        </label>

        <button type="submit" className={`w-full ${marketplaceSignInCta}`}>
          Σύνδεση
        </button>

        <div className="flex flex-col gap-2 pt-1 text-center sm:flex-row sm:justify-between sm:text-left">
          <button type="button" onClick={onForgot} className={marketplaceAuthLink}>
            Ξέχασα τον κωδικό μου
          </button>
          <button type="button" onClick={onSignUp} className={marketplaceAuthLink}>
            Εγγραφή
          </button>
        </div>
      </form>
    </div>
  );
}
