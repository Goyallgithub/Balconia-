import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { validateAnswers } from "../lib/design-plan.mjs";

const BASE_URL = "http://localhost:3001";

async function createLocalDesignRecord(input) {
  const designsDir = path.join(process.cwd(), "data/designs", input.id);
  await fs.mkdir(designsDir, { recursive: true });
  const originalPath = path.join(designsDir, "original.webp");
  await fs.writeFile(originalPath, Buffer.from("fake-photo-bytes"));
  
  let outputPath = null;
  if (input.status === "complete") {
    outputPath = path.join(designsDir, "render.webp");
    await fs.writeFile(outputPath, Buffer.from("fake-render-bytes"));
  }

  const record = {
    id: input.id,
    requestId: input.requestId || crypto.randomUUID(),
    createdAt: input.createdAt || new Date().toISOString(),
    answers: input.answers || { mood: "chai", budget: "₹15,000–₹35,000" },
    plan: input.plan || { items: [], notes: [] },
    status: input.status || "ready",
    originalPath,
    originalMime: "image/webp",
    outputPath,
    lastError: input.lastError || null,
    ownerId: input.ownerId || null,
  };

  await fs.writeFile(path.join(designsDir, "meta.json"), JSON.stringify(record, null, 2));
  return record;
}

describe("TASK 4: Ten AI Generations and Ten Catalogue Selections", () => {
  describe("4.1 Catalogue Product Selection Limit (10 items max, reject 11th)", () => {
    test("Accepts exactly ten catalogue products", () => {
      const tenIds = [
        "FUR-001", "FUR-002", "FUR-003", "FUR-004", "FUR-005",
        "P001", "P002", "P003", "P004", "L001",
      ];
      const validated = validateAnswers({
        mood: "chai",
        area: "30–50 sq ft",
        budget: "₹35,000–₹60,000",
        sun: "Some morning sun",
        care: "Keep it low-maintenance",
        weather: "Covered, mostly sheltered",
        household: "Adults",
        extraProductIds: tenIds,
      });

      assert.equal(validated.extraProductIds.length, 10);
      assert.deepEqual(validated.extraProductIds, tenIds);
    });

    test("Rejects the eleventh selected product with an explicit error", () => {
      const elevenIds = [
        "FUR-001", "FUR-002", "FUR-003", "FUR-004", "FUR-005",
        "P001", "P002", "P003", "P004", "L001",
        "L002", // 11th product
      ];

      assert.throws(
        () => {
          validateAnswers({
            mood: "chai",
            area: "30–50 sq ft",
            budget: "₹35,000–₹60,000",
            sun: "Some morning sun",
            care: "Keep it low-maintenance",
            weather: "Covered, mostly sheltered",
            household: "Adults",
            extraProductIds: elevenIds,
          });
        },
        /up to 10 catalogue products/i
      );
    });

    test("POST /api/designs rejects request with 11 catalogue products with 400", async () => {
      const reqId = crypto.randomUUID();
      const realPhotoBytes = await fs.readFile(path.join(process.cwd(), "public/assets/balcony.jpg"));

      const elevenIds = [
        "FUR-001", "FUR-002", "FUR-003", "FUR-004", "FUR-005",
        "P001", "P002", "P003", "P004", "L001", "L002"
      ];

      const form = new FormData();
      form.append("consent", "yes");
      form.append("requestId", reqId);
      form.append("photo", new Blob([realPhotoBytes], { type: "image/jpeg" }), "balcony.jpg");
      form.append(
        "answers",
        JSON.stringify({
          mood: "chai",
          area: "30–50 sq ft",
          budget: "₹35,000–₹60,000",
          sun: "Some morning sun",
          care: "Keep it low-maintenance",
          weather: "Covered, mostly sheltered",
          household: "Adults",
          extraProductIds: elevenIds,
        })
      );

      const res = await fetch(`${BASE_URL}/api/designs`, {
        method: "POST",
        body: form,
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /up to 10 catalogue products/i);
    });
  });

  describe("4.2 Generation Quota Configuration & Display (10 Generations)", () => {
    test("GET /api/public-config exposes maxGenerations = 10", async () => {
      const res = await fetch(`${BASE_URL}/api/public-config`);
      assert.equal(res.status, 200);
      const config = await res.json();
      assert.equal(config.maxGenerations, 10);
    });

    test("GET /api/designs reports generationsRemaining = 10 accurately for user with 0 completed designs", async () => {
      const testUserId = `quota-user-${crypto.randomUUID().slice(0, 8)}`;
      const res = await fetch(`${BASE_URL}/api/designs`, {
        headers: { Authorization: `Bearer test-token-${testUserId}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.maxGenerations, 10);
      assert.equal(data.generationsRemaining, 10);
    });
  });

  describe("4.3 Quota Consumption, Failed Generation Retries & Concurrency Safety", () => {
    test("Completed generations accurately decrement remaining quota", async () => {
      const testUserId = `quota-user-${crypto.randomUUID().slice(0, 8)}`;

      // Populate 3 completed designs directly
      for (let i = 0; i < 3; i++) {
        await createLocalDesignRecord({
          id: crypto.randomUUID(),
          ownerId: testUserId,
          status: "complete",
        });
      }

      const res = await fetch(`${BASE_URL}/api/designs`, {
        headers: { Authorization: `Bearer test-token-${testUserId}` },
      });
      const data = await res.json();
      assert.equal(data.generationsRemaining, 7); // 10 - 3 = 7
    });

    test("Failed generations do not consume permanent quota (retries permitted)", async () => {
      const testUserId = `quota-user-${crypto.randomUUID().slice(0, 8)}`;

      // Populate 1 design that failed
      await createLocalDesignRecord({
        id: crypto.randomUUID(),
        ownerId: testUserId,
        status: "failed",
        lastError: "provider_timeout",
      });

      // Remaining quota should still be 10
      const res = await fetch(`${BASE_URL}/api/designs`, {
        headers: { Authorization: `Bearer test-token-${testUserId}` },
      });
      const data = await res.json();
      assert.equal(data.generationsRemaining, 10);
    });

    test("Duplicate requests for already complete design return existing result idempotently", async () => {
      const testUserId = `quota-user-${crypto.randomUUID().slice(0, 8)}`;
      const d = await createLocalDesignRecord({
        id: crypto.randomUUID(),
        ownerId: testUserId,
        status: "complete",
      });

      // First call
      const res1 = await fetch(`${BASE_URL}/api/designs/${d.id}/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer test-token-${testUserId}` },
      });
      assert.equal(res1.status, 200);
      const data1 = await res1.json();
      assert.equal(data1.status, "complete");

      // Second duplicate call
      const res2 = await fetch(`${BASE_URL}/api/designs/${d.id}/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer test-token-${testUserId}` },
      });
      assert.equal(res2.status, 200);
      const data2 = await res2.json();
      assert.equal(data2.status, "complete");
    });

    test("Duplicate requests while design is generating return 409 already_generating", async () => {
      const testUserId = `quota-user-${crypto.randomUUID().slice(0, 8)}`;
      const d = await createLocalDesignRecord({
        id: crypto.randomUUID(),
        ownerId: testUserId,
        status: "generating",
      });

      const res = await fetch(`${BASE_URL}/api/designs/${d.id}/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer test-token-${testUserId}` },
      });
      assert.equal(res.status, 409);
      const data = await res.json();
      assert.equal(data.code, "already_generating");
    });

    test("Quota enforcement: rejects generation request when user has completed 10 designs with 429", async () => {
      const testUserId = `quota-user-${crypto.randomUUID().slice(0, 8)}`;

      // Populate exactly 10 completed designs
      for (let i = 0; i < 10; i++) {
        await createLocalDesignRecord({
          id: crypto.randomUUID(),
          ownerId: testUserId,
          status: "complete",
        });
      }

      // Create 11th design in ready status
      const d11 = await createLocalDesignRecord({
        id: crypto.randomUUID(),
        ownerId: testUserId,
        status: "ready",
      });

      const res = await fetch(`${BASE_URL}/api/designs/${d11.id}/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer test-token-${testUserId}` },
      });
      assert.equal(res.status, 429);
      const data = await res.json();
      assert.equal(data.code, "generation_limit");
      assert.match(data.error, /used your 10 personalised AI images/i);
    });

    test("Atomic reservation: when 1 slot remains and design A is generating, competing request for design B is blocked with 429", async () => {
      const testUserId = `quota-concurrency-${crypto.randomUUID().slice(0, 8)}`;

      // Populate 9 completed designs (1 slot remaining)
      for (let i = 0; i < 9; i++) {
        await createLocalDesignRecord({
          id: crypto.randomUUID(),
          ownerId: testUserId,
          status: "complete",
        });
      }

      // Design A is currently generating (reserves the 10th slot)
      await createLocalDesignRecord({
        id: crypto.randomUUID(),
        ownerId: testUserId,
        status: "generating",
      });

      // Design B tries to generate while design A is still active
      const designB = await createLocalDesignRecord({
        id: crypto.randomUUID(),
        ownerId: testUserId,
        status: "ready",
      });

      const resB = await fetch(`${BASE_URL}/api/designs/${designB.id}/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer test-token-${testUserId}` },
      });

      assert.equal(resB.status, 429);
      const dataB = await resB.json();
      assert.equal(dataB.code, "generation_limit");
      assert.match(dataB.error, /used your 10 personalised AI images/i);
    });
  });

  describe("4.4 Authorization & Tampering Protection", () => {
    test("Rejects unauthenticated POST /api/designs/:id/generate with 401", async () => {
      const testUserId = `owner-${crypto.randomUUID().slice(0, 8)}`;
      const d = await createLocalDesignRecord({
        id: crypto.randomUUID(),
        ownerId: testUserId,
        status: "ready",
      });

      const res = await fetch(`${BASE_URL}/api/designs/${d.id}/generate`, {
        method: "POST",
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.code, "auth_required");
    });

    test("Rejects attempts to generate another user's design with 401", async () => {
      const userA = `user-a-${crypto.randomUUID().slice(0, 8)}`;
      const userB = `user-b-${crypto.randomUUID().slice(0, 8)}`;

      const d = await createLocalDesignRecord({
        id: crypto.randomUUID(),
        ownerId: userA,
        status: "ready",
      });

      const res = await fetch(`${BASE_URL}/api/designs/${d.id}/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer test-token-${userB}` },
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.code, "auth_required");
    });
  });

  after(async () => {
    try {
      const entries = await fs.readdir(path.join(process.cwd(), "data/designs"));
      for (const e of entries) {
        try {
          const metaPath = path.join(process.cwd(), "data/designs", e, "meta.json");
          const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
          if (meta.ownerId && (meta.ownerId.includes("quota") || meta.ownerId.includes("user") || meta.ownerId.includes("owner"))) {
            await fs.rm(path.join(process.cwd(), "data/designs", e), { recursive: true, force: true });
          }
        } catch {}
      }
    } catch {}
  });
});
