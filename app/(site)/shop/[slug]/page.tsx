import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProduct,
  getProducts,
  getRelatedProducts,
} from "@/data/products";
import { getGalleryByProduct } from "@/data/gallery";
import { SoftImage } from "@/components/SoftImage";
import { ProductCard } from "@/components/ProductCard";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { AddToCartButton } from "@/components/AddToCartButton";
import { formatINR } from "@/lib/format";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return getProducts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const product = getProduct(params.slug);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.images[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export default function ProductPage({ params }: Props) {
  const product = getProduct(params.slug);
  if (!product) notFound();

  const related = getRelatedProducts(product.slug);
  const seenIn = getGalleryByProduct(product.slug);
  const off =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) *
            100
        )
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.images,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="bg-plaster pb-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-10 md:grid-cols-2 md:gap-14 md:px-8 md:py-16">
        <div className="relative aspect-[4/5] overflow-hidden bg-paper-2">
          <SoftImage
            src={product.images[0]}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            filename={`${product.slug}-1.jpg`}
          />
          {product.isDiwali ? (
            <span className="furniture absolute left-3 top-3 bg-marigold px-2 py-1 text-ink">
              Diwali Edit
            </span>
          ) : null}
        </div>

        <div>
          <p className="furniture text-grey">
            <Link href="/shop" className="tap-inline">
              Shop
            </Link>{" "}
            / {product.category}
          </p>
          <h1 className="display mt-3 text-[clamp(2rem,5vw,3.5rem)] tracking-[-0.04em]">
            {product.name}
          </h1>
          <p className="price mt-4 text-2xl">
            {formatINR(product.price)}
            {product.compareAtPrice ? (
              <>
                <span className="ml-3 text-base text-grey line-through">
                  {formatINR(product.compareAtPrice)}
                </span>
                {off ? (
                  <span className="ml-2 text-sm text-accent">{off}% off</span>
                ) : null}
              </>
            ) : null}
          </p>
          <p className="mt-5 max-w-md leading-relaxed text-ink/75">
            {product.shortDescription}
          </p>

          <div className="mt-8">
            <AddToCartButton product={product} />
          </div>

          <ul className="mt-8 grid gap-3 border-t border-ink/10 pt-6 text-sm text-ink/70">
            <li>Free shipping above ₹1,999</li>
            <li>7-day returns on unused items</li>
            <li>Pay by UPI · we confirm before shipping</li>
          </ul>

          <details className="mt-8 border-t border-ink/15 pt-4">
            <summary className="cursor-pointer py-2 font-medium">Details</summary>
            <p className="pb-4 text-sm leading-relaxed text-ink/70">
              {product.longDescription}
            </p>
            <ul className="space-y-1 pb-4 text-sm text-ink/70">
              {product.specs.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </details>
          <details className="border-t border-ink/15 pt-4">
            <summary className="cursor-pointer py-2 font-medium">
              Dimensions and material
            </summary>
            <p className="pb-4 text-sm text-ink/70">
              {product.dimensions}
              <br />
              {product.material}
            </p>
          </details>
          <details className="border-t border-ink/15 pt-4">
            <summary className="cursor-pointer py-2 font-medium">Care</summary>
            <p className="pb-4 text-sm text-ink/70">{product.care}</p>
          </details>
          <details className="border-t border-ink/15 pt-4">
            <summary className="cursor-pointer py-2 font-medium">
              Shipping and returns
            </summary>
            <p className="pb-4 text-sm text-ink/70">
              Ships in 3 to 5 days across India. Unused items in original
              packaging returnable within 7 days.
            </p>
          </details>
        </div>
      </div>

      {seenIn.length > 0 ? (
        <section className="border-t border-ink/10 px-4 py-16 md:px-8">
          <div className="mx-auto max-w-[1200px]">
            <h2 className="display text-3xl tracking-[-0.03em]">
              Seen in these balconies
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {seenIn.map((g) => (
                <div key={g.slug}>
                  <BeforeAfterSlider
                    beforeSrc={g.before}
                    afterSrc={g.after}
                    beforeAlt={`${g.title} before`}
                    afterAlt={`${g.title} after`}
                    aspectClassName="aspect-[16/10]"
                  />
                  <Link
                    href={`/gallery/${g.slug}`}
                    className="mt-3 inline-block tracking-[-0.02em]"
                  >
                    {g.title} · {g.city}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="border-t border-ink/10 bg-paper px-4 py-16 md:px-8">
          <div className="mx-auto max-w-[1200px]">
            <h2 className="display text-3xl tracking-[-0.03em]">
              Complete the look
            </h2>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {related.map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
