import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const BASE_URL = "http://localhost:3001";

describe("TASK 1: Security, Data Persistence, and Catalogue Navigation", () => {

  describe("1.1 Secure Private Image Access", () => {
    test("GET /api/designs/:id/image rejects invalid UUID format with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/designs/invalid-uuid-1234/image`);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /invalid design identifier/i);
    });

    test("GET /api/designs/:id/image rejects unauthenticated requests with 401", async () => {
      const fakeUuid = "11111111-2222-3333-4444-555555555555";
      const res = await fetch(`${BASE_URL}/api/designs/${fakeUuid}/image`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /authentication required/i);
    });

    test("GET /api/designs/:id/image rejects invalid Bearer tokens with 401", async () => {
      const fakeUuid = "11111111-2222-3333-4444-555555555555";
      const res = await fetch(`${BASE_URL}/api/designs/${fakeUuid}/image`, {
        headers: { Authorization: "Bearer bad-token-xyz" },
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /authentication required/i);
    });

    test("GET /api/designs/:id/image rejects invalid query token with 401", async () => {
      const fakeUuid = "11111111-2222-3333-4444-555555555555";
      const res = await fetch(`${BASE_URL}/api/designs/${fakeUuid}/image?token=bad-token`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /authentication required/i);
    });

    test("GET /api/designs/:id/image returns 404 for non-existent design when authenticated", async () => {
      const fakeUuid = "99999999-8888-7777-6666-555555555555";
      const res = await fetch(`${BASE_URL}/api/designs/${fakeUuid}/image`, {
        headers: { Authorization: "Bearer test-token-userA" },
      });
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.match(data.error, /design not found/i);
    });

    test("Ownership enforcement: user B receives 403 Forbidden on user A's design", async () => {
      // 1. User A creates a design using a real balcony image from assets
      const reqId = crypto.randomUUID();
      const realPhotoBytes = await fs.readFile(path.join(process.cwd(), "public/assets/balcony.jpg"));

      const form = new FormData();
      form.append("requestId", reqId);
      form.append("consent", "yes");
      form.append("answers", JSON.stringify({
        mood: "chai",
        area: "20–30 sq ft",
        budget: "₹5,000–₹15,000",
        sun: "Mostly shade",
      }));
      form.append("photo", new Blob([realPhotoBytes], { type: "image/jpeg" }), "balcony.jpg");

      const createRes = await fetch(`${BASE_URL}/api/designs`, {
        method: "POST",
        headers: { Authorization: "Bearer test-token-userA" },
        body: form,
      });

      assert.ok(createRes.status === 200 || createRes.status === 201, `Create design failed with status ${createRes.status}`);
      const design = await createRes.json();
      assert.ok(design.id, "Expected design id in response");

      // 2. Unauthenticated request to design image -> 401 Unauthorized
      const unauthImgRes = await fetch(`${BASE_URL}/api/designs/${design.id}/image`);
      assert.equal(unauthImgRes.status, 401);

      // 3. User B (different user) requests User A's design image -> 403 Forbidden
      const userBRes = await fetch(`${BASE_URL}/api/designs/${design.id}/image`, {
        headers: { Authorization: "Bearer test-token-userB" },
      });
      assert.equal(userBRes.status, 403);
      const userBData = await userBRes.json();
      assert.match(userBData.error, /access denied|not own/i);

      // 4. User A (owner) requests with Bearer token -> 200 OK
      const userARes = await fetch(`${BASE_URL}/api/designs/${design.id}/image`, {
        headers: { Authorization: "Bearer test-token-userA" },
      });
      assert.equal(userARes.status, 200);
      assert.ok(userARes.headers.get("content-type")?.includes("image/"), "Expected image content type");

      // 5. User A (owner) requests with query param token -> 200 OK
      const userAQueryRes = await fetch(`${BASE_URL}/api/designs/${design.id}/image?token=test-token-userA`);
      assert.equal(userAQueryRes.status, 200);
      assert.ok(userAQueryRes.headers.get("content-type")?.includes("image/"), "Expected image content type");
    });
  });

  describe("1.2 Fix Consultation Persistence", () => {
    test("POST /api/consultations rejects invalid origin with 403", async () => {
      const res = await fetch(`${BASE_URL}/api/consultations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://malicious-site.com",
        },
        body: JSON.stringify({ requestId: crypto.randomUUID() }),
      });
      assert.equal(res.status, 403);
    });

    test("POST /api/consultations rejects invalid requestId format with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: "not-a-valid-uuid" }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /invalid request reference/i);
    });

    test("POST /api/consultations rejects missing name and phone with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          customer: { name: "A", phone: "12345" },
          consent: true,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /valid mobile number/i);
    });

    test("POST /api/consultations rejects missing consent with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          customer: { name: "Pooja Sharma", phone: "9876543210" },
          consent: false,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /agree to be contacted/i);
    });

    test("POST /api/consultations successfully persists and returns 201 with BC- id", async () => {
      const reqId = crypto.randomUUID();
      const res = await fetch(`${BASE_URL}/api/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: reqId,
          customer: {
            name: "Bhavya Goyal",
            phone: "9811223344",
            pin: "110001",
          },
          coverage: { state: "eligible", city: "Delhi" },
          consent: true,
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.id && data.id.startsWith("BC-"), "Expected id starting with BC-");
      assert.equal(data.status, "pending_coverage_review");

      // Verify idempotency: Submitting same requestId returns existing record with 200
      const resRepeat = await fetch(`${BASE_URL}/api/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: reqId,
          customer: { name: "Bhavya Goyal", phone: "9811223344" },
          consent: true,
        }),
      });
      assert.equal(resRepeat.status, 200);
      const dataRepeat = await resRepeat.json();
      assert.equal(dataRepeat.id, data.id);
    });

    test("Consultation record is durably stored and readable on disk", async () => {
      const reqId = crypto.randomUUID();
      const res = await fetch(`${BASE_URL}/api/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: reqId,
          customer: { name: "Durable Test", phone: "9988776655", pin: "110020" },
          consent: true,
        }),
      });
      assert.equal(res.status, 201);
      const { id } = await res.json();

      // Verify file exists in data directory (dataRoot)
      const dataPath = path.join(process.cwd(), "data/consultations", `${id}.json`);
      const fileExists = await fs.access(dataPath).then(() => true).catch(() => false);
      assert.ok(fileExists, `Consultation record ${id}.json should exist in local data store`);
      const raw = JSON.parse(await fs.readFile(dataPath, "utf8"));
      assert.equal(raw.customer.phone, "9988776655");
      assert.equal(raw.id, id);
    });
  });

  describe("1.3 Fix Catalogue Navigation and Middleware Routing", () => {
    test("Middleware serves /catalogue as dedicated page", async () => {
      const res = await fetch(`${BASE_URL}/catalogue`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes("THE BALCONIA SHOP") || text.includes("catalogue"), "Expected catalogue page content");
    });

    test("Middleware preserves query parameters on /catalogue?category=plants", async () => {
      const res = await fetch(`${BASE_URL}/catalogue?category=plants`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes("data-page=\"shop\""));
    });

    test("Middleware serves /shop route as alias to catalogue", async () => {
      const res = await fetch(`${BASE_URL}/shop`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes("data-page=\"shop\""));
    });

    test("Middleware serves /cart, /checkout, and /diwali cleanly", async () => {
      for (const route of ["/cart", "/checkout", "/diwali"]) {
        const res = await fetch(`${BASE_URL}${route}`);
        assert.equal(res.status, 200, `Failed to load ${route}`);
      }
    });

    test("public/shop.js preserves pathname in history state and handles popstate", async () => {
      const shopJs = await fs.readFile(path.join(process.cwd(), "public/shop.js"), "utf8");
      assert.ok(shopJs.includes("history.pushState"), "shop.js should use pushState for history navigation");
      assert.ok(shopJs.includes("popstate"), "shop.js should handle popstate event for back/forward navigation");
      assert.ok(shopJs.includes("u.pathname"), "shop.js should preserve pathname in history state");
    });

    test("public/index.html includes Shop the recipe in main navigation header", async () => {
      const indexHtml = await fs.readFile(path.join(process.cwd(), "public/index.html"), "utf8");
      assert.ok(
        indexHtml.includes('<a href="catalogue.html">Shop the recipe</a>') ||
        indexHtml.includes('<a href="/catalogue">Shop the recipe</a>'),
        "index.html should have a catalogue link in the navigation header"
      );
    });
  });
});
