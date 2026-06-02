type Props = {
  url: string | null | undefined;
  alt: string;
  size?: number;
};

export function ProductThumbnail({ url, alt, size = 48 }: Props) {
  if (!url) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-400"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="h-12 w-12 shrink-0 rounded-md border border-slate-200 bg-white object-cover"
      style={{ width: size, height: size }}
    />
  );
}
