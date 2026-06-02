import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function emptyToNull(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

const optionalRequestedPrice = z.preprocess(
  emptyToNull,
  z
    .union([z.number(), z.string()])
    .nullable()
    .optional()
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : NaN;
    })
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0 && v <= 999999.99), {
      message: "Η τιμή πρέπει να είναι αριθμός ≥ 0.",
    }),
);

const optionalRequestedStock = z.preprocess(
  emptyToNull,
  z
    .union([z.number(), z.string()])
    .nullable()
    .optional()
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : NaN;
    })
    .refine((v) => v === null || (!Number.isNaN(v) && Number.isInteger(v) && v >= 0 && v <= 999999), {
      message: "Το απόθεμα πρέπει να είναι ακέραιος ≥ 0.",
    }),
);

export const submitCatalogProductRequestSchema = z.object({
  vendorId: z.string().uuid(),
  categoryId: z.string().uuid("Επιλέξτε κατηγορία."),
  title: z.string().trim().min(2, "Ο τίτλος είναι πολύ σύντομος.").max(500),
  brand: z.string().trim().max(200).nullable().optional(),
  model: z.string().trim().max(200).nullable().optional(),
  slugSuggestion: z
    .string()
    .trim()
    .min(1, "Το slug είναι υποχρεωτικό.")
    .max(200)
    .transform((s) => s.toLowerCase())
    .refine((s) => slugPattern.test(s), "Slug: μόνο πεζά γράμματα, αριθμοί και παύλες."),
  gtin: z.string().trim().max(32).nullable().optional(),
  mpn: z.string().trim().max(120).nullable().optional(),
  requestedPriceAmount: optionalRequestedPrice,
  requestedStockQuantity: optionalRequestedStock,
});

export type SubmitCatalogProductRequestInput = z.infer<typeof submitCatalogProductRequestSchema>;

export const approveCatalogProductRequestSchema = z.object({
  requestId: z.string().uuid(),
  finalSlug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .transform((s) => s.toLowerCase())
    .refine((s) => slugPattern.test(s), "Slug: μόνο πεζά γράμματα, αριθμοί και παύλες."),
  title: z.string().trim().min(2).max(500),
  brand: z.string().trim().max(200).nullable().optional(),
  model: z.string().trim().max(200).nullable().optional(),
  categoryId: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.string().uuid().nullable(),
  ),
  adminNote: z.string().trim().max(2000).nullable().optional(),
  confirmCreateDespiteLinkRecommendation: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .optional(),
  createOverrideReason: z.string().trim().max(500).nullable().optional(),
});

export const rejectCatalogProductRequestSchema = z.object({
  requestId: z.string().uuid(),
  rejectionReason: z.string().trim().min(3, "Απαιτείται λόγος απόρριψης.").max(2000),
  adminNote: z.string().trim().max(2000).nullable().optional(),
});

export const linkCatalogProductRequestToExistingSchema = z.object({
  requestId: z.string().uuid(),
  productId: z.string().uuid("Επιλέξτε προϊόν καταλόγου."),
  adminNote: z.string().trim().max(2000).nullable().optional(),
  confirmLinkDespiteVariantMismatch: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .optional(),
  linkOverrideReason: z.string().trim().max(500).nullable().optional(),
});
