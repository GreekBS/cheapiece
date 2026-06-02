import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { OfferForm } from "@/components/vendor/OfferForm";
import { merchantStoreOffersPath } from "@/lib/merchant/merchant-store-paths";
import { getMerchantStoreContext } from "@/lib/merchant/merchant-store-request-dedup";
import { listActiveProductsForTenant } from "@/modules/catalog/queries/product-queries";

type Props = {
  params: { vendorId: string };
  searchParams: { productId?: string };
};

export default async function MerchantStoreNewOfferPage({ params, searchParams }: Props) {
  const pathname = headers().get("x-log-pathname");
  const { supabase, vendor } = await getMerchantStoreContext(params.vendorId, {
    caller: "stores/[vendorId]/(vendor-shell)/offers/new/page",
    pathname,
  });
  if (!vendor) {
    notFound();
  }

  const products = await listActiveProductsForTenant(supabase, vendor.tenant_id);
  const defaultProductId =
    searchParams.productId && products.some((p) => p.id === searchParams.productId) ? searchParams.productId : undefined;

  const vendors = [{ id: vendor.id, name: vendor.name }];
  const offersSuccessRedirect = merchantStoreOffersPath(vendor.id);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Δημιουργία Προσφοράς</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">Κατάστημα: {vendor.name}</p>
        </div>
        <Link href={offersSuccessRedirect} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Επιστροφή στις προσφορές
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <OfferForm
          mode="create"
          vendors={vendors}
          defaultVendorId={vendor.id}
          products={products}
          defaultProductId={defaultProductId}
          offersSuccessRedirect={offersSuccessRedirect}
        />
      </div>
    </div>
  );
}
