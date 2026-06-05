import Link from "next/link";

import { MarketplaceProductCard } from "@/components/marketplace/catalog/MarketplaceProductCard";
import { MarketplaceProductGrid } from "@/components/marketplace/catalog/MarketplaceProductGrid";
import { IconHeart } from "@/components/marketplace-home/marketplace-icons";
import { getPublicMarketplaceTenantId } from "@/lib/marketplace/public-tenant";
import { requireCustomerSession } from "@/lib/auth/require-customer-session";
import { fetchFavoriteProductCardsForUser } from "@/modules/customer-favorites/queries/fetch-favorite-product-cards";

export default async function AccountFavoritesPage() {
  const { supabase, user } = await requireCustomerSession();
  const tenantId = getPublicMarketplaceTenantId();
  const cards = await fetchFavoriteProductCardsForUser(supabase, user.id, tenantId);

  return (
    <div>
      <h1 id="account-favorites-heading" className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        Αγαπημένα
      </h1>
      <p className="mt-2 text-sm text-slate-600">Τα προϊόντα που αποθήκευσες.</p>

      {cards.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200/90 bg-white px-6 py-10 text-center shadow-sm shadow-slate-900/[0.04] sm:px-8">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200/90 bg-slate-50 text-slate-400"
            aria-hidden
          >
            <IconHeart className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">Δεν έχεις αγαπημένα ακόμα</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
            Περιήγησε στο marketplace και πάτησε την καρδιά σε προϊόντα που σου αρέσουν για να τα βρίσκεις εδώ.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-slate-900/15 transition hover:bg-slate-800"
          >
            Αναζήτηση προϊόντων
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <MarketplaceProductGrid labelledBy="account-favorites-heading">
            {cards.map((card) => (
              <li key={card.productId} className="flex justify-center">
                <MarketplaceProductCard
                  href={`/products/${card.productId}`}
                  title={card.title}
                  brand={card.brand}
                  model={card.model}
                  priceLabel={card.priceLabel}
                  imageUrl={card.primaryImageUrl}
                  productId={card.productId}
                  initialFavorited
                  isAuthenticated
                />
              </li>
            ))}
          </MarketplaceProductGrid>
        </div>
      )}
    </div>
  );
}
