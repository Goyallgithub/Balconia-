import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";

const BASE_URL = "http://localhost:3001";

describe("TASK 8 — Premium Mobile-Responsive Experience", () => {
  const viewports = [
    { name: "iPhone SE (1st gen)", width: 320 },
    { name: "Samsung Galaxy S8+", width: 360 },
    { name: "iPhone SE / Mini", width: 375 },
    { name: "iPhone 12 / 13 / 14 / 15", width: 390 },
    { name: "iPhone 14 / 15 Pro Max", width: 430 },
    { name: "iPad Portrait / Tablet", width: 768 },
    { name: "iPad Landscape / Laptop", width: 1024 },
    { name: "Desktop Monitor", width: 1440 },
  ];

  describe("8.1 Viewport Metadata & Overflow-X Prevention", () => {
    test("All primary HTML pages include proper viewport meta tags", async () => {
      const pages = ["index.html", "catalogue.html", "cart.html", "checkout.html", "diwali.html"];
      for (const pageName of pages) {
        const filePath = path.join(process.cwd(), "public", pageName);
        const html = await fs.readFile(filePath, "utf8");
        assert.ok(
          html.includes('<meta name="viewport" content="width=device-width,initial-scale=1">') ||
          html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'),
          `Page ${pageName} must include standard responsive viewport meta tag`
        );
      }
    });

    test("CSS enforces horizontal overflow containment and 100vw maximum width", async () => {
      const themeCss = await fs.readFile(path.join(process.cwd(), "public", "premium-theme.css"), "utf8");
      assert.ok(themeCss.includes("overflow-x: hidden"), "Must prevent accidental horizontal scrolling");
      assert.ok(themeCss.includes("max-width: 100vw"), "Must constrain maximum viewport width");
    });
  });

  describe("8.2 Viewport Coverage (320px to 1440px)", () => {
    test("CSS rules cover mobile, tablet, and desktop breakpoints", async () => {
      const themeCss = await fs.readFile(path.join(process.cwd(), "public", "premium-theme.css"), "utf8");
      const shopCss = await fs.readFile(path.join(process.cwd(), "public", "shop.css"), "utf8");
      const styleCss = await fs.readFile(path.join(process.cwd(), "public", "style.css"), "utf8");
      const combined = themeCss + "\n" + shopCss + "\n" + styleCss;

      // Ultra-compact mobile (320px - 360px)
      assert.ok(combined.includes("max-width: 360px"), "Must have dedicated <= 360px ultra-compact styles");

      // Standard mobile (375px - 430px)
      assert.ok(combined.includes("max-width: 500px") || combined.includes("max-width: 600px"), "Must have mobile styles for <= 500px/600px");

      // Tablet portrait (768px)
      assert.ok(combined.includes("max-width: 768px") || combined.includes("max-width: 850px"), "Must have tablet portrait styles");

      // Small laptop / Tablet landscape (1024px)
      assert.ok(combined.includes("max-width: 1024px") || combined.includes("max-width: 900px"), "Must have desktop/tablet breakpoint styles");

      // Desktop wide monitor (1440px / 1500px)
      assert.ok(combined.includes("1500px") || combined.includes("1300px"), "Must constrain maximum container width for wide desktops");
    });

    test("Ultra-compact 320px layout switches product grid to single column to avoid cramped cards", async () => {
      const themeCss = await fs.readFile(path.join(process.cwd(), "public", "premium-theme.css"), "utf8");
      assert.ok(themeCss.includes(".product-grid {\n    grid-template-columns: 1fr !important;\n  }") ||
                themeCss.includes("grid-template-columns: 1fr !important"),
                "Single column grid must activate on ultra-compact mobile (<= 360px)");
    });
  });

  describe("8.3 Touch Comfort & iOS Safari Usability", () => {
    test("Interactive elements enforce minimum 44px touch targets", async () => {
      const themeCss = await fs.readFile(path.join(process.cwd(), "public", "premium-theme.css"), "utf8");
      assert.ok(themeCss.includes("min-height: 44px"), "Interactive controls must enforce 44px touch target height");
    });

    test("Inputs enforce >= 16px font size on mobile to prevent iOS Safari auto-zoom", async () => {
      const themeCss = await fs.readFile(path.join(process.cwd(), "public", "premium-theme.css"), "utf8");
      assert.ok(themeCss.includes("font-size: 16px !important"), "Must enforce >= 16px font-size on mobile inputs");
    });

    test("Body respects safe-area-inset-bottom for notched devices", async () => {
      const themeCss = await fs.readFile(path.join(process.cwd(), "public", "premium-theme.css"), "utf8");
      assert.ok(themeCss.includes("env(safe-area-inset-bottom"), "Must include safe-area insets");
    });
  });

  describe("8.4 Mobile Form Usability, Camera & OTP Autofill", () => {
    test("Photograph upload input supports device camera and mobile image selection", async () => {
      const indexHtml = await fs.readFile(path.join(process.cwd(), "public", "index.html"), "utf8");
      assert.ok(indexHtml.includes('id="balcony-photo" type="file" accept="image/jpeg,image/png,image/webp,image/*"'));
    });

    test("OTP input supports native mobile autofill via autocomplete='one-time-code'", async () => {
      const authJs = await fs.readFile(path.join(process.cwd(), "public", "auth.js"), "utf8");
      assert.ok(authJs.includes('autocomplete="one-time-code"'), "OTP input must have one-time-code autocomplete");
      assert.ok(authJs.includes('inputmode="numeric"'), "OTP input must specify numeric keyboard");
    });

    test("Dialogs are scrollable and keyboard-safe on mobile screens", async () => {
      const themeCss = await fs.readFile(path.join(process.cwd(), "public", "premium-theme.css"), "utf8");
      assert.ok(themeCss.includes("max-height: 88vh"), "Dialogs must fit within 88vh to avoid keyboard obstruction");
      assert.ok(themeCss.includes("-webkit-overflow-scrolling: touch"), "Must support smooth momentum scrolling on iOS");
    });
  });

  describe("8.5 Floating Widget Protection in Checkout & Cart", () => {
    test("Floating WhatsApp widget adjusts position to not obstruct checkout action buttons", async () => {
      const themeCss = await fs.readFile(path.join(process.cwd(), "public", "premium-theme.css"), "utf8");
      assert.ok(themeCss.includes('body[data-page="checkout"] balconia-whatsapp-help'),
        "Must adjust WhatsApp widget on checkout page to avoid blocking place-order CTA");
    });
  });
});
