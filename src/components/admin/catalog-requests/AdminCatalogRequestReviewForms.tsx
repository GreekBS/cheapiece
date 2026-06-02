"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import Link from "next/link";

import {
  approveCatalogProductRequestAction,
  rejectCatalogProductRequestAction,
  type AdminCatalogRequestActionResult,
} from "@/actions/admin-catalog-product-requests";
import { CatalogApprovalPageAlerts } from "@/components/admin/catalog-requests/CatalogApprovalPageAlerts";
import { CatalogRequestApprovalRecommendationBanner } from "@/components/admin/catalog-requests/CatalogRequestApprovalRecommendationBanner";
import {
  getCatalogApprovalUiFlags,
  MIN_OVERRIDE_REASON_LENGTH,
} from "@/components/admin/catalog-requests/catalog-approval-ui-flags";
import type { CatalogProductRequestListRow } from "@/modules/catalog-requests/types/catalog-product-request";
import type { CatalogApprovalRecommendation } from "@/modules/catalog-requests/variant-dedup";
import type { ProductMatchLabel } from "@/modules/catalog-request-matching/queries/fetch-product-match-labels";
import type { CatalogProductRequestFormCategory } from "@/components/vendor/CatalogProductRequestForm";

import { AdminCatalogRequestLinkExistingForm } from "./AdminCatalogRequestLinkExistingForm";

