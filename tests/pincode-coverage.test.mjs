import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkPostal } from "../lib/serviceability.mjs";

const TARGET_PINS = [
  // Delhi (23 PINs)
  "110010", "110016", "110017", "110021", "110022",
  "110030", "110037", "110038", "110045", "110047",
  "110057", "110061", "110062", "110066", "110067",
  "110068", "110070", "110071", "110074", "110075",
  "110077", "110080", "110097",
  // Haryana / Gurugram (20 PINs)
  "122001", "122002", "122003", "122004", "122005",
  "122006", "122007", "122008", "122009", "122010",
  "122011", "122012", "122015", "122016", "122017",
  "122018", "122098", "122101", "122102", "122505",
];

describe("PIN Code Coverage: Delivery & Installation Availability", () => {
  test("Target list contains exactly 43 PIN codes", () => {
    assert.equal(TARGET_PINS.length, 43);
  });

  describe("Serviceability logic for each of the 43 target PIN codes", () => {
    for (const pin of TARGET_PINS) {
      test(`PIN ${pin} has both delivery and installation available (and delivery-only supported)`, async () => {
        const result = await checkPostal(pin);

        // Product delivery must be available preliminary
        assert.equal(
          result.productDelivery,
          "available_preliminary",
          `PIN ${pin} must have product delivery available_preliminary`
        );

        // Makeover installation must not be unavailable
        assert.notEqual(
          result.makeover,
          "unavailable",
          `PIN ${pin} must have makeover installation available`
        );

        // Metadata checks
        assert.equal(result.source, "curated_pins");
        assert.ok(
          result.region === "Delhi" || result.region === "Haryana",
          `PIN ${pin} must have valid region`
        );
        assert.ok(
          result.city === "New Delhi" || result.city === "Gurugram" || result.city?.length > 0,
          `PIN ${pin} must have valid city`
        );
        assert.ok(
          Array.isArray(result.localities) && result.localities.length > 0,
          `PIN ${pin} must have at least one locality`
        );
      });
    }
  });

  describe("Delivery-only PIN verification", () => {
    test("PIN 110001 supports only delivery (Option A) and rejects installation (Option B)", async () => {
      const result = await checkPostal("110001");
      assert.equal(result.productDelivery, "available_preliminary");
      assert.equal(result.makeover, "unavailable");
    });
  });

  describe("End-to-End Order Checkout via HTTP API (Both Delivery & Installation, and Only Delivery)", async () => {
    const BASE_URL = "http://localhost:3001";
    let serverRunning = false;
    try {
      const probe = await fetch(`${BASE_URL}/api/serviceability`, { method: "GET", signal: AbortSignal.timeout(1000) });
      serverRunning = probe.ok;
    } catch {
      serverRunning = false;
    }

    test("Option A (DIY: Only Delivery) succeeds for representative Delhi and Gurugram PINs", { skip: !serverRunning }, async () => {
      const samplePins = ["110010", "110016", "110021", "110070", "122001", "122002", "122018"];
      for (const pin of samplePins) {
        const res = await fetch(`${BASE_URL}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            customer: {
              name: "Test Customer",
              phone: "9876543210",
              address: "Flat 101, Test Street, Serviceable Block",
              area: "Main Sector",
              city: pin.startsWith("110") ? "New Delhi" : "Gurugram",
              state: pin.startsWith("110") ? "Delhi" : "Haryana",
              pin,
            },
            items: [{ id: "P001", quantity: 1 }],
            paymentMethod: "cod",
            deliveryAcknowledged: true,
            fulfilmentType: "diy",
          }),
        });
        assert.equal(res.status, 201, `Option A must be accepted for PIN ${pin}`);
        const data = await res.json();
        assert.equal(data.fulfilmentType, "diy");
      }
    });

    test("Option B (Products + Professional Installation) succeeds for representative Delhi and Gurugram PINs", { skip: !serverRunning }, async () => {
      const samplePins = ["110010", "110016", "110021", "110070", "122001", "122002", "122018"];
      for (const pin of samplePins) {
        const res = await fetch(`${BASE_URL}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            customer: {
              name: "Test Customer",
              phone: "9876543210",
              address: "Flat 101, Test Street, Serviceable Block",
              area: "Main Sector",
              city: pin.startsWith("110") ? "New Delhi" : "Gurugram",
              state: pin.startsWith("110") ? "Delhi" : "Haryana",
              pin,
            },
            items: [{ id: "P001", quantity: 1 }],
            paymentMethod: "cod",
            deliveryAcknowledged: true,
            serviceAcknowledged: true,
            fulfilmentType: "installation",
          }),
        });
        assert.equal(res.status, 201, `Option B must be accepted for PIN ${pin}`);
        const data = await res.json();
        assert.equal(data.fulfilmentType, "installation");
      }
    });

    test("Option B (Installation) is rejected for delivery-only PIN 110001 with 422 while Option A is accepted", { skip: !serverRunning }, async () => {
      // Option B fails
      const resB = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          customer: {
            name: "Pooja Verma",
            phone: "9812345678",
            address: "Flat 12, Barakhamba Road, Connaught Place",
            area: "Connaught Place",
            city: "New Delhi",
            state: "Delhi",
            pin: "110001",
          },
          items: [{ id: "P001", quantity: 1 }],
          paymentMethod: "cod",
          deliveryAcknowledged: true,
          serviceAcknowledged: true,
          fulfilmentType: "installation",
        }),
      });
      assert.equal(resB.status, 422);
      const errData = await resB.json();
      assert.match(errData.error, /Makeover installation is not available for this PIN/i);

      // Option A succeeds
      const resA = await fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          customer: {
            name: "Pooja Verma",
            phone: "9812345678",
            address: "Flat 12, Barakhamba Road, Connaught Place",
            area: "Connaught Place",
            city: "New Delhi",
            state: "Delhi",
            pin: "110001",
          },
          items: [{ id: "P001", quantity: 1 }],
          paymentMethod: "cod",
          deliveryAcknowledged: true,
          fulfilmentType: "diy",
        }),
      });
      assert.equal(resA.status, 201);
      const orderA = await resA.json();
      assert.equal(orderA.fulfilmentType, "diy");
    });
  });
});
