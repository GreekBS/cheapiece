import { describe, expect, it } from "vitest";

import { pickBestMatch, titleSimilarity } from "../engine/score-simple-match";
import type { MatchCandidateRow, MatchDraftInput } from "../types/match-types";

const draft: MatchDraftInput = {
  tenantId: "t1",
  categoryId: "cat1",
  title: "iPhone 16 256GB Black",
  brand: "Apple",
  model: "iPhone 16",
  attributeValues: { color: "black", storage: "256GB" },
};

const candidates: MatchCandidateRow[] = [
  {
    productId: "p-other",
    title: "Samsung Galaxy",
    brand: "Samsung",
    model: "S24",
    categoryId: "cat1",
    attributeValues: {},
    publicationPublishedAt: null,
  },
  {
    productId: "p-match",
    title: "Apple iPhone 16 256GB Black",
    brand: "Apple",
    model: "iPhone 16",
    categoryId: "cat1",
    attributeValues: { color: "black", storage: "256GB" },
    publicationPublishedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("score-simple-match", () => {
  it("titleSimilarity scores overlapping tokens", () => {
    expect(titleSimilarity("iPhone 16", "Apple iPhone 16 256GB")).toBeGreaterThan(0.5);
  });

  it("pickBestMatch prefers stronger identity match in same category", () => {
    const result = pickBestMatch(draft, candidates);
    expect(result?.suggestedProductId).toBe("p-match");
    expect(result?.confidence).toBeGreaterThan(0.3);
    expect(result?.scoreBreakdown.brand_exact).toBe(true);
  });
});
