type Image = { id: number; caption: string };

export default function ImpressionStrip({ images }: { images: Image[] }) {
  if (images.length > 0) {
    return (
      <section>
        <h2 className="mb-4 text-lg font-semibold">Impressionen</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((image) => (
            <figure key={image.id} className="overflow-hidden rounded-lg bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/galerie/${image.id}`}
                alt={image.caption || ""}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
              {image.caption ? <figcaption className="px-3 py-2 text-xs text-stone-500">{image.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Impressionen</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {placeholders.map((item) => (
          <figure key={item.label} className="overflow-hidden rounded-lg bg-green-100/80">
            <div className="flex aspect-[4/3] items-center justify-center p-4 text-green-800">{item.art}</div>
            <figcaption className="px-3 py-2 text-xs text-stone-500">{item.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

const placeholders = [
  {
    label: "Laube",
    art: (
      <svg viewBox="0 0 80 60" aria-hidden className="h-16 w-20">
        <path d="M10 50 V28 L40 10 L70 28 V50" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="32" y="34" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    label: "Beete",
    art: (
      <svg viewBox="0 0 80 60" aria-hidden className="h-16 w-20">
        <path d="M8 42h64M8 28h64" stroke="currentColor" strokeWidth="3" />
        <circle cx="22" cy="22" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="40" cy="18" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="58" cy="22" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    label: "Wege",
    art: (
      <svg viewBox="0 0 80 60" aria-hidden className="h-16 w-20">
        <path d="M18 50 C28 32, 36 28, 40 8" fill="none" stroke="currentColor" strokeWidth="6" />
        <path d="M40 8 C46 28, 54 34, 64 50" fill="none" stroke="currentColor" strokeWidth="6" />
      </svg>
    ),
  },
  {
    label: "Vereinsfest",
    art: (
      <svg viewBox="0 0 80 60" aria-hidden className="h-16 w-20">
        <path d="M16 46h48L52 22H28Z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M40 22 V12" stroke="currentColor" strokeWidth="3" />
        <circle cx="40" cy="10" r="3" fill="currentColor" />
      </svg>
    ),
  },
];
