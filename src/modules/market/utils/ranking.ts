export type RankableMarketOffer = {
  id?: string;
  state: string;
  price_amount: string | number;
  stock_quantity?: number | null;
  updated_at?: string | null;
};

/**
 * Deterministic marketplace ranking (server-side, in-memory).
 * Preconditions: caller typically already restricts to active catalog rows.
 *
 * Rules:
 * 1. Active offers before non-active (defensive if mixed)
 * 2. Lower price first
 * 3. Higher stock next
 * 4. Fresher updated_at first
 */
export function rankMarketOffers<T extends RankableMarketOffer>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const activeRank = (s: string) => (s === "active" ? 0 : 1);
    const ar = activeRank(a.state);
    const br = activeRank(b.state);
    if (ar !== br) {
      return ar - br;
    }

    const pa = toNumber(a.price_amount);
    const pb = toNumber(b.price_amount);
    if (pa !== pb) {
      return pa - pb;
    }

    const sa = a.stock_quantity ?? 0;
    const sb = b.stock_quantity ?? 0;
    if (sa !== sb) {
      return sb - sa;
    }

    const ta = a.updated_at ? Date.parse(a.updated_at) : 0;
    const tb = b.updated_at ? Date.parse(b.updated_at) : 0;
    if (ta !== tb) {
      return tb - ta;
    }
    const ia = a.id ?? "";
    const ib = b.id ?? "";
    return ia.localeCompare(ib);
  });
}

function toNumber(v: string | number): number {
  if (typeof v === "number") {
    return v;
  }
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}
