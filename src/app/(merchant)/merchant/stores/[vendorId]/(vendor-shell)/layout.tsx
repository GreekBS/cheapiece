import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { logMerchantNotFoundTrigger } from "@/lib/debug/merchant-access-debug";
import { logMerchantStoreLayoutExecution } from "@/lib/merchant/merchant-store-layout-instrumentation";
import { getMerchantStoreContext } from "@/lib/merchant/merchant-store-request-dedup";
import { renderMerchantStoreShell } from "@/lib/merchant/render-merchant-store-shell";
import { createEmptyStoreOsWorkspaceData } from "@/lib/merchant/store-os-workspace-data";

type Props = {
  children: React.ReactNode;
  params: { vendorId: string };
};

/** Settings/form routes — shell only, no workspace list queries. */
export default async function MerchantStoreVendorShellLayout({ children, params }: Props) {
  const pathname = headers().get("x-log-pathname");

  const { user, vendor } = await getMerchantStoreContext(params.vendorId, {
    caller: "stores/[vendorId]/(vendor-shell)/layout",
    pathname,
  });

  if (!vendor) {
    logMerchantNotFoundTrigger({
      file: "src/app/(merchant)/merchant/stores/[vendorId]/(vendor-shell)/layout.tsx",
      line: 24,
      caller: "stores/[vendorId]/(vendor-shell)/layout",
      vendorId: params.vendorId,
      pathname,
    });
    notFound();
  }

  logMerchantStoreLayoutExecution({
    layout: "vendor-shell",
    vendorId: params.vendorId,
    pathname,
    workspaceQueries: [],
  });

  const workspaceData = createEmptyStoreOsWorkspaceData(vendor.name);

  return renderMerchantStoreShell({
    vendor,
    userEmail: user.email ?? user.id,
    workspaceData,
    children,
  });
}
