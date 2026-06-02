"use client";

import { useFormState } from "react-dom";

import { signInWithPasswordAction, type AuthFormState } from "@/actions/auth";

export function SignInForm() {
  const [state, formAction] = useFormState(signInWithPasswordAction, null as AuthFormState | null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value="/" />
      {state && !state.ok ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.message}</div>
      ) : null}

      <label className="block text-sm font-medium text-neutral-800">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
        />
      </label>

      <label className="block text-sm font-medium text-neutral-800">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
        />
      </label>

      <button
        type="submit"
        className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Sign in
      </button>
    </form>
  );
}
