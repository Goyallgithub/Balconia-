import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import products from "../lib/shop-data.json" with { type: "json" };
import { PDFDocument } from "pdf-lib";

const BASE_URL = "http://localhost:3001";

describe("TASK 7 — PDF Order Receipts", () => {
  const createdOrderIds = [];

  after(async () => {
    // Cleanup generated test order files
    for (const id of createdOrderIds) {
      try {
        const filePath = path.join(process.cwd(), "data", "orders", `${id}.json`);
        await fs.unlink(filePath);
      } catch {}
    }
  });

  const validCustomer = {
    name: "Kabir Mehra",
    phone: "9876501234",
    email: "kabir@example.com",
    address: "Tower 2, Wellington Estate, Sector 53",
    area: "DLF Phase 5",
    city: "Gurugram",
    state: "Haryana",
    pin: "122002",
  };

  async function createTestOrder(fulfilmentType = "diy", couponCode = null, ownerId = null) {
    const requestId = randomUUID();
    const payload = {
      requestId,
      customer: validCustomer,
      items: [
        { id: "P001", quantity: 2 }, // Bamboo Palm
      ],
      paymentMethod: "cod",
      deliveryAcknowledged: true,
      serviceAcknowledged: fulfilmentType === "installation",
      fulfilmentType,
      couponCode,
    };

    const headers = { "Content-Type": "application/json" };
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    createdOrderIds.push(data.id);

    // If ownerId is specified for testing authorization, update the stored json record
    if (ownerId) {
      const orderFile = path.join(process.cwd(), "data", "orders", `${data.id}.json`);
      try {
        const raw = JSON.parse(await fs.readFile(orderFile, "utf8"));
        raw.ownerId = ownerId;
        await fs.writeFile(orderFile, JSON.stringify(raw, null, 2));
      } catch {}
    }

    return data;
  }

  describe("7.1 Successful PDF Receipt Generation & Content Inspection", () => {
    test("Generates valid binary PDF receipt with correct headers for DIY order", async () => {
      const order = await createTestOrder("diy");
      const res = await fetch(`${BASE_URL}/api/orders/${order.id}/receipt`);

      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "application/pdf");
      assert.equal(res.headers.get("cache-control"), "private, no-store");
      assert.ok(res.headers.get("content-disposition")?.includes(`Balconia-Receipt-${order.id}.pdf`));

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // PDF Magic Bytes: starts with '%PDF-'
      assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
      assert.ok(buffer.length > 1000, "PDF should have substantial size with embedded layout");

      // Parse with pdf-lib to ensure structural validity
      const pdfDoc = await PDFDocument.load(buffer);
      assert.equal(pdfDoc.getPageCount(), 1);
      assert.equal(pdfDoc.getTitle(), `Balconia Receipt ${order.id}`);
    });

    test("Generates valid PDF receipt for Option B: Products + Professional Installation", async () => {
      const order = await createTestOrder("installation");
      const res = await fetch(`${BASE_URL}/api/orders/${order.id}/receipt`);

      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "application/pdf");

      const buffer = Buffer.from(await res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(buffer);
      assert.equal(pdfDoc.getPageCount(), 1);
      assert.ok(buffer.length > 1000);
    });
  });

  describe("7.2 PDF Download Handling on Desktop & Mobile", () => {
    test("Supports ?download=1 query parameter with attachment disposition header", async () => {
      const order = await createTestOrder("diy");
      const res = await fetch(`${BASE_URL}/api/orders/${order.id}/receipt?download=1`);

      assert.equal(res.status, 200);
      const disposition = res.headers.get("content-disposition");
      assert.ok(disposition?.startsWith("attachment;"), "Must specify attachment for download");
      assert.ok(disposition?.includes(`Balconia-Receipt-${order.id}.pdf`));
    });

    test("Default view without download parameter provides inline disposition", async () => {
      const order = await createTestOrder("diy");
      const res = await fetch(`${BASE_URL}/api/orders/${order.id}/receipt`);

      assert.equal(res.status, 200);
      const disposition = res.headers.get("content-disposition");
      assert.ok(disposition?.startsWith("inline;"), "Must specify inline for preview");
    });
  });

  describe("7.3 Authorization & Tampering Protection", () => {
    test("Rejects unauthenticated access to receipt owned by another user with 403", async () => {
      const ownerId = "auth-user-" + randomUUID();
      const order = await createTestOrder("diy", null, ownerId);

      // Unauthenticated request to private user's order receipt
      const res = await fetch(`${BASE_URL}/api/orders/${order.id}/receipt`);
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /unauthorized/i);
    });

    test("Returns 404 for non-existent order reference", async () => {
      const res = await fetch(`${BASE_URL}/api/orders/BAL-NOT-FOUND-9999/receipt`);
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.match(data.error, /not found/i);
    });
  });

  describe("7.4 Repeated Receipt Downloads & Idempotency", () => {
    test("Repeated receipt downloads do not duplicate orders or mutate state", async () => {
      const order = await createTestOrder("diy");

      // Verify orders count before repeated downloads
      const ordersDir = path.join(process.cwd(), "data", "orders");
      const filesBefore = (await fs.readdir(ordersDir)).filter((f) => f.endsWith(".json"));

      // Download receipt 4 times
      for (let i = 0; i < 4; i++) {
        const res = await fetch(`${BASE_URL}/api/orders/${order.id}/receipt?download=1`);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("content-type"), "application/pdf");
      }

      // Verify orders count remains identical
      const filesAfter = (await fs.readdir(ordersDir)).filter((f) => f.endsWith(".json"));
      assert.equal(filesAfter.length, filesBefore.length, "Receipt downloads must never create new order records");
    });
  });
});
