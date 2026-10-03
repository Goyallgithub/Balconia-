"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { ProductCard } from "@/components/ProductCard";
import { getGalleryItem } from "@/data/gallery";
import { getProduct } from "@/data/products";
import { useCartStore } from "@/store/cart";
import { formatINR } from "@/lib/format";

export default function GalleryDetailPage() {
  const params = useParams<{ slug: string }>();
  const item = getGalleryItem(params.slug);
  const add = useCartStore((s) => s.add);

  if (!item) notFound();

  const products = item.productSlugs
    .map((s) => getProduct(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const total = products.reduce((n, p) => n + p.price, 0);

  return (
    <div className="bg-plaster px-4 py-10 pb-28 md:px-8 md:py-16">
      <div className="mx-auto max-w-[1000px]">
        <p className="furniture text-grey">
          <Link href="/gallery" className="tap-inline">
            Gallery
          </Link>{" "}
          / {item.city}
        </p>
        <h1 className="display mt-3 text-[clamp(2.25rem,6vw,4rem)] tracking-[-0.04em]">
          {item.title}
        </h1>
        <p className="furniture mt-3 text-grey">
          {item.city} · {item.size} · {item.style} · {item.budget}
        </p>
        <p className="mt-5 max-w-2xl text-ink/75">{item.caption}</p>

        <div className="mt-10">
          <BeforeAfterSlider
            beforeSrc={item.before}
            afterSrc={item.after}
            beforeAlt={`${item.title} before`}
            afterAlt={`${item.title} after`}
            aspectClassName="aspect-[4/5] md:aspect-[16/11]"
          />
        </div>

        <section className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="display text-3xl tracking-[-0.03em]">
              Shop this look
            </h2>
            <div className="text-right">
              <p className="furniture text-grey">Bundle total</p>
              <p className="price text-xl">{formatINR(total)}</p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary mt-6"
            onClick={() => {
              products.forEach((p) =>
                add({
                  slug: p.slug,
                  name: p.name,
                  price: p.price,
                  image: p.images[0],
                })
              );
            }}
          >
            Add all to cart
          </button>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
            {products.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
