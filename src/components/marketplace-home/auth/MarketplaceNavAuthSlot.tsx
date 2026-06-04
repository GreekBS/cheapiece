"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  CustomerAuthModal,
  type CustomerAuthPanel,
} from "@/components/marketplace-home/auth/CustomerAuthModal";
import { MarketplaceUserMenu } from "@/components/marketplace-home/auth/MarketplaceUserMenu";
import { marketplaceSignInCta } from "@/components/marketplace-home/auth/marketplace-auth-tokens";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export type MarketplaceNavAuthInitial = {
  userId: string | null;
  email: string | null;
  displayName: string | null;
};

type Props = {
  initial: MarketplaceNavAuthInitial;
};

export function MarketplaceNavAuthSlot({ initial }: Props) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(initial.userId);
  const [email, setEmail] = useState<string | null>(initial.email);
  const [displayName, setDisplayName] = useState<string | null>(initial.displayName);
  const [modalOpen, setModalOpen] = useState(false);
  const [panel, setPanel] = useState<CustomerAuthPanel>("sign-in");

  const syncFromSession = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setEmail(null);
      setDisplayName(null);
      return;
    }
    setUserId(user.id);
    setEmail(user.email ?? null);

    const metaName =
      typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const profileName =
      profile && typeof profile.display_name === "string" ? profile.display_name : null;

    setDisplayName(profileName ?? metaName ?? user.email?.split("@")[0] ?? null);
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncFromSession();
    });
    return () => subscription.unsubscribe();
  }, [syncFromSession]);

  const openSignIn = useCallback(() => {
    setPanel("sign-in");
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setPanel("sign-in");
  }, []);

  const handleAuthSuccess = useCallback(() => {
    closeModal();
    router.refresh();
    void syncFromSession();
  }, [closeModal, router, syncFromSession]);

  const handleSignOut = useCallback(() => {
    router.refresh();
    void syncFromSession();
  }, [router, syncFromSession]);

  if (userId) {
    return (
      <MarketplaceUserMenu
        displayName={displayName ?? email ?? ""}
        email={email ?? ""}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <>
      <button type="button" onClick={openSignIn} className={marketplaceSignInCta}>
        Σύνδεση
      </button>
      <CustomerAuthModal
        open={modalOpen}
        panel={panel}
        onClose={closeModal}
        onPanelChange={setPanel}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
