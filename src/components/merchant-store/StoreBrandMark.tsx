"use client";

import { useState } from "react";

const MARKETPLACE_FALLBACK_LABEL = "Marketplace Seller";

type Props = {
  vendorName: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
};

function storeInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

function StoreIcon({ size }: { size: number }) {
  return (
    <svg
      className="text-zinc-500/90"
      style={{ width: size * 0.4, height: size * 0.4 }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9.75h18M5.25 9.75V19.5h13.5V9.75M9 13.5h2.25M12.75 13.5H15M9.75 6V4.5h4.5V6"
      />
    </svg>
  );
}

function InitialFallback({ name, size }: { name: string; size: number }) {
  const isGeneric = name.trim() === MARKETPLACE_FALLBACK_LABEL;

  return (
    <span
      className={`flex h-full w-full items-center justify-center shadow-inner ${
        isGeneric
          ? "bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-200/90"
          : "bg-gradient-to-br from-emerald-50/90 via-white to-zinc-100"
      }`}
      aria-hidden
    >
      {isGeneric ? (
        <StoreIcon size={size} />
      ) : (
        <span
          className="font-semibold tracking-tight text-emerald-800/90"
          style={{ fontSize: Math.max(11, Math.round(size * 0.36)) }}
        >
          {storeInitial(name)}
        </span>
      )}
    </span>
  );
}

export function StoreBrandMark({ vendorName, logoUrl, size = 40, className = "" }: Props) {
  const url = logoUrl?.trim() || null;
  const [phase, setPhase] = useState<"idle" | "loading" | "loaded" | "error">(
    url ? "loading" : "idle",
  );

  const showImage = url && phase !== "error" && phase !== "idle";
  const showSkeleton = url && phase === "loading";
  const showFallback = !url || phase === "error";

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-zinc-200/60 ${className}`}
      style={{ width: size, height: size, maxWidth: size, maxHeight: size }}
      title={vendorName}
    >
      {showFallback ? <InitialFallback name={vendorName} size={size} /> : null}

      {showSkeleton ? (
        <span className="absolute inset-0 animate-pulse bg-zinc-100" aria-hidden />
      ) : null}

      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full max-h-full max-w-full object-cover transition-opacity duration-300 ease-out"
          onLoad={() => setPhase("loaded")}
          onError={() => setPhase("error")}
        />
      ) : null}
    </div>
  );
}
