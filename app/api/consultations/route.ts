import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { findByRequestId, saveJsonRecord } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Invalid request origin." }, 403);
  }

  try {
    const body = await request.json();
    const requestId = String(body?.requestId || "");
    if (!/^[a-f0-9-]{36}$/i.test(requestId)) {
      return json({ error: "Invalid request reference." }, 400);
    }
    const existing = await findByRequestId("consultations", requestId);
    if (existing) {
      return json({
        id: existing.id,
        status: existing.status || "pending_coverage_review",
      });
    }

    const customer = body?.customer || {};
    const name = String(customer.name || "").trim();
    const phone = String(customer.phone || "").trim();
    if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone)) {
      return json({ error: "Please enter your name and a valid mobile number." }, 400);
    }
    if (customer.consent !== true && body?.consent !== true) {
      return json({ error: "Please agree to be contacted." }, 400);
    }

    const id = "BC-" + randomUUID().slice(0, 8).toUpperCase();
    await saveJsonRecord("consultations", id, {
      id,
      requestId,
      createdAt: new Date().toISOString(),
      customer: { name, phone, pin: body?.pin || customer.pin || null },
      coverage: body?.coverage || null,
      status: "pending_coverage_review",
    });
    return json({ id, status: "pending_coverage_review" }, 201);
  } catch (e) {
    console.error(e);
    return json({ error: "Could not save consultation. Please try again." }, 503);
  }
}
