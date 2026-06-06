export type CartLineViewModel = {
  offerId: string;
  productId: string;
  quantity: number;
  title: string;
  vendorName: string;
  vendorLogoUrl: string | null;
  imageUrl: string | null;
  unitPrice: number;
  currency: string;
  unitPriceLabel: string;
  lineTotalLabel: string;
  stock: number;
  isAvailable: boolean;
  unavailabilityReason?: string;
  productHref: string;
  addedAt: string;
};

export type CartSnapshot = {
  lines: CartLineViewModel[];
  lineCount: number;
  itemCount: number;
  subtotalAmount: number;
  currency: string;
};

export type CartErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_OFFER_ID"
  | "INVALID_QUANTITY"
  | "OFFER_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "CART_LINE_LIMIT"
  | "NOT_FOUND"
  | "DB_ERROR";

export type CustomerCartMutationResult =
  | { ok: true; quantity: number; lineCount: number; itemCount: number }
  | { ok: false; message: string; code?: CartErrorCode };
