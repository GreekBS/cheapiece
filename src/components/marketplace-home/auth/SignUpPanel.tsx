"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";

import { customerSignUpAction, type CustomerAuthState } from "@/actions/customer-auth";
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
  onSignedUpAndSession: () => void;
};

export function SignUpPanel({ onBackToSignIn, onSignedUpAndSession }: Props) {
  const [state, formAction] = useFormState(customerSignUpAction, null as CustomerAuthState | null);
  const nameRef = useRef<HTMLInputElement>(null);
  const sessionHandledRef = useRef(false);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state?.ok && state.message?.includes("δημιουργήθηκε.") && !state.message.includes("Έλεγξε")) {
      if (!sessionHandledRef.current) {
        sessionHandledRef.current = true;
        onSignedUpAndSession();
      }
    } else {
      sessionHandledRef.current = false;
    }
  }, [state, onSignedUpAndSession]);

  const showConfirmation = state?.ok && state.message?.includes("Έλεγξε");

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">Εγγραφή</h2>
      <p className="mt-1 text-sm text-slate-600">Δημιούργησε λογαριασμό για το marketplace.</p>

      {showConfirmation ? (
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
            Όνομα
            <input
              ref={nameRef}
              name="displayName"
              type="text"
              autoComplete="name"
              required
              className={`mt-1.5 ${marketplaceAuthInput}`}
            />
            {state && !state.ok && state.fieldErrors?.displayName ? (
              <span className="mt-1 block text-xs text-red-700">{state.fieldErrors.displayName}</span>
            ) : null}
          </label>

          <label className={marketplaceAuthLabel}>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`mt-1.5 ${marketplaceAuthInput}`}
            />
            {state && !state.ok && state.fieldErrors?.email ? (
              <span className="mt-1 block text-xs text-red-700">{state.fieldErrors.email}</span>
            ) : null}
          </label>

          <label className={marketplaceAuthLabel}>
            Κωδικός
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className={`mt-1.5 ${marketplaceAuthInput}`}
            />
            {state && !state.ok && state.fieldErrors?.password ? (
              <span className="mt-1 block text-xs text-red-700">{state.fieldErrors.password}</span>
            ) : null}
          </label>

          <label className={marketplaceAuthLabel}>
            Επιβεβαίωση κωδικού
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className={`mt-1.5 ${marketplaceAuthInput}`}
            />
            {state && !state.ok && state.fieldErrors?.confirmPassword ? (
              <span className="mt-1 block text-xs text-red-700">{state.fieldErrors.confirmPassword}</span>
            ) : null}
          </label>

          <button type="submit" className={`w-full ${marketplaceSignInCta}`}>
            Δημιουργία λογαριασμού
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
