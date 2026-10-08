"use client";

import { useState } from "react";
import { SoftImage } from "@/components/SoftImage";
import { cn } from "@/lib/cn";

type Props = {
  images: string[];
  name: string;
  badge?: string | null;
};

export function ProductGallery({ images, name, badge }: Props) {
  const photos = images.length > 0 ? images : ["/photos/hero-still.jpg"];
  const [active, setActive] = useState(0);
  const current = photos[Math.min(active, photos.length - 1)];

  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden bg-paper-2">
        <SoftImage
          src={current}
          alt={`${name} — photo ${active + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          filename={`${name}-${active + 1}.jpg`}
        />
        {badge ? (
          <span className="furniture absolute left-3 top-3 bg-marigold px-2 py-1 text-ink">
            {badge}
          </span>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {photos.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden border bg-paper-2 transition-opacity",
                i === active ? "border-ink opacity-100" : "border-ink/15 opacity-70"
              )}
              onClick={() => setActive(i)}
            >
              <SoftImage
                src={src}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                filename={`thumb-${i + 1}.jpg`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
