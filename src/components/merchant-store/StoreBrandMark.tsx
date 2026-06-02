"use client";

import { useState } from "react";

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

function InitialFallback({ name, size }: { name: string; size: number }) {
  return (
    <span
      className="flex items-center justify-center bg-slate-200 text-sm font-semibold text-slate-700"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {storeInitial(name)}
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
      className={`relative shrink-0 overflow-hidden rounded-lg bg-slate-100 ${className}`}
      style={{ width: size, height: size, maxWidth: size, maxHeight: size }}
      title={vendorName}
    >
      {showFallback ? <InitialFallback name={vendorName} size={size} /> : null}

      {showSkeleton ? (
        <span
          className="absolute inset-0 animate-pulse bg-slate-200"
          aria-hidden
        />
      ) : null}

      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full max-h-full max-w-full object-cover"
          onLoad={() => setPhase("loaded")}
          onError={() => setPhase("error")}
        />
      ) : null}
    </div>
  );
}
