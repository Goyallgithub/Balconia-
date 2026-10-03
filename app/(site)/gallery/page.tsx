import type { Metadata } from "next";
import Link from "next/link";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { SplitWords } from "@/components/SplitWords";
import { getGallery } from "@/data/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Before and after balcony transformations across India. Drag to compare, then shop the look.",
};

export default function GalleryPage() {
  const items = getGallery();

  return (
    <div className="bg-plaster px-4 py-12 pb-24 md:px-8 md:py-16">
      <header className="mx-auto max-w-[1440px]">
        <p className="furniture text-grey" data-rev>
          Gallery
        </p>
        <SplitWords
          as="h1"
          className="display mt-3 text-[clamp(2.5rem,8vw,5rem)] tracking-[-0.05em]"
          text="The transformations"
        />
      </header>

      <div className="mx-auto mt-12 grid max-w-[1440px] gap-10 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <article
            key={item.slug}
            data-rev
            style={{ ["--d" as string]: 40 + i * 50 }}
          >
            <BeforeAfterSlider
              beforeSrc={item.before}
              afterSrc={item.after}
              beforeAlt={`${item.title} before in ${item.city}`}
              afterAlt={`${item.title} after in ${item.city}`}
            />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/gallery/${item.slug}`}
                  className="text-xl tracking-[-0.02em]"
                >
                  {item.title}
                </Link>
                <p className="furniture mt-2 text-grey">
                  {item.city} · {item.size} · {item.style} · {item.budget}
                </p>
              </div>
              <Link
                href={`/gallery/${item.slug}`}
                className="furniture shrink-0 text-accent"
              >
                Shop look
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
