import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import products from "../lib/shop-data.json" with { type: "json" };

const BASE_URL = "http://localhost:3001";

describe("TASK 6 — DIY Products Versus Professional Installation", () => {
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

  const validCustomerNcr = {
    name: "Aarav Sharma",
    phone: "9876543210",
    email: "aarav@example.com",
    address: "Flat 402, DLF Phase 5, Sector 53",
    area: "Golf Course Road",
    city: "Gurugram",
    state: "Haryana",
    pin: "122002",
    notes: "Leave with security if unavailable",
  };

  const validCustomerDelhiDeliveryOnly = {
    name: "Pooja Verma",
    phone: "9812345678",
    email: "pooja@example.com",
    address: "Flat 12, Barakhamba Road, Connaught Place",
    area: "Connaught Place",
    city: "New Delhi",
    state: "Delhi",
    pin: "110001",
  };

  const customerOutsideNcr = {
    name: "Rohan Patil",
    phone: "9988776655",
    email: "rohan@example.com",
    address: "15 Marine Drive, Nariman Point",
    area: "Marine Drive",
    city: "Mumbai",
    state: "Maharashtra",
    pin: "400001",
  };

  describe("6.1 DIY Checkout (Option A: Products Only — DIY)", () => {
    test("Successfully places DIY order without installation fee and sets status pending_confirmation", async () => {
      const requestId = randomUUID();
      const palm = products.find((p) => p.id === "P001"); // Bamboo Palm ₹1490
      assert.ok(palm, "P001 product must exist");

      const payload = {
        requestId,
        customer: validCustomerNcr,
        items: [{ id: "P001", quantity: 1 }],
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        fulfilmentType: "diy",
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.id.startsWith("BAL-"));
      createdOrderIds.push(data.id);

      assert.equal(data.fulfilmentType, "diy");
      assert.equal(data.fulfilmentLabel, "Option A: Products Only — DIY");
      assert.equal(data.status, "pending_confirmation");
      assert.equal(data.subtotalPaise, palm.pricePaise);

      // Server calculated fees: no installation fee
      assert.equal(data.fees.installationPaise, 0);
      assert.equal(data.fees.installNeeded, false);
      assert.equal(data.fees.shippingPaise, 15000); // Standard shipping ₹150
      assert.equal(data.totalPaise, palm.pricePaise + 15000);
    });
  });

  describe("6.2 Installation Checkout for Serviceable Address (Option B: Products + Professional Installation)", () => {
    test("Successfully places Installation order in serviceable area and sets status pending_service_quote", async () => {
      const requestId = randomUUID();
      const palm = products.find((p) => p.id === "P001"); // ₹1490

      const payload = {
        requestId,
        customer: validCustomerNcr,
        items: [{ id: "P001", quantity: 1 }],
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        serviceAcknowledged: true,
        fulfilmentType: "installation",
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      createdOrderIds.push(data.id);

      assert.equal(data.fulfilmentType, "installation");
      assert.equal(data.fulfilmentLabel, "Option B: Products + Professional Installation");
      assert.equal(data.status, "pending_service_quote");
      assert.equal(data.fees.installNeeded, true);
      assert.equal(data.fees.installationPaise, 50000); // Standard installation ₹500
      assert.equal(data.fees.shippingPaise, 15000); // Standard shipping ₹150
      assert.equal(data.totalPaise, palm.pricePaise + 50000 + 15000);
    });

    test("Rejects installation order without serviceAcknowledged confirmation with 400", async () => {
      const requestId = randomUUID();
      const payload = {
        requestId,
        customer: validCustomerNcr,
        items: [{ id: "P001", quantity: 1 }],
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        serviceAcknowledged: false, // Not acknowledged
        fulfilmentType: "installation",
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /installation/i);
    });
  });

  describe("6.3 Address Serviceability & Unsupported Installation Handling", () => {
    test("Rejects order completely for address outside Delhi NCR with 422", async () => {
      const requestId = randomUUID();
      const payload = {
        requestId,
        customer: customerOutsideNcr,
        items: [{ id: "P001", quantity: 1 }],
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        fulfilmentType: "diy",
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 422);
      const data = await res.json();
      assert.match(data.error, /Delhi NCR/i);
    });

    test("Rejects Option B (Professional Installation) for Delhi delivery-only PIN with 422", async () => {
      const requestId = randomUUID();
      const payload = {
        requestId,
        customer: validCustomerDelhiDeliveryOnly, // PIN 110001 (delivery-only)
        items: [{ id: "P001", quantity: 1 }],
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        serviceAcknowledged: true,
        fulfilmentType: "installation",
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 422);
      const data = await res.json();
      assert.match(data.error, /Makeover installation is not available for this PIN/i);
    });

    test("Accepts Option A (DIY Products Only) for the same delivery-only PIN 110001", async () => {
      const requestId = randomUUID();
      const payload = {
        requestId,
        customer: validCustomerDelhiDeliveryOnly,
        items: [{ id: "P001", quantity: 1 }],
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        fulfilmentType: "diy",
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      createdOrderIds.push(data.id);
      assert.equal(data.fulfilmentType, "diy");
    });
  });

  describe("6.4 Price Integrity & Tampering Protection", () => {
    test("Ignores client-submitted fees and price manipulations; calculates authoritative prices on server", async () => {
      const requestId = randomUUID();
      const palm = products.find((p) => p.id === "P001");

      const payload = {
        requestId,
        customer: validCustomerNcr,
        // Client attempts to claim unitPrice is ₹10 and shipping/installation are 0
        items: [{ id: "P001", quantity: 1, unitPricePaise: 1000 }],
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        serviceAcknowledged: true,
        fulfilmentType: "installation",
        fees: {
          shippingPaise: 0,
          installationPaise: 0,
          grandTotalPaise: 1000,
          shippingFree: true,
          installationFree: true,
        },
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      createdOrderIds.push(data.id);

      // Server enforces actual catalogue price and fee amounts
      assert.equal(data.subtotalPaise, palm.pricePaise);
      assert.equal(data.fees.shippingPaise, 15000);
      assert.equal(data.fees.installationPaise, 50000);
      assert.equal(data.totalPaise, palm.pricePaise + 15000 + 50000);
    });
  });

  describe("6.5 Coupon & Discount Combinations", () => {
    test("Coupon BALCONIA unlocks free shipping on subtotal >= ₹500 and free installation on subtotal >= ₹1,000", async () => {
      const requestId = randomUUID();
      const palm = products.find((p) => p.id === "P001"); // ₹1490 (>= ₹1000)

      const payload = {
        requestId,
        customer: validCustomerNcr,
        items: [{ id: "P001", quantity: 3 }], // 3 * ₹390 = ₹1,170 (> ₹1,000 threshold)
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        serviceAcknowledged: true,
        fulfilmentType: "installation",
        couponCode: "BALCONIA",
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      createdOrderIds.push(data.id);

      assert.equal(data.fees.shippingFree, true);
      assert.equal(data.fees.shippingPaise, 0);
      assert.equal(data.fees.installationFree, true);
      assert.equal(data.fees.installationPaise, 0);
      assert.equal(data.totalPaise, palm.pricePaise * 3);
    });

    test("Invalid coupon does not unlock discounts", async () => {
      const requestId = randomUUID();
      const payload = {
        requestId,
        customer: validCustomerNcr,
        items: [{ id: "P001", quantity: 1 }],
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        fulfilmentType: "diy",
        couponCode: "FAKE_PROMO_99",
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      createdOrderIds.push(data.id);

      assert.equal(data.fees.shippingFree, false);
      assert.equal(data.fees.shippingPaise, 15000);
      assert.equal(data.fees.couponCode, null);
    });
  });

  describe("6.6 Duplicate Order Submissions (Idempotency)", () => {
    test("Submitting order with same requestId returns existing order without creating duplicate", async () => {
      const requestId = randomUUID();
      const payload = {
        requestId,
        customer: validCustomerNcr,
        items: [{ id: "P001", quantity: 1 }],
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        fulfilmentType: "diy",
      };

      // First submission
      const res1 = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      assert.equal(res1.status, 201);
      const order1 = await res1.json();
      createdOrderIds.push(order1.id);

      // Duplicate submission with same requestId
      const res2 = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      assert.equal(res2.status, 200);
      const order2 = await res2.json();

      assert.equal(order2.id, order1.id);
      assert.equal(order2.subtotalPaise, order1.subtotalPaise);
      assert.equal(order2.fulfilmentType, order1.fulfilmentType);
      assert.equal(order2.duplicate, true);
    });
  });

  describe("6.7 Order Persistence & Order Retrieval", () => {
    test("Persisted order contains complete fulfillment, customer, items, and server calculated fees", async () => {
      const requestId = randomUUID();
      const payload = {
        requestId,
        customer: validCustomerNcr,
        items: [{ id: "P001", quantity: 2 }],
        paymentMethod: "cod",
        deliveryAcknowledged: true,
        serviceAcknowledged: true,
        fulfilmentType: "installation",
      };

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      createdOrderIds.push(data.id);

      // Verify direct retrieval via GET /api/orders/:id
      const getRes = await fetch(`${BASE_URL}/api/orders/${data.id}`);
      assert.equal(getRes.status, 200);
      const stored = await getRes.json();

      assert.equal(stored.id, data.id);
      assert.equal(stored.fulfilmentType, "installation");
      assert.equal(stored.fulfilmentLabel, "Option B: Products + Professional Installation");
      assert.equal(stored.paymentMethod, "cod");
      assert.equal(stored.customer.name, validCustomerNcr.name);
      assert.equal(stored.customer.pin, validCustomerNcr.pin);
      assert.equal(stored.items.length, 1);
      assert.equal(stored.items[0].id, "P001");
      assert.equal(stored.items[0].quantity, 2);
      assert.ok(stored.totalPaise > stored.subtotalPaise);
    });

    test("GET /api/orders/:id returns 404 for non-existent order ID", async () => {
      const res = await fetch(`${BASE_URL}/api/orders/BAL-NONEXISTENT-9999`);
      assert.equal(res.status, 404);
    });
  });
});
