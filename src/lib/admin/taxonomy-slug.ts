const EL: Record<string, string> = {
  α: "a",
  ά: "a",
  β: "b",
  γ: "g",
  δ: "d",
  ε: "e",
  έ: "e",
  ζ: "z",
  η: "i",
  ή: "i",
  θ: "th",
  ι: "i",
  ί: "i",
  ϊ: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  ό: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  ύ: "y",
  φ: "f",
  χ: "ch",
  ψ: "ps",
  ω: "o",
  ώ: "o",
};

const STABLE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validates taxonomy / seed slugs (ASCII, SEO-safe segment chain). */
export function isStableTaxonomySlug(slug: string): boolean {
  return STABLE_SLUG_RE.test(slug) && slug.length > 0 && slug.length <= 128;
}

/**
 * Deterministic transliteration for authoring fallback only.
 * Prefer explicit `slug` in taxonomy JSON — do not re-slug existing DB rows.
 */
export function transliterateSlugSegment(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .split("")
    .map((ch) => EL[ch] ?? ch)
    .join("")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return s || "category";
}