function Submit({
  children,
  variant,
  disabled,
}: {
  children: React.ReactNode;
  variant: "primary" | "secondary" | "danger" | "exception";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const cls =
    variant === "primary"
      ? "bg-blue-700 hover:bg-blue-800 text-white"
      : variant === "secondary"
        ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
        : variant === "exception"
          ? "border border-amber-400 bg-white text-amber-950 hover:bg-amber-50"
          : "bg-rose-700 hover:bg-rose-800 text-white";
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex rounded-lg px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50 ${cls}`}
    >
      {pending ? "…" : children}
    </button>
  );
}

function Err({ state }: { state: AdminCatalogRequestActionResult | null }) {
  if (!state) return null;
  if (state.ok && state.warning) {
    return (
      <p className="text-sm text-amber-800" role="status">
        {state.warning}
      </p>
    );
  }
  if (state.ok) return null;
  return (
    <p className="text-sm text-rose-700" role="alert">
      {state.message}
    </p>
  );
}

type Props = {
  request: CatalogProductRequestListRow;
  categories: CatalogProductRequestFormCategory[];
  suggestedProductId?: string | null;
  merchantSelectedProductId?: string | null;
  recommendation: CatalogApprovalRecommendation;
  candidateProduct?: ProductMatchLabel | null;
};

function CreateNewProductForm({
  request,
  categories,
  approveState,
  approveAction,
  emphasizePrimary,
  showOverride,
  collapsedByDefault,
}: {
  request: CatalogProductRequestListRow;
  categories: CatalogProductRequestFormCategory[];
  approveState: AdminCatalogRequestActionResult | null;
  approveAction: (payload: FormData) => void;
  emphasizePrimary: boolean;
  showOverride: boolean;
  collapsedByDefault: boolean;
}) {
  const uiFlags = getCatalogApprovalUiFlags();
  const [expanded, setExpanded] = useState(!collapsedByDefault);
  const [overrideStepVisible, setOverrideStepVisible] = useState(!uiFlags.twoStepOverride);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const reasonOk =
    !showOverride ||
    !uiFlags.requireOverrideReason ||
    overrideReason.trim().length >= MIN_OVERRIDE_REASON_LENGTH;
  const canSubmit = !showOverride || (overrideConfirmed && reasonOk);

  const formBody = (
    <form action={approveAction} className="space-y-3">
      <input type="hidden" name="requestId" value={request.id} />

      <label className="block text-sm font-medium text-slate-700">
        Slug (τελικό)
        <input
          name="finalSlug"
          required
          defaultValue={request.slug_suggestion}
          className="mt-1 block w-full rounded border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Τίτλος
        <input
          name="title"
          required
          defaultValue={request.title}
          className="mt-1 block w-full rounded border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Μάρκα
        <input
          name="brand"
          defaultValue={request.brand ?? ""}
          className="mt-1 block w-full rounded border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Μοντέλο
        <input
          name="model"
          defaultValue={request.model ?? ""}
          className="mt-1 block w-full rounded border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Κατηγορία
        <select
          name="categoryId"
          defaultValue={request.category_id ?? ""}
          className="mt-1 block w-full rounded border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">— Χωρίς κατηγορία —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Σημείωση admin (εσωτερική)
        <textarea
          name="adminNote"
          rows={2}
          className="mt-1 block w-full rounded border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      {showOverride ? (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/90 p-3">
          {!overrideStepVisible ? (
            <button
              type="button"
              onClick={() => setOverrideStepVisible(true)}
              className="text-sm font-medium text-amber-950 underline"
            >
              Εμφάνιση επιλογής εξαίρεσης (δημιουργία νέου παρά τη σύσταση)
            </button>
          ) : (
            <>
              <p className="text-xs text-amber-900">
                Η δημιουργία νέου προϊόντος ενδέχεται να οδηγήσει σε διπλότυπο κατάλογο και
                διπλές προσφορές για την ίδια παραλλαγή.
              </p>
              <label className="flex items-start gap-2 text-sm text-amber-950">
                <input
                  type="checkbox"
                  name="confirmCreateDespiteLinkRecommendation"
                  value="true"
                  checked={overrideConfirmed}
                  onChange={(e) => setOverrideConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Κατανοώ ότι θα δημιουργηθεί νέο προϊόν καταλόγου παρά την ύπαρξη
                  ταυτοσήμου παραλλαγής — επιθυμώ ρητά override.
                </span>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Λόγος override
                {uiFlags.requireOverrideReason ? " (υποχρεωτικός)" : " (προαιρετικό)"}
                <textarea
                  name="createOverrideReason"
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="π.χ. διαφορετική παραλλαγή που δεν καταγράφεται στα πεδία"
                  className="mt-1 block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
              {uiFlags.requireOverrideReason &&
              overrideConfirmed &&
              overrideReason.trim().length > 0 &&
              overrideReason.trim().length < MIN_OVERRIDE_REASON_LENGTH ? (
                <p className="text-xs text-rose-800">
                  Ο λόγος πρέπει να έχει τουλάχιστον {MIN_OVERRIDE_REASON_LENGTH} χαρακτήρες.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {(!showOverride || overrideStepVisible) && (
        <Submit
          variant={emphasizePrimary ? "primary" : "exception"}
          disabled={showOverride ? !canSubmit : false}
        >
          Έγκριση &amp; δημιουργία προϊόντος
        </Submit>
      )}
    </form>
  );

  if (collapsedByDefault) {
    return (
      <div
        id="approval-create-section"
        className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 shadow-sm"
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
          aria-expanded={expanded}
        >
          <span>
            <span className="block text-lg font-semibold text-slate-800">
              Εξαίρεση: Δημιουργία νέου προϊόντος
            </span>
            <span className="mt-0.5 block text-xs text-slate-600">
              Μόνο αν η σύνδεση δεν είναι κατάλληλη — απαιτείται επιβεβαίωση
            </span>
          </span>
          <span className="text-slate-500">{expanded ? "▲" : "▼"}</span>
        </button>
        {expanded ? (
          <div className="space-y-4 border-t border-slate-200 px-5 pb-5 pt-4">
            <Err state={approveState} />
            {formBody}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      id="approval-create-section"
      className={
        emphasizePrimary
          ? "space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          : "space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm"
      }
    >
      <h2 className="text-lg font-semibold text-slate-900">
        {emphasizePrimary
          ? "Έγκριση → νέο ενεργό προϊόν"
          : "Βήμα 2: Δημιουργία (μόνο αν δεν ταιριάζει σύνδεση)"}
      </h2>
      <Err state={approveState} />
      {approveState?.ok && approveState.warning ? (
        <p className="text-xs text-slate-600">
          Η αίτηση εγκρίθηκε. Ελέγξτε την προσφορά στο προϊόν αν χρειάζεται επανάληψη provisioning.
        </p>
      ) : null}
      {formBody}
    </div>
  );
}

export function AdminCatalogRequestReviewForms({
  request,
  categories,
  suggestedProductId = null,
  merchantSelectedProductId = null,
  recommendation,
  candidateProduct = null,
}: Props) {
  const uiFlags = getCatalogApprovalUiFlags();
  const [approveState, approveAction] = useFormState(
    approveCatalogProductRequestAction,
    null as AdminCatalogRequestActionResult | null,
  );
  const [rejectState, rejectAction] = useFormState(
    rejectCatalogProductRequestAction,
    null as AdminCatalogRequestActionResult | null,
  );

  if (request.status === "withdrawn") {
    return (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Κατάσταση: <strong>Ανακλήθηκε από τον έμπορο</strong>
        </p>
        <p className="text-slate-500">
          Η αίτηση αφαιρέθηκε από τη ροή ελέγχου πριν την έγκριση. Δεν είναι διαθέσιμες ενέργειες
          moderation.
        </p>
      </div>
    );
  }

  if (request.status !== "pending") {
    return (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Κατάσταση: <strong>{request.status}</strong>
        </p>
        {request.resolved_product_id ? (
          <p>
            Προϊόν:{" "}
            <Link
              href={`/admin/products/${request.resolved_product_id}`}
              className="font-medium text-blue-800 underline"
            >
              {request.resolved_product_id}
            </Link>
          </p>
        ) : null}
        {request.rejection_reason ? <p>Λόγος απόρριψης: {request.rejection_reason}</p> : null}
      </div>
    );
  }

  const linkPrimary = recommendation.mode === "link";
  const reviewMode = recommendation.mode === "review";
  const defaultLinkProductId = recommendation.candidateProductId;
  const showCreateOverride =
    recommendation.mode === "link" ||
    recommendation.pendingSiblingRequestIds.length > 0 ||
    Boolean(recommendation.tenantCatalogStrictMatchProductId) ||
    (recommendation.reasons.includes("sparse_variant_metadata") &&
      recommendation.weakCatalogHintProductIds.length > 0);

  const collapsedCreate =
    uiFlags.collapsedCreateOnLink && linkPrimary && showCreateOverride;
  const useVerticalStack = uiFlags.verticalStackOnLink && (linkPrimary || reviewMode);

  const linkFormProps = {
    requestId: request.id,
    tenantId: request.tenant_id,
    categoryId: request.category_id,
    suggestedProductId,
    merchantSelectedProductId,
    defaultLinkProductId,
    candidateProduct,
  };

  return (
    <div className="space-y-6">
      <CatalogRequestApprovalRecommendationBanner
        recommendation={recommendation}
        candidateProductLabel={candidateProduct?.title ?? null}
      />

      <CatalogApprovalPageAlerts
        recommendation={recommendation}
        candidateProductLabel={candidateProduct?.title ?? null}
      />

      <div className={useVerticalStack ? "flex flex-col gap-6" : "grid gap-8 md:grid-cols-2"}>
        {linkPrimary || reviewMode ? (
          <AdminCatalogRequestLinkExistingForm
            {...linkFormProps}
            emphasizePrimary={linkPrimary}
            reviewStepLabel={reviewMode ? "Βήμα 1: Έλεγχος σύνδεσης" : null}
          />
        ) : null}

        <CreateNewProductForm
          request={request}
          categories={categories}
          approveState={approveState}
          approveAction={approveAction}
          emphasizePrimary={!linkPrimary && !reviewMode}
          showOverride={showCreateOverride}
          collapsedByDefault={collapsedCreate}
        />

        {!linkPrimary && !reviewMode ? (
          <AdminCatalogRequestLinkExistingForm {...linkFormProps} emphasizePrimary={false} />
        ) : null}

        <div className={`space-y-4 rounded-xl border border-rose-100 bg-rose-50/40 p-5 shadow-sm ${useVerticalStack ? "" : "md:col-span-2"}`}>
          <h2 className="text-lg font-semibold text-rose-950">Απόρριψη</h2>
          <Err state={rejectState} />
          <form action={rejectAction} className="space-y-3">
            <input type="hidden" name="requestId" value={request.id} />
            <label className="block text-sm font-medium text-slate-700">
              Λόγος απόρριψης
              <textarea
                name="rejectionReason"
                required
                rows={3}
                className="mt-1 block w-full rounded border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Σημείωση admin (εσωτερική)
              <textarea
                name="adminNote"
                rows={2}
                className="mt-1 block w-full rounded border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <Submit variant="danger">Απόρριψη αίτησης</Submit>
          </form>
        </div>
      </div>
    </div>
  );
}
