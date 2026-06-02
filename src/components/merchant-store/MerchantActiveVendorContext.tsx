"use client";

import { createContext, useContext } from "react";

import type { MerchantActiveVendor } from "@/lib/merchant/types";

const MerchantActiveVendorContext = createContext<MerchantActiveVendor | null>(null);

export function MerchantActiveVendorProvider({
  value,
  children,
}: {
  value: MerchantActiveVendor;
  children: React.ReactNode;
}) {
  return <MerchantActiveVendorContext.Provider value={value}>{children}</MerchantActiveVendorContext.Provider>;
}

export function useMerchantActiveVendor(): MerchantActiveVendor {
  const ctx = useContext(MerchantActiveVendorContext);
  if (!ctx) {
    throw new Error("useMerchantActiveVendor must be used within MerchantActiveVendorProvider");
  }
  return ctx;
}
