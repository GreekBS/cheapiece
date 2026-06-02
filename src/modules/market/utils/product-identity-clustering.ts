import type { MarketOfferDTO } from "../types/market-offer.dto";

/**
 * Lowercase, trim, strip punctuation, collapse whitespace — for identity matching only.
 */
export function normalizeIdentityPart(raw: string | null | undefined): string {
  if (!raw) {
    return "";
  }
  return raw
    .toLowerCase()
    .trim()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Composite key: title + brand + model (normalized). */
export function normalizedTupleKey(offer: MarketOfferDTO): string {
  const t = normalizeIdentityPart(offer.title);
  const b = normalizeIdentityPart(offer.productBrand);
  const m = normalizeIdentityPart(offer.productModel);
  return `${t}|${b}|${m}`;
}

/**
 * Cluster offers: same `productId` OR same normalized (title+brand+model) tuple.
 * Union-find for transitive closure. Server-side only.
 */
export function clusterOffersByIdentity(offers: MarketOfferDTO[]): MarketOfferDTO[][] {
  const n = offers.length;
  if (n === 0) {
    return [];
  }

  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    let x = i;
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }

  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent[rb] = ra;
    }
  }

  const keys = offers.map((o) => ({
    productId: o.productId,
    tuple: normalizedTupleKey(o),
  }));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (keys[i].productId === keys[j].productId || keys[i].tuple === keys[j].tuple) {
        union(i, j);
      }
    }
  }

  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const arr = buckets.get(r) ?? [];
    arr.push(i);
    buckets.set(r, arr);
  }

  return [...buckets.values()]
    .map((idx) => idx.sort((a, b) => a - b).map((i) => offers[i]))
    .sort((a, b) => {
      const pa = a[0]?.productId ?? "";
      const pb = b[0]?.productId ?? "";
      return pa.localeCompare(pb);
    });
}
