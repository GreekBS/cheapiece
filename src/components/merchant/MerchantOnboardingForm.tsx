"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { createVendorAction, type CreateVendorActionState } from "@/actions/merchant";
import {
  dsCard,
  dsCardPadLg,
  dsHeadingSection,
  dsInput,
  dsLabel,
  dsMuted,
  dsPrimaryButtonLg,
} from "@/components/ui/merchant-ds";

function slugifyFromName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "store";
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={dsPrimaryButtonLg}>
      {pending ? "Creating…" : "Create Store"}
    </button>
  );
}

export function MerchantOnboardingForm() {
  const [state, formAction] = useFormState<CreateVendorActionState | null, FormData>(createVendorAction, null);
  const [name, setName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");

  const derivedSlug = useMemo(() => slugifyFromName(name), [name]);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(derivedSlug);
    }
  }, [derivedSlug, slugTouched]);

  const nameInvalid = state?.ok === false && state.fieldErrors?.name;
  const slugInvalid = state?.ok === false && state.fieldErrors?.slug;

  return (
    <form action={formAction} className={`${dsCard} ${dsCardPadLg} space-y-8`}>
      <div className="space-y-1">
        <h2 className={dsHeadingSection}>Store details</h2>
        <p className={dsMuted}>
          One short step — then you can publish offers from your store workspace. Your store URL (slug) must be unique across
          the marketplace.
        </p>
      </div>

      {state && !state.ok && state.message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.message}
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="merchant-store-name" className={dsLabel}>
            Store name
          </label>
          <input
            id="merchant-store-name"
            name="name"
            required
            minLength={2}
            maxLength={200}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            className={[dsInput, nameInvalid ? "border-red-400 focus:border-red-600 focus:ring-red-500/20" : ""].join(
              " ",
            )}
            placeholder="e.g. Northside Bike Shop"
            autoComplete="organization"
          />
          {nameInvalid && state?.fieldErrors?.name ? (
            <p className="text-xs text-red-700">{state.fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="merchant-store-slug" className={dsLabel}>
            Store URL slug
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            <span className="hidden shrink-0 self-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 sm:inline-flex sm:items-center">
              /vendor/
            </span>
            <input
              id="merchant-store-slug"
              name="slug"
              required
              maxLength={100}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              className={[dsInput, "font-mono", slugInvalid ? "border-red-400 focus:border-red-600 focus:ring-red-500/20" : ""].join(
                " ",
              )}
              placeholder="northside-bike-shop"
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              title="Lowercase letters, numbers, hyphens only"
            />
          </div>
          <p className="text-xs leading-relaxed text-gray-500">
            Used in your public store URL. Auto-filled from the store name — edit for a shorter or more memorable
            link. Only lowercase letters, numbers, and single hyphens between segments.
          </p>
          {slugInvalid && state?.fieldErrors?.slug ? (
            <p className="text-xs text-red-700">{state.fieldErrors.slug}</p>
          ) : null}
        </div>
      </div>

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
