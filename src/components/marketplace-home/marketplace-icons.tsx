type IconProps = { className?: string };

/** Premium text wordmark for public homepage (nav / footer). */
export function TsipisWordmark({ className }: IconProps) {
  return (
    <span
      className={`inline-flex items-baseline font-semibold tracking-[-0.02em] ${className ?? ""}`}
      aria-label="Tsipis"
    >
      <span className="text-[1.35rem] text-slate-900 sm:text-2xl">Tsip</span>
      <span className="text-[1.35rem] text-cyan-700 sm:text-2xl">i</span>
      <span className="text-[1.35rem] text-slate-900 sm:text-2xl">s</span>
    </span>
  );
}

export function TsipisWordmarkLight({ className }: IconProps) {
  return (
    <span className={`inline-flex items-baseline font-semibold tracking-[-0.02em] ${className ?? ""}`} aria-label="Tsipis">
      <span className="text-lg text-white">Tsip</span>
      <span className="text-lg text-cyan-400">i</span>
      <span className="text-lg text-white">s</span>
    </span>
  );
}

export function LogoMark() {
  return (
    <svg className="h-9 w-9 shrink-0 rounded-xl bg-slate-900 p-1.5 text-white shadow-sm shadow-slate-900/20" viewBox="0 0 32 32" aria-hidden>
      <path fill="currentColor" d="M8 10h16v2H8V10zm0 5h10v2H8v-2zm0 5h14v2H8v-2z" opacity=".9" />
      <circle cx="24" cy="11" r="3" fill="#22d3ee" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20 16.5 16.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconCart({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 6h15l-1.5 9H7.5L6 6Zm0 0-.75-3H3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

export function IconUser({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3.13-6 7-6s7 2.5 7 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconHeart({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 21s-7-4.35-7-10a5 5 0 0 1 9.09-3A5 5 0 0 1 19 11c0 5.65-7 10-7 10Z" strokeLinejoin="round" />
    </svg>
  );
}

const iconBox = "h-6 w-6 text-slate-600";

export function TrustGlyph({ name }: { name: string }) {
  switch (name) {
    case "verified":
      return (
        <svg className={iconBox} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" strokeLinejoin="round" />
          <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "secure":
      return (
        <svg className={iconBox} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="5" y="11" width="14" height="10" rx="2" strokeLinejoin="round" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "prices":
      return (
        <svg className={iconBox} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 3v18M5 12H3m6 0H7m14 0h-2m-6 0h-2" strokeLinecap="round" />
          <path d="m16 8 2-2 2 2M8 16l-2 2-2-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "reviews":
      return (
        <svg className={iconBox} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2Z" strokeLinejoin="round" />
        </svg>
      );
    case "speed":
      return (
        <svg className={iconBox} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function CategoryGlyph({ slug }: { slug: string }) {
  const common = "h-7 w-7 text-current";
  switch (slug) {
    case "tech":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="7" y="7" width="10" height="10" rx="2" />
          <path d="M9 17v3M15 17v3" strokeLinecap="round" />
        </svg>
      );
    case "home":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
        </svg>
      );
    case "gaming":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="4" y="8" width="16" height="9" rx="2" />
          <path d="M8 12v2M7 13h2M16 13h2M15 12v2" strokeLinecap="round" />
        </svg>
      );
    case "fashion":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M8 7h8l1 4H7l1-4Z" strokeLinejoin="round" />
          <path d="M9 11v10M15 11v10" strokeLinecap="round" />
        </svg>
      );
    case "beauty":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M12 3v18M9 8h6M9 12h6" strokeLinecap="round" />
        </svg>
      );
    case "sports":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="12" cy="7" r="3" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" strokeLinecap="round" />
        </svg>
      );
    case "appliances":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M9 9h6M9 13h4" strokeLinecap="round" />
        </svg>
      );
    case "business":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
          <path d="M20 8h-2V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z" />
          <path d="M16 8V6a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2" />
          <path d="M4 14h16" strokeLinecap="round" />
        </svg>
      );
    case "auto":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M5 17h14v-2l-1.5-4h-11L5 15v2Z" strokeLinejoin="round" />
          <circle cx="8.5" cy="17" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="17" r="1.25" fill="currentColor" stroke="none" />
          <path d="M5 15h-1.5l-1-2h2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
  }
}
