import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { logMerchantNotFoundTrigger } from "@/lib/debug/merchant-access-debug";
import { logMerchantStoreLayoutExecution } from "@/lib/merchant/merchant-store-layout-instrumentation";
import { getMerchantStoreContext } from "@/lib/merchant/merchant-store-request-dedup";
import { renderMerchantStoreShell } from "@/lib/merchant/render-merchant-store-shell";
import { loadStoreOsWorkspaceData } from "@/lib/merchant/store-os-workspace-data";

type Props = {
  children: React.ReactNode;
  params: { vendorId: string };
};

const WORKSPACE_QUERIES = [
  "listVendorOffersDetailed",
  "listCatalogProductRequestsForVendor",
  "isVendorOwner",
] as const;

/** Workspace list/overview routes — loads full workspaceData contract. */
export default async function MerchantStoreWorkspaceLayout({ children, params }: Props) {
  const pathname = headers().get("x-log-pathname");

  const { supabase, user, vendor } = await getMerchantStoreContext(params.vendorId, {
    caller: "stores/[vendorId]/(workspace)/layout",
    pathname,
  });

  if (!vendor) {
    logMerchantNotFoundTrigger({
      file: "src/app/(merchant)/merchant/stores/[vendorId]/(workspace)/layout.tsx",
      line: 30,
      caller: "stores/[vendorId]/(workspace)/layout",
      vendorId: params.vendorId,
      pathname,
    });
    notFound();
  }

  logMerchantStoreLayoutExecution({
    layout: "workspace",
    vendorId: params.vendorId,
    pathname,
    workspaceQueries: [...WORKSPACE_QUERIES],
  });

  const workspaceData = await loadStoreOsWorkspaceData(supabase, vendor, user.id, pathname);

  return renderMerchantStoreShell({
    vendor,
    userEmail: user.email ?? user.id,
    workspaceData,
    children,
  });
}

