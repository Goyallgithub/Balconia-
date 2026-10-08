import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CATEGORY_LABELS,
  PLANT_SUBCATEGORY_LABELS,
  getProduct,
  getProducts,
  getRelatedProducts,
} from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
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
        <ProductGallery
          images={product.images}
          name={product.name}
          badge={
            product.subcategory
              ? PLANT_SUBCATEGORY_LABELS[product.subcategory]
              : product.isDiwali
                ? "Festive"
                : null
          }
        />

        <div>
          <p className="furniture text-grey">
            <Link href="/shop" className="tap-inline">
              Shop
            </Link>{" "}
            /{" "}
            <Link href={`/shop?cat=${product.category}`} className="tap-inline">
              {CATEGORY_LABELS[product.category]}
            </Link>
            {product.subcategory ? (
              <>
                {" "}
                / {PLANT_SUBCATEGORY_LABELS[product.subcategory]}
              </>
            ) : null}
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
