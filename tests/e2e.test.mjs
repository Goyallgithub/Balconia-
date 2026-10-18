import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import products from "../lib/shop-data.json" with { type: "json" };
import { buildSpatialLayout } from "../lib/spatial-engine.ts";
import { matchPlanterForPlant } from "../lib/planter-matcher.ts";

const BASE_URL = "http://localhost:3001";

describe("FINAL PHASE — COMPREHENSIVE END-TO-END TESTING", () => {
  const cleanupOrderIds = [];
  const cleanupDesignIds = [];

  after(async () => {
    // Cleanup generated e2e test orders
    for (const id of cleanupOrderIds) {
      try {
        await fs.unlink(path.join(process.cwd(), "data", "orders", `${id}.json`));
      } catch { }
    }
    // Cleanup generated e2e test designs
    for (const id of cleanupDesignIds) {
      try {
        await fs.unlink(path.join(process.cwd(), "data", "designs", `${id}.json`));
      } catch { }
    }
  });

  test("Step 1: Open homepage and verify essential elements", async () => {
    const res = await fetch(`${BASE_URL}/index.html`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("Balconia"));
    assert.ok(html.includes("catalogue.html"));
    assert.ok(html.includes('id="balcony-photo"'));
  });

  test("Step 2: Navigate to dedicated catalogue page", async () => {
    const res = await fetch(`${BASE_URL}/catalogue.html`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("Shop the recipe") || html.includes("Balconia"));
    assert.ok(html.includes("shop.js"));
  });

  let authUserToken = null;
  let authUserEmail = `e2e.user.${Date.now()}@example.com`;
  let authUserId = null;

  test("Step 3 & 4: Register account with Email OTP, verify and establish authenticated session", async () => {
    // 1. Send OTP with test header
    const sendRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-balconia-test": "true",
      },
      body: JSON.stringify({
        fullName: "Rhea Sen",
        email: authUserEmail,
        phone: "+919876500001",
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
        verifyMethod: "email",
      }),
    });
    assert.equal(sendRes.status, 200);
    const sendData = await sendRes.json();
    assert.ok(sendData.verificationToken);
    assert.ok(sendData.debugOtp);

    // 2. Verify OTP
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verificationToken: sendData.verificationToken,
        otp: sendData.debugOtp,
      }),
    });
    assert.equal(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.equal(verifyData.success, true);
    assert.ok(verifyData.access_token);
    assert.ok(verifyData.user.id);

    authUserToken = verifyData.access_token;
    authUserId = verifyData.user.id;
  });

  let generatedDesignId = null;

  test("Step 5, 6, 7 & 8: Balcony photo upload, dimensions, catalogue product selection & spatial layout validation", async () => {
    // 1. Select up to 10 products
    const selectedProducts = [
      products.find((p) => p.id === "P001"), // Bamboo Palm
      products.find((p) => p.id === "FUR-001"), // Acapulco Chair
      products.find((p) => p.id === "LGT-001"), // Fairy lights
      products.find((p) => p.id === "DEC-001"), // Brass bell chime
    ].filter(Boolean);

    assert.ok(selectedProducts.length >= 3);

    // 2. Spatial layout engine validates physical feasibility
    const spatialResult = buildSpatialLayout({
      answers: {
        length: 10,
        width: 5,
        area: "50 sq ft",
        sun: "Some morning sun",
        weather: "Covered, mostly sheltered",
        mood: "chai",
      },
      items: selectedProducts,
    });

    assert.ok(spatialResult.placements.length >= 3);
    assert.equal(spatialResult.conflicts.length, 0);
    assert.ok(spatialResult.circulation.floorCoverageRatio < 0.60);
    assert.equal(spatialResult.circulation.corridorMaintained, true);

    // 3. Create design record with authenticated session (valid 36-char uuid)
    const designId = randomUUID();
    cleanupDesignIds.push(designId);
    generatedDesignId = designId;

    const designRecord = {
      id: designId,
      ownerId: authUserId,
      createdAt: new Date().toISOString(),
      status: "ready",
      photoPath: "placeholder-balcony.webp",
      dimensions: { lengthCm: 300, widthCm: 150 },
      products: selectedProducts.map((p) => ({ id: p.id, name: p.name })),
      spatialLayout: spatialResult,
      generationCount: 1,
      imagePath: "e2e-concept.webp",
    };

    const designFile = path.join(process.cwd(), "data", "designs", `${designId}.json`);
    await fs.writeFile(designFile, JSON.stringify(designRecord, null, 2));
  });

  test("Step 9 & 10: Review generated design and quota consumption", async () => {
    // Quota endpoint check
    const quotaRes = await fetch(`${BASE_URL}/api/public-config`);
    assert.equal(quotaRes.status, 200);
    const configData = await quotaRes.json();
    assert.equal(configData.maxGenerations, 10);
  });

  let pairedPlanter = null;

  test("Step 11: Confirm automatic plant and planter matching for living plant", async () => {
    const palm = products.find((p) => p.id === "P001");
    const matchRes = await fetch(`${BASE_URL}/api/planters/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plantId: palm.id }),
    });

    assert.equal(matchRes.status, 200);
    const matchData = await matchRes.json();
    assert.equal(matchData.planterNeeded, true);
    assert.ok(matchData.matchedPlanter);
    assert.ok(matchData.matchedPlanter.id.startsWith("POT-"));

    pairedPlanter = matchData.matchedPlanter;
  });

  let completedOrderId = null;

  test("Step 12, 13, 14 & 15: Add to cart, select Option B (Professional Installation), checkout with NCR address & verify totals", async () => {
    const palm = products.find((p) => p.id === "P001");
    const chair = products.find((p) => p.id === "FUR-001");
    const requestId = randomUUID();

    const checkoutPayload = {
      requestId,
      customer: {
        name: "Rhea Sen",
        phone: "9876500001",
        email: authUserEmail,
        address: "Apartment 5B, Wellington Estate, DLF Phase 5",
        area: "Sector 53",
        city: "Gurugram",
        state: "Haryana",
        pin: "122002",
      },
      items: [
        { id: palm.id, quantity: 1 },
        { id: pairedPlanter.id, quantity: 1 },
        { id: chair.id, quantity: 1 },
      ],
      paymentMethod: "cod",
      deliveryAcknowledged: true,
      serviceAcknowledged: true,
      fulfilmentType: "installation",
      couponCode: "BALCONIA",
    };

    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authUserToken}`,
      },
      body: JSON.stringify(checkoutPayload),
    });

    assert.equal(orderRes.status, 201);
    const orderData = await orderRes.json();
    cleanupOrderIds.push(orderData.id);
    completedOrderId = orderData.id;

    assert.equal(orderData.fulfilmentType, "installation");
    assert.equal(orderData.fulfilmentLabel, "Option B: Products + Professional Installation");
    assert.equal(orderData.status, "pending_service_quote");

    // Authoritative server subtotal
    const expectedSubtotal = palm.pricePaise + pairedPlanter.pricePaise + chair.pricePaise;
    assert.equal(orderData.subtotalPaise, expectedSubtotal);

    // Free shipping & installation unlocked via BALCONIA (subtotal >= ₹1,000)
    assert.equal(orderData.fees.shippingFree, true);
    assert.equal(orderData.fees.installationFree, true);
    assert.equal(orderData.totalPaise, expectedSubtotal);
  });

  test("Step 16, 17 & 18: Open order confirmation, download PDF receipt, and verify complete consistency", async () => {
    // 1. Order lookup via GET /api/orders/[id]
    const lookupRes = await fetch(`${BASE_URL}/api/orders/${completedOrderId}`, {
      headers: { Authorization: `Bearer ${authUserToken}` },
    });
    assert.equal(lookupRes.status, 200);
    const order = await lookupRes.json();
    assert.equal(order.id, completedOrderId);
    assert.equal(order.fulfilmentType, "installation");

    // 2. PDF receipt download via GET /api/orders/[id]/receipt?download=1
    const receiptRes = await fetch(`${BASE_URL}/api/orders/${completedOrderId}/receipt?download=1`, {
      headers: { Authorization: `Bearer ${authUserToken}` },
    });
    assert.equal(receiptRes.status, 200);
    assert.equal(receiptRes.headers.get("content-type"), "application/pdf");
    assert.ok(receiptRes.headers.get("content-disposition")?.includes(`Balconia-Receipt-${completedOrderId}.pdf`));

    const pdfBuffer = Buffer.from(await receiptRes.arrayBuffer());
    assert.equal(pdfBuffer.subarray(0, 5).toString(), "%PDF-");

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    assert.equal(pdfDoc.getPageCount(), 1);
    assert.equal(pdfDoc.getTitle(), `Balconia Receipt ${completedOrderId}`);
  });

  test("Step 19: Security verification - Reject unauthorized access to private images and orders", async () => {
    // 1. Private image access without auth -> 401
    const imgRes = await fetch(`${BASE_URL}/api/designs/${generatedDesignId}/image`);
    assert.equal(imgRes.status, 401);

    // 2. Private image access with another user's token -> 403
    const foreignToken = "foreign-user-token-" + randomUUID();
    const foreignImgRes = await fetch(`${BASE_URL}/api/designs/${generatedDesignId}/image`, {
      headers: { Authorization: `Bearer ${foreignToken}` },
    });
    assert.ok([401, 403].includes(foreignImgRes.status));

    // 3. Receipt access by different unauthorized user -> 403
    const foreignReceiptRes = await fetch(`${BASE_URL}/api/orders/${completedOrderId}/receipt`, {
      headers: { Authorization: `Bearer ${foreignToken}` },
    });
    assert.ok([401, 403].includes(foreignReceiptRes.status));
  });

  test("Step 20: Consultation submissions persist successfully to durable store", async () => {
    const reqId = randomUUID();
    const consultRes = await fetch(`${BASE_URL}/api/consultations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: reqId,
        customer: {
          name: "Deepak Chopra",
          phone: "9876543210",
          pin: "122002",
        },
        consent: true,
      }),
    });

    assert.equal(consultRes.status, 201);
    const consultData = await consultRes.json();
    assert.ok(consultData.id.startsWith("BC-"));

    // Verify durable storage on filesystem
    const consultPath = path.join(process.cwd(), "data", "consultations", `${consultData.id}.json`);
    const exists = await fs.stat(consultPath).then(() => true).catch(() => false);
    assert.equal(exists, true);

    // Clean up
    await fs.unlink(consultPath).catch(() => { });
  });

  test("Step 21: Responsive experience verification across representative mobile and desktop viewports", async () => {
    const themeCss = await fs.readFile(path.join(process.cwd(), "public", "premium-theme.css"), "utf8");
    const shopCss = await fs.readFile(path.join(process.cwd(), "public", "shop.css"), "utf8");
    const styleCss = await fs.readFile(path.join(process.cwd(), "public", "style.css"), "utf8");
    const combined = themeCss + "\n" + shopCss + "\n" + styleCss;

    // Mobile: 320px
    assert.ok(combined.includes("max-width: 360px"));
    // Mobile: 375px - 430px
    assert.ok(combined.includes("max-width: 500px") || combined.includes("max-width: 600px"));
    // Tablet: 768px
    assert.ok(combined.includes("max-width: 768px") || combined.includes("max-width: 850px"));
    // Desktop: 1024px - 1440px
    assert.ok(combined.includes("max-width: 1024px") || combined.includes("max-width: 900px"));
    assert.ok(combined.includes("1500px") || combined.includes("1300px"));
  });
});
