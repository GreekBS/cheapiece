import type { Metadata } from "next";

import { MarketplaceFooter } from "@/components/marketplace-home/sections/MarketplaceFooter";
import { MarketplaceNav } from "@/components/marketplace-home/sections/MarketplaceNav";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

/**
 * Single marketplace shell for all public routes in this group:
 * same header/footer as Home, stable across client navigations.
 */
export default function MarketGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <MarketplaceNav />
      <main>{children}</main>
      <MarketplaceFooter />
    </div>
  );
}
