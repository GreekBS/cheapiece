import { MarketplaceProductCard } from "@/components/marketplace/catalog/MarketplaceProductCard";
import { MarketplaceProductGrid } from "@/components/marketplace/catalog/MarketplaceProductGrid";
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
        <p className="mt-8 rounded-2xl border border-slate-200/90 bg-white px-6 py-8 text-sm text-slate-600 shadow-sm shadow-slate-900/[0.04]">
          Δεν έχεις αποθηκεύσει αγαπημένα προϊόντα ακόμα.
        </p>
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
