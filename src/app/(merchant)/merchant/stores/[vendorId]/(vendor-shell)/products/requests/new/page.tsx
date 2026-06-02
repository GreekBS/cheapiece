import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CatalogProductRequestForm } from "@/components/vendor/CatalogProductRequestForm";
import {
  merchantStoreProductsPath,
  merchantStoreProductsPendingPath,
} from "@/lib/merchant/merchant-store-paths";
import { getMerchantStoreContext } from "@/lib/merchant/merchant-store-request-dedup";
import { loadMerchantFormContract } from "@/modules/catalog-products-read/ui/server/load-merchant-form-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function fetchActiveCategories(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  tenantId: string,
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("state", "active")
    .order("name", { ascending: true });

  if (!error && data) {
    return data as { id: string; name: string }[];
  }
  return [];
}

type Props = {
  params: { vendorId: string };
};

/** Canonical catalog request form — Αίτηση νέου προϊόντος καταλόγου (unchanged behavior). */
export default async function MerchantStoreProductsRequestNewPage({ params }: Props) {
  const pathname = headers().get("x-log-pathname");
  const { supabase, vendor } = await getMerchantStoreContext(params.vendorId, {
    caller: "stores/[vendorId]/(vendor-shell)/products/requests/new/page",
    pathname,
  });
  if (!vendor) {
    notFound();
  }

  const vendors = [{ id: vendor.id, name: vendor.name, tenantId: vendor.tenant_id }];
  const categories = await fetchActiveCategories(supabase, vendor.tenant_id);
  const categoriesByVendorId = { [vendor.id]: categories };

  const initialContract = await loadMerchantFormContract(supabase, {
    tenantId: vendor.tenant_id,
    categoryId: null,
  });

  const successHref = merchantStoreProductsPendingPath(vendor.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Αίτηση νέου προϊόντος καταλόγου</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Η αίτηση ελέγχεται από <strong>platform_admin</strong>. Μετά την έγκριση μπορείτε να δημιουργήσετε προσφορά στο νέο προϊόν.
          </p>
        </div>
        <Link href={merchantStoreProductsPath(vendor.id)} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          ← Επιστροφή στα προϊόντα
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <CatalogProductRequestForm
          vendors={vendors}
          defaultVendorId={vendor.id}
          categoriesByVendorId={categoriesByVendorId}
          initialContract={initialContract}
          lockVendorId={vendor.id}
          successListHref={successHref}
          successListLabel="Προβολή αιτήσεων σε αναμονή"
          showOfferLinkAfterSuccess={false}
        />
      </div>
    </div>
  );
}
