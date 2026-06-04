"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";

import { customerForgotPasswordAction, type CustomerAuthState } from "@/actions/customer-auth";
import {
  marketplaceAuthError,
  marketplaceAuthInput,
  marketplaceAuthLabel,
  marketplaceAuthLink,
  marketplaceAuthSuccess,
  marketplaceSignInCta,
} from "@/components/marketplace-home/auth/marketplace-auth-tokens";

type Props = {
  onBackToSignIn: () => void;
};

export function ForgotPanel({ onBackToSignIn }: Props) {
  const [state, formAction] = useFormState(customerForgotPasswordAction, null as CustomerAuthState | null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const showSuccess = state?.ok === true;

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">Επαναφορά κωδικού</h2>
      <p className="mt-1 text-sm text-slate-600">Θα σου στείλουμε link επαναφοράς στο email σου.</p>

      {showSuccess ? (
        <div className="mt-6 space-y-4">
          <div className={marketplaceAuthSuccess}>{state.message}</div>
          <button type="button" onClick={onBackToSignIn} className={`w-full ${marketplaceSignInCta}`}>
            Επιστροφή στη σύνδεση
          </button>
        </div>
      ) : (
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

          <button type="submit" className={`w-full ${marketplaceSignInCta}`}>
            Αποστολή link επαναφοράς
          </button>

          <div className="text-center sm:text-left">
            <button type="button" onClick={onBackToSignIn} className={marketplaceAuthLink}>
              Επιστροφή στη σύνδεση
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
