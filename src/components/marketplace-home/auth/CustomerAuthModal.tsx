"use client";

import { useCallback, useEffect, useId, useRef } from "react";

import { ForgotPanel } from "@/components/marketplace-home/auth/ForgotPanel";
import { SignInPanel } from "@/components/marketplace-home/auth/SignInPanel";
import { SignUpPanel } from "@/components/marketplace-home/auth/SignUpPanel";

export type CustomerAuthPanel = "sign-in" | "sign-up" | "forgot";

type Props = {
  open: boolean;
  panel: CustomerAuthPanel;
  onClose: () => void;
  onPanelChange: (panel: CustomerAuthPanel) => void;
  onAuthSuccess: () => void;
};

export function CustomerAuthModal({ open, panel, onClose, onPanelChange, onAuthSuccess }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onOverlayPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const stopPanelPointerBubble = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  const panelKeyRef = useRef(0);

  useEffect(() => {
    if (open) {
      panelKeyRef.current += 1;
    }
  }, [open, panel]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onPointerDown={onOverlayPointerDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-8"
        onPointerDown={stopPanelPointerBubble}
      >
        <div key={panelKeyRef.current}>
          {panel === "sign-in" ? (
            <SignInPanel
              onSuccess={onAuthSuccess}
              onForgot={() => onPanelChange("forgot")}
              onSignUp={() => onPanelChange("sign-up")}
            />
          ) : null}
          {panel === "sign-up" ? (
            <SignUpPanel
              onBackToSignIn={() => onPanelChange("sign-in")}
              onSignedUpAndSession={onAuthSuccess}
            />
          ) : null}
          {panel === "forgot" ? <ForgotPanel onBackToSignIn={() => onPanelChange("sign-in")} /> : null}
        </div>
      </div>
    </div>
  );
}
