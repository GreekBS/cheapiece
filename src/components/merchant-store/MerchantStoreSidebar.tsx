"use client";



import Link from "next/link";



import type { StoreOsActiveView } from "@/components/merchant-store/os/store-os-view-types";

import { storeOsViewToPath } from "@/lib/merchant/resolve-store-os-view";



import { useMerchantActiveVendor } from "./MerchantActiveVendorContext";

import { StoreBrandMark } from "./StoreBrandMark";
import { StoreOsBadge } from "./os/StoreOsBadge";



type NavItem =

  | { kind: "link"; view: StoreOsActiveView; label: string }

  | { kind: "disabled"; label: string; badge?: string };



const navItems: NavItem[] = [

  { kind: "link", view: "overview", label: "Αρχική" },

  { kind: "link", view: "products", label: "Προϊόντα" },

  { kind: "link", view: "offers", label: "Προσφορές" },

  { kind: "disabled", label: "Παραγγελίες", badge: "Soon" },

  { kind: "disabled", label: "Analytics", badge: "Soon" },

  { kind: "link", view: "settings", label: "Ρυθμίσεις" },

];



type Props = {

  activeView: StoreOsActiveView;

};



export function MerchantStoreSidebar({ activeView }: Props) {

  const vendor = useMerchantActiveVendor();



  return (

    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200/90 bg-white md:h-full md:w-[248px] md:border-b-0 md:border-r">

      <div className="hidden border-b border-slate-100 px-4 py-4 md:block">
        <div className="flex items-center justify-start">
          <StoreBrandMark vendorName={vendor.vendorName} logoUrl={vendor.logoUrl} />
        </div>
      </div>



      <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:p-3">

        {navItems.map((item) => {

          if (item.kind === "disabled") {

            return (

              <div

                key={item.label}

                className="flex shrink-0 items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-400 md:shrink"

                aria-disabled

              >

                <span>{item.label}</span>

                {item.badge ? <StoreOsBadge variant="soon">{item.badge}</StoreOsBadge> : null}

              </div>

            );

          }



          const href = storeOsViewToPath(vendor.vendorId, item.view);

          const active = activeView === item.view;

          return (

            <Link

              key={item.view}

              href={href}

              className={[

                "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:shrink",

                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",

              ].join(" ")}

            >

              {item.label}

            </Link>

          );

        })}

      </nav>

    </aside>

  );

}


