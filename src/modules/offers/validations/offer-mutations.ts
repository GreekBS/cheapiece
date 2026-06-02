import { z } from "zod";

const conditionEnum = z.enum(["new", "used", "refurbished"]);
const stateEnum = z.enum(["draft", "active", "paused", "archived"]);

export const createOfferSchema = z.object({
  vendorId: z.string().uuid(),
  productId: z.string().uuid(),
  condition: conditionEnum.default("new"),
  listingVariantKey: z.string().max(256).default(""),
  priceAmount: z.coerce.number().nonnegative().finite(),
  currency: z.string().length(3).default("EUR"),
  stockQuantity: z.coerce.number().int().nonnegative().default(0),
  state: stateEnum.default("draft"),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;

export const updateOfferSchema = z.object({
  offerId: z.string().uuid(),
  vendorId: z.string().uuid(),
  priceAmount: z.coerce.number().nonnegative().finite(),
  stockQuantity: z.coerce.number().int().nonnegative(),
  state: stateEnum,
});

export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;

/** Narrow price-only update (legacy callers). */
export const updateOfferPriceSchema = z.object({
  offerId: z.string().uuid(),
  vendorId: z.string().uuid(),
  priceAmount: z.coerce.number().nonnegative().finite(),
});

export type UpdateOfferPriceInput = z.infer<typeof updateOfferPriceSchema>;
