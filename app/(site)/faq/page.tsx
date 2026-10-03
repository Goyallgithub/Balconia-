import type { Metadata } from "next";
import { FAQ } from "@/components/FAQ";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Cities we serve, makeover timelines, shipping across India, returns, and UPI payments.",
};

export default function FAQPage() {
  return (
    <div className="bg-plaster pb-24">
      <FAQ />
    </div>
  );
}
