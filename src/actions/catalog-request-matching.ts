"use server";

import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { computeCatalogRequestMatch } from "@/modules/catalog-request-matching/services/compute-catalog-request-match";
import { MATCH_LOW_CONFIDENCE_THRESHOLD } from "@/modules/catalog-request-matching/types/match-types";
import type { MatchSuggestionResult } from "@/modules/catalog-request-matching/types/match-types";
import { fetchVendorTenantId } from "@/modules/catalog-requests/queries/catalog-product-request-queries";
import { resolveActor } from "@/modules/identity/services/resolve-actor";
import { listAccessibleVendorIds } from "@/modules/vendors/queries/vendor-queries";

export type MatchSuggestionDTO = {
  productId: string;
  title: string;
  brand: string | null;
  model: string | null;
  confidence: number;
  matchReasons: string[];
  scoreBreakdown: MatchSuggestionResult["scoreBreakdown"];
  isLowConfidence: boolean;
};

export type SuggestCatalogRequestMatchesResult = {
  data: MatchSuggestionDTO | null;
  error: boolean;
  errorMessage?: string;
  meta: { source: "supabase"; function: string; tenantId?: string };
};

const suggestSchema = z.object({
  vendorId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  title: z.string().max(500),
  brand: z.string().max(200).optional().nullable(),
  model: z.string().max(200).optional().nullable(),
});

/** Read-only match suggestion (no DB writes). */
export async function suggestCatalogRequestMatchesAction(input: {
  vendorId: string;
  categoryId?: string | null;
  title: string;
  brand?: string | null;
  model?: string | null;
  attributeValues?: Record<string, unknown>;
}): Promise<SuggestCatalogRequestMatchesResult> {
  const meta = { source: "supabase" as const, function: "suggestCatalogRequestMatchesAction" };

  const parsed = suggestSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: true, errorMessage: "Μη έγκυρα δεδομένα αναζήτησης.", meta };
  }

  const supabase = await createServerSupabaseClient();
  const actor = await resolveActor(supabase);
  if (!actor) {
    return { data: null, error: true, errorMessage: "Απαιτείται σύνδεση.", meta };
  }

  const accessible = await listAccessibleVendorIds(supabase, actor.userId);
  if (!accessible.includes(parsed.data.vendorId)) {
    return { data: null, error: true, errorMessage: "Δεν έχετε πρόσβαση σε αυτό το κατάστημα.", meta };
  }

  const tenantId = await fetchVendorTenantId(supabase, parsed.data.vendorId);
  if (!tenantId) {
    return { data: null, error: true, errorMessage: "Δεν βρέθηκε tenant.", meta };
  }

  const computed = await computeCatalogRequestMatch(supabase, {
    tenantId,
    categoryId: parsed.data.categoryId?.trim() || null,
    title: parsed.data.title.trim(),
    brand: parsed.data.brand?.trim() || null,
    model: parsed.data.model?.trim() || null,
    attributeValues: input.attributeValues ?? {},
  });

  if (!computed.ok) {
    return {
      data: null,
      error: true,
      errorMessage: computed.errorMessage,
      meta: { ...meta, tenantId },
    };
  }

  const suggestion = computed.suggestion;
  if (!suggestion?.suggestedProductId) {
    return { data: null, error: false, meta: { ...meta, tenantId } };
  }

  return {
    data: {
      productId: suggestion.suggestedProductId,
      title: suggestion.suggestedTitle ?? "",
      brand: suggestion.suggestedBrand,
      model: suggestion.suggestedModel,
      confidence: suggestion.confidence,
      matchReasons: suggestion.matchReasons,
      scoreBreakdown: suggestion.scoreBreakdown,
      isLowConfidence: suggestion.confidence < MATCH_LOW_CONFIDENCE_THRESHOLD,
    },
    error: false,
    meta: { ...meta, tenantId },
  };
}
