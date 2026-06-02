import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { logMerchantNotFoundTrigger } from "@/lib/debug/merchant-access-debug";
import { logMerchantStoreLayoutExecution } from "@/lib/merchant/merchant-store-layout-instrumentation";
import { getMerchantStoreContext } from "@/lib/merchant/merchant-store-request-dedup";

type Props = {
  children: React.ReactNode;
  params: { vendorId: string };
};

/** Vendor access boundary only — workspace data loads in (workspace)/layout.tsx. */
export default async function MerchantStoreLayout({ children, params }: Props) {
  const pathname = headers().get("x-log-pathname");

  const { vendor } = await getMerchantStoreContext(params.vendorId, {
    caller: "stores/[vendorId]/layout",
    pathname,
  });

  if (!vendor) {
    logMerchantNotFoundTrigger({
      file: "src/app/(merchant)/merchant/stores/[vendorId]/layout.tsx",
      line: 22,
      caller: "stores/[vendorId]/layout",
      vendorId: params.vendorId,
      pathname,
    });
    notFound();
  }

  logMerchantStoreLayoutExecution({
    layout: "root",
    vendorId: params.vendorId,
    pathname,
  });

  return <>{children}</>;
}
