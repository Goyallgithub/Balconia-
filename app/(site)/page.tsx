import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { IntroBand } from "@/components/IntroBand";
import { TransformationCarousel } from "@/components/TransformationCarousel";
import { Paths } from "@/components/Paths";
import { ShopPreview } from "@/components/ShopPreview";
import { Testimonials } from "@/components/Testimonials";
import { getFeaturedGallery } from "@/data/gallery";
import { getFeaturedProducts } from "@/data/products";

export const metadata: Metadata = {
  title: "Balconia | Balcony makeovers and shop across India",
  description:
    "Before and after balcony transformations, a curated decor shop, and full makeover booking. Diwali Edit live. Design and decor, delivered.",
};

export default function HomePage() {
  const gallery = getFeaturedGallery();
  const products = getFeaturedProducts();

  return (
    <>
      <Hero />
      <IntroBand />
      <TransformationCarousel items={gallery} />
      <Paths />
      <ShopPreview products={products} />
      <Testimonials />
    </>
  );
}
