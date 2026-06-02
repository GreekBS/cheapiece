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

/** SEO-ish slug from Greek/Latin mix (admin categories). */
export function slugifyCategoryName(raw: string, fallback: string): string {
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
  const base = s || "category";
  return `${base}-${fallback.slice(0, 8)}`;
}
