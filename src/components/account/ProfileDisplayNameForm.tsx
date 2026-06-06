"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  updateCustomerDisplayNameAction,
  type CustomerProfileState,
} from "@/actions/customer-profile";
import {
  marketplaceAuthError,
  marketplaceAuthInput,
  marketplaceAuthLabel,
  marketplaceAuthMuted,
  marketplaceAuthSuccess,
} from "@/components/marketplace-home/auth/marketplace-auth-tokens";

type Props = {
  initialDisplayName: string;
  email: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Αποθήκευση..." : "Αποθήκευση"}
    </button>
  );
}

export function ProfileDisplayNameForm({ initialDisplayName, email }: Props) {
  const router = useRouter();
  const [state, formAction] = useFormState(
    updateCustomerDisplayNameAction,
    null as CustomerProfileState | null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      {state && !state.ok ? <div className={marketplaceAuthError}>{state.message}</div> : null}

      {state?.ok ? (
        <div className={marketplaceAuthSuccess} role="status">
          {state.message}
        </div>
      ) : null}

      {state?.ok && state.warning ? (
        <div
          className="rounded-2xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {state.warning}
        </div>
      ) : null}

      <label className={marketplaceAuthLabel}>
        Όνομα εμφάνισης
        <input
          name="displayName"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={initialDisplayName}
          key={state?.ok ? state.displayName : initialDisplayName}
          className={`mt-1.5 ${marketplaceAuthInput}`}
        />
        {state && !state.ok && state.fieldErrors?.displayName ? (
          <span className="mt-1 block text-xs text-red-700">{state.fieldErrors.displayName}</span>
        ) : null}
      </label>

      <div>
        <p className={marketplaceAuthLabel}>Email</p>
        <p className={`mt-1.5 ${marketplaceAuthMuted}`}>{email}</p>
        <p className="mt-1 text-xs text-slate-500">Το email δεν μπορεί να αλλάξει εδώ.</p>
      </div>

      <SubmitButton />
    </form>
  );
}
