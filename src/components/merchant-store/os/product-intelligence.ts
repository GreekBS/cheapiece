export type ProductAttribute = { id: string; key: string; value: string };

export type ProductDraft = {
  title: string;
  description: string;
  price: string;
  category: string;
  attributes: ProductAttribute[];
};

export type ProductDerivedState = {
  normalizedTitle: string;
  suggestedCategory: string;
  categoryConfidence: number;
  suggestedTags: string[];
  matchScore: number;
  standardizationNotes: string[];
};

const CATEGORY_KEYWORDS: { label: string; keywords: string[] }[] = [
  { label: "Τρόφιμα & ποτά", keywords: ["coffee", "tea", "wine", "food", "snack", "drink", "organic", "bakery", "καφές", "τσάι", "κρασί", "φαγητό"] },
  { label: "Σπίτι & κήπος", keywords: ["home", "garden", "kitchen", "decor", "furniture", "plant", "lamp", "κήπος", "κουζίνα"] },
  { label: "Ηλεκτρονικά", keywords: ["phone", "laptop", "usb", "charger", "camera", "electronic", "tech", "hdmi", "τηλέφωνο"] },
  { label: "Υγεία & ομορφιά", keywords: ["skin", "cream", "shampoo", "vitamin", "beauty", "health", "soap", "κρέμα", "ομορφιά"] },
  { label: "Ένδυση", keywords: ["shirt", "dress", "jacket", "shoe", "wear", "cotton", "fashion", "παπούτσι", "ρούχο"] },
  { label: "Αθλητισμός & εξωτερικοί χώροι", keywords: ["sport", "fitness", "yoga", "bike", "camp", "outdoor", "gym", "γυμναστική"] },
];

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function suggestCategory(title: string, description: string, userCategory: string): { label: string; confidence: number } {
  const haystack = `${title} ${description} ${userCategory}`.toLowerCase();
  let best = { label: "Γενικό εμπόρευμα", confidence: 42 };

  for (const entry of CATEGORY_KEYWORDS) {
    const hits = entry.keywords.filter((k) => haystack.includes(k)).length;
    if (hits === 0) continue;
    const confidence = Math.min(96, 55 + hits * 12);
    if (confidence > best.confidence) {
      best = { label: entry.label, confidence };
    }
  }

  if (userCategory.trim()) {
    const trimmed = userCategory.trim();
    if (best.confidence < 70) {
      return { label: toTitleCase(trimmed), confidence: 68 };
    }
  }

  return best;
}

function suggestTags(title: string, description: string, attributes: ProductAttribute[]): string[] {
  const fromText = [...tokenize(title), ...tokenize(description)];
  const fromAttrs = attributes.flatMap((a) => tokenize(`${a.key} ${a.value}`));
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of [...fromText, ...fromAttrs]) {
    const tag = raw.length > 12 ? raw.slice(0, 12) : raw;
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 8) break;
  }

  return tags;
}

function completenessScore(draft: ProductDraft): number {
  let score = 0;
  if (normalizeWhitespace(draft.title).length >= 3) score += 25;
  if (normalizeWhitespace(draft.description).length >= 12) score += 25;
  if (draft.price.trim() && !Number.isNaN(Number(draft.price.replace(",", ".")))) score += 20;
  if (draft.category.trim()) score += 15;
  const filledAttrs = draft.attributes.filter((a) => a.key.trim() && a.value.trim()).length;
  score += Math.min(15, filledAttrs * 5);
  return Math.min(100, score);
}

/** UI-only derivation — no API calls. */
export function deriveProductIntelligence(draft: ProductDraft): ProductDerivedState {
  const normalizedTitle = toTitleCase(normalizeWhitespace(draft.title));
  const { label: suggestedCategory, confidence: categoryConfidence } = suggestCategory(
    draft.title,
    draft.description,
    draft.category,
  );
  const suggestedTags = suggestTags(draft.title, draft.description, draft.attributes);
  const matchScore = completenessScore(draft);

  const standardizationNotes: string[] = [];
  if (draft.title && normalizedTitle !== draft.title.trim()) {
    standardizationNotes.push("Κανονικοποιήθηκαν κεφαλαιοποίηση και διαστήματα για την εμφάνιση στον κατάλόγο.");
  }
  if (draft.price.trim()) {
    const n = Number(draft.price.replace(",", "."));
    if (!Number.isNaN(n)) {
      standardizationNotes.push(`Η τιμή αναγνωρίστηκε ως ${n.toFixed(2)} € (τοπικό νόμισμα).`);
    }
  }
  if (draft.attributes.some((a) => a.key.trim() || a.value.trim())) {
    standardizationNotes.push("Τα προσαρμοσμένα χαρακτηριστικά αντιστοιχίστηκαν σε πεδία καταλόγου.");
  }
  if (suggestedTags.length > 0) {
    standardizationNotes.push(`Δημιουργήθηκαν ${suggestedTags.length} ετικέτες αναζήτησης από το κείμενο του προϊόντος.`);
  }
  if (standardizationNotes.length === 0) {
    standardizationNotes.push("Συμπλήρωσε τα στοιχεία του προϊόντος για να εκτελεστεί η τυποποίηση.");
  }

  return {
    normalizedTitle: normalizedTitle || "—",
    suggestedCategory,
    categoryConfidence,
    suggestedTags,
    matchScore,
    standardizationNotes,
  };
}

export function matchScoreVariant(score: number): "active" | "draft" | "paused" {
  if (score >= 75) return "active";
  if (score >= 45) return "draft";
  return "paused";
}

export function matchScoreLabel(score: number): string {
  if (score >= 75) return "Υψηλός";
  if (score >= 45) return "Μέτριος";
  return "Χαμηλός";
}
