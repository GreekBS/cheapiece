import { Suspense } from "react";



import {

  CatalogRequestAuditListClient,

  CatalogRequestAuditListFallback,

} from "@/components/admin/catalog-requests/CatalogRequestAuditListClient";

import { parseCatalogRequestAuditUrlParams } from "@/components/admin/catalog-requests/catalog-request-audit-url-params";

import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";

import {

  listAdminCatalogProductRequestCounts,

  listAdminCatalogProductRequestHistory,

} from "@/modules/catalog-requests/queries/catalog-product-request-queries";

import { resolveAdminTenantId } from "@/modules/catalog-schema/queries/catalog-schema-admin-queries";



type PageProps = {

  searchParams?: Record<string, string | string[] | undefined>;

};



export default async function AdminCatalogRequestsPage({ searchParams }: PageProps) {

  const { supabase, user } = await requirePlatformAdmin();

  const { tab: initialTab, q: initialQ } = parseCatalogRequestAuditUrlParams(searchParams ?? {});

  const tenantId = await resolveAdminTenantId(supabase, user.id);

  if (!tenantId) {

    return (

      <div className="mx-auto max-w-4xl space-y-4">

        <h1 className="text-xl font-semibold text-slate-900">Αιτήσεις νέου καταλόγου</h1>

        <p className="text-sm text-amber-800">Ο λογαριασμός admin δεν έχει tenant_id — απαιτείται για φόρτωση αιτήσεων.</p>

      </div>

    );

  }



  const [listResult, countsResult] = await Promise.all([

    listAdminCatalogProductRequestHistory(supabase, {

      tenantId,

      tab: initialTab,

      q: initialQ,

      limit: 200,

    }),

    listAdminCatalogProductRequestCounts(supabase, {

      tenantId,

      q: initialQ,

    }),

  ]);



  const showListError = listResult.error;

  const showCountsError = countsResult.error;



  return (

    <div className="mx-auto max-w-6xl space-y-6">

      <div>

        <h1 className="text-xl font-semibold text-slate-900">Αιτήσεις νέου καταλόγου</h1>

        <p className="mt-1 text-sm text-slate-600">

          Ιστορικό αιτήσεων — εκκρεμείς, εγκεκριμένες και απορριφθείσες. Έως 200 τελευταίες

          αιτήσεις. Χρησιμοποίησε τις καρτέλες και την αναζήτηση για γρήγορη εύρεση.

        </p>

      </div>



      {showListError ? (

        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">

          {listResult.errorMessage ?? "Αδυναμία φόρτωσης αιτήσεων. Δοκίμασε ανανέωση."}

        </p>

      ) : null}



      {showCountsError ? (

        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">

          {countsResult.errorMessage ?? "Αδυναμία φόρτωσης μετρητών αιτήσεων. Δοκίμασε ανανέωση."}

        </p>

      ) : null}



      {!showListError ? (

        <Suspense fallback={<CatalogRequestAuditListFallback />}>

          <CatalogRequestAuditListClient

            rows={listResult.data}

            counts={countsResult.data}

            initialTab={initialTab}

            initialQ={initialQ}

          />

        </Suspense>

      ) : null}

    </div>

  );

}


