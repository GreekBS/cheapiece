type GalleryImage = {
  url: string;
  sortOrder: number;
};

type Props = {
  title: string;
  heroUrl: string | null;
  galleryImages: GalleryImage[];
};

function ImagePlaceholder() {
  return (
    <div className="flex aspect-square max-h-[28rem] w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400">
      <svg className="h-16 w-16 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <path d="m21 15-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function ProductPdpGallery({ title, heroUrl, galleryImages }: Props) {
  return (
    <section className="min-w-0 space-y-3" aria-label="Product images">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt={title}
            className="aspect-square w-full max-h-[28rem] object-cover object-center"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>
      {galleryImages.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {galleryImages.map((img) => (
            <div
              key={img.url}
              className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
