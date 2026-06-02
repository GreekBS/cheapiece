import type { ProductAggregateDTO } from "../../types/product-aggregate.dto";



export type MarketplaceProductAccessContext = {

  tenantId: string;

};



export type MarketplaceProductAccessResult = { kind: "not_found" } | { kind: "render" };



/**

 * Canonical product visibility gate (active + tenant).

 * Public PDP: aggregate + this policy only — stats never gate renderability.

 */

export function resolveMarketplaceProductAccess(

  aggregate: ProductAggregateDTO | null,

  ctx: MarketplaceProductAccessContext,

): MarketplaceProductAccessResult {

  if (!aggregate) {

    return { kind: "not_found" };

  }



  if (aggregate.product.state !== "active") {

    return { kind: "not_found" };

  }



  if (aggregate.product.tenantId !== ctx.tenantId) {

    return { kind: "not_found" };

  }



  return { kind: "render" };

}


