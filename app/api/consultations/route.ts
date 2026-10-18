import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { findByRequestId, saveJsonRecord } from "@/lib/order-store";
import { supabaseAdmin, supabaseConfigured, userFromRequest } from "@/lib/supabase";
import { sendConsultationEmail } from "@/lib/email";
import { isValidOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return json({ error: "Invalid request origin." }, 403);
  }

  try {
    const body = await request.json();
    const requestId = String(body?.requestId || "").trim();
    if (!/^[a-f0-9-]{36}$/i.test(requestId)) {
      return json({ error: "Invalid request reference." }, 400);
    }

    if (supabaseConfigured()) {
      const { data: existing, error: findError } = await supabaseAdmin()
        .from("makeover_consultations")
        .select("id, status")
        .eq("request_id", requestId)
        .maybeSingle();

      if (findError) {
        console.error("Error looking up consultation:", findError);
        return json({ error: "Database error. Please try again." }, 503);
      }

      if (existing) {
        return json({
          id: existing.id,
          status: existing.status || "pending_coverage_review",
        });
      }
    } else {
      const existing = await findByRequestId("consultations", requestId);
      if (existing) {
        return json({
          id: existing.id,
          status: existing.status || "pending_coverage_review",
        });
      }
    }

    const customer = body?.customer || {};
    const name = String(customer.name || "").trim().slice(0, 100);
    let phone = String(customer.phone || "").trim().replace(/\D/g, "");
    if (phone.length === 12 && phone.startsWith("91")) {
      phone = phone.slice(2);
    }

    if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone)) {
      return json({ error: "Please enter your name and a valid mobile number." }, 400);
    }
    if (customer.consent !== true && body?.consent !== true) {
      return json({ error: "Please agree to be contacted." }, 400);
    }

    const pin = customer.pin || body?.pin ? String(customer.pin || body?.pin).trim().slice(0, 10) : null;
    const coverage = body?.coverage || null;

    let ownerId: string | null = null;
    try {
      const user = await userFromRequest(request);
      if (user?.id) ownerId = user.id;
    } catch {
      // Unauthenticated consultation submissions are allowed
    }

    const id = "BC-" + randomUUID().slice(0, 8).toUpperCase();
    const createdAt = new Date().toISOString();

    if (supabaseConfigured()) {
      const { error: insertError } = await supabaseAdmin()
        .from("makeover_consultations")
        .insert({
          id,
          request_id: requestId,
          owner_id: ownerId,
          created_at: createdAt,
          customer: { name, phone, pin },
          coverage,
          status: "pending_coverage_review",
        });

      if (insertError) {
        console.error("Database persistence failed for consultation:", insertError);
        return json({ error: "Could not save consultation. Please try again." }, 503);
      }
    }

    // Also persist to local file store as backup
    try {
      await saveJsonRecord("consultations", id, {
        id,
        requestId,
        ownerId,
        createdAt,
        customer: { name, phone, pin },
        coverage,
        status: "pending_coverage_review",
      });
    } catch (fsError) {
      console.warn("Local filesystem fallback save warning:", fsError);
      if (!supabaseConfigured()) {
        return json({ error: "Could not save consultation. Please try again." }, 503);
      }
    }

    // Operational notification
    try {
      await sendConsultationEmail({
        consultationId: id,
        customer: { name, phone, pin },
        coverage,
      });
    } catch (emailError) {
      console.warn("Consultation email notification failed:", emailError);
    }

    return json({ id, status: "pending_coverage_review" }, 201);
  } catch (e) {
    console.error("Consultation route error:", e);
    return json({ error: "Could not save consultation. Please try again." }, 503);
  }
}

