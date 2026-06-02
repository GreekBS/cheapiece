"use client";

import { useState } from "react";

import type { VendorNavContext } from "./VendorSidebar";
import { VendorSidebar } from "./VendorSidebar";
import { VendorTopbar } from "./VendorTopbar";

type Props = {
  vendors: VendorNavContext[];
  userEmail: string;
  children: React.ReactNode;
};

export function VendorShell({ vendors, userEmail, children }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-zinc-900/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <VendorSidebar
        vendors={vendors}
        open={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col md:pl-0">
        <VendorTopbar
          vendors={vendors}
          userEmail={userEmail}
          onMenuClick={() => setMobileNavOpen((o) => !o)}
        />
        <div className="flex-1 overflow-auto px-4 py-6 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}
