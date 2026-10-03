import type { Metadata, Viewport } from "next";
import {
  Bodoni_Moda,
  Caveat_Brush,
  Tiro_Devanagari_Hindi,
} from "next/font/google";
import { Providers } from "@/components/Providers";
import { ProgressRail } from "@/components/ProgressRail";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-bodoni",
  display: "swap",
  axes: ["opsz"],
  adjustFontFallback: false,
});

const caveat = Caveat_Brush({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-caveat",
  display: "swap",
});

const hindi = Tiro_Devanagari_Hindi({
  subsets: ["devanagari", "latin"],
  weight: "400",
  variable: "--font-hindi",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://balconia.in"),
  title: {
    default: "Balconia | Balcony makeovers across India",
    template: "%s | Balconia",
  },
  description:
    "Stunning before and after balcony transformations. Book a full makeover or shop a curated DIY list. Design and decor, delivered across India.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Balconia",
    title: "Balconia | Balcony makeovers across India",
    description:
      "Stunning before and after balcony transformations. Book a full makeover or shop a curated DIY list.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Balconia",
    description: "Balcony makeovers and curated decor across India.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#F8F4EC",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${caveat.variable} ${hindi.variable}`}
    >
      <head>
        <link rel="preload" as="image" href="/photos/hero-still.jpg" />
      </head>
      <body className="font-bodoni">
        <Providers>
          <ProgressRail />
          {children}
        </Providers>
      </body>
    </html>
  );
}
