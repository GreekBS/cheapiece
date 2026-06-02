import { dsPageBg } from "@/components/ui/merchant-ds";

/** Never statically cache merchant shell; avoids stale RSC across auth transitions. */
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function MerchantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={dsPageBg}>{children}</div>;
}
