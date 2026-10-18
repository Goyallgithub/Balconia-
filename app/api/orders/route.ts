import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import products from "@/lib/shop-data.json";
import { validateOrder } from "@/lib/order-service.mjs";
import {
  checkPostal,
  CoverageError,
  deliveryAddress,
  itemNeedsInstallation,
} from "@/lib/serviceability.mjs";
import { findByRequestId, saveJsonRecord } from "@/lib/order-store";
import { sendOrderEmails } from "@/lib/email";
import { supabaseAdmin, supabaseConfigured, userFromRequest } from "@/lib/supabase";
import { isValidOrigin } from "@/lib/origin";

/** Soft-launch gate: NCR state + serviceable PIN. Full street geocode can come later with ArcGIS. */
async function assertDelhiNcrOrder(
  customer: { state: string; city: string; address: string; pin: string; area?: string },
  items: Array<{ id: string }>,
  fulfilmentType: string
) {
  deliveryAddress(customer);
  const postal = await checkPostal(customer.pin, {
    ARCGIS_GEOCODING_API_KEY: process.env.ARCGIS_GEOCODING_API_KEY,
  });
  if (postal.productDelivery === "unavailable") {
    throw new CoverageError(
      "We currently deliver within Delhi NCR. Orders to this PIN cannot be accepted.",
      422
    );
  }
  if (
    postal.productDelivery !== "available_preliminary" &&
    postal.productDelivery !== "available"
  ) {
    throw new CoverageError(
      "This PIN could not be verified for Delhi NCR delivery. Please check the PIN or try a nearby locality.",
      422
    );
  }
  const installationRequired =
    fulfilmentType === "installation" ||
    fulfilmentType === "balconia";
  if (installationRequired && postal.makeover === "unavailable") {
    throw new CoverageError(
      "Makeover installation is not available for this PIN. You can still request DIY product delivery if your area is covered.",
      422
    );
  }
  return postal;
}

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
    const user = await userFromRequest(request);

    if (supabaseConfigured()) {
      const { data: existing } = await supabaseAdmin()
        .from("orders")
        .select("id, subtotal_paise, status, fulfilment_type")
        .eq("request_id", String(body?.requestId || ""))
        .maybeSingle();
      if (existing) {
        const isInst = existing.fulfilment_type === "installation" || existing.fulfilment_type === "balconia";
        return json({
          id: existing.id,
          subtotalPaise: existing.subtotal_paise,
          status: existing.status,
          fulfilmentType: existing.fulfilment_type,
          fulfilmentLabel: isInst
            ? "Option B: Products + Professional Installation"
            : "Option A: Products Only — DIY",
          duplicate: true,
        });
      }
    } else {
      const existing = await findByRequestId(
        "orders",
        String(body?.requestId || "")
      );
      if (existing) {
        const isInst = existing.fulfilmentType === "installation" || existing.fulfilmentType === "balconia";
        return json({
          id: existing.id,
          subtotalPaise: existing.subtotalPaise,
          totalPaise: existing.totalPaise || existing.subtotalPaise,
          status: existing.status,
          fulfilmentType: existing.fulfilmentType,
          fulfilmentLabel: isInst
            ? "Option B: Products + Professional Installation"
            : "Option A: Products Only — DIY",
          duplicate: true,
          fees: existing.fees,
        });
      }
    }

    const order = validateOrder(body, products);
    const rawType = String(body.fulfilmentType || "").trim().toLowerCase();
    const isInstallation =
      rawType === "installation" ||
      rawType === "balconia" ||
      rawType === "option_b" ||
      rawType === "products_installation";
    const fulfilmentType = isInstallation ? "installation" : "diy";
    const fulfilmentLabel = isInstallation
      ? "Option B: Products + Professional Installation"
      : "Option A: Products Only — DIY";

    if (isInstallation && body.serviceAcknowledged !== true) {
      throw new Error(
        "Please confirm that installation and delivery will be quoted before your makeover is confirmed."
      );
    }

    const coverage = await assertDelhiNcrOrder(
      order.customer as {
        state: string;
        city: string;
        address: string;
        pin: string;
        area?: string;
      },
      order.items as Array<{ id: string }>,
      fulfilmentType
    );
    order.customer = { ...order.customer, coverage };

    const FREE_SHIP_PAISE = 50_000; // ₹500
    const SHIP_FEE_PAISE = 15_000; // ₹150
    const FREE_INSTALL_PAISE = 100_000; // ₹1,000
    const INSTALL_FEE_PAISE = 50_000; // ₹500
    const couponOk =
      String(body?.couponCode || "")
        .trim()
        .toUpperCase() === "BALCONIA";
    const installNeeded = isInstallation;
    // Diwali code BALCONIA unlocks free shipping at ₹500+ / free installation at ₹1,000+
    const shippingPaise =
      couponOk && order.subtotalPaise >= FREE_SHIP_PAISE ? 0 : SHIP_FEE_PAISE;
    const shippingFree = shippingPaise === 0;
    const installationPaise = installNeeded
      ? couponOk && order.subtotalPaise >= FREE_INSTALL_PAISE
        ? 0
        : INSTALL_FEE_PAISE
      : 0;
    const installationFree = installNeeded && installationPaise === 0;
    const totalPaise = order.subtotalPaise + shippingPaise + installationPaise;
    const fees = {
      couponCode: couponOk ? "BALCONIA" : null,
      fulfilmentType,
      fulfilmentLabel,
      shippingPaise,
      installationPaise,
      shippingFree,
      installationFree,
      installNeeded,
      subtotalPaise: order.subtotalPaise,
      totalPaise,
      note: couponOk
        ? [
            shippingFree
              ? "BALCONIA · free shipping."
              : "BALCONIA applied · shipping ₹150 until ₹500.",
            installNeeded
              ? installationFree
                ? "Free installation."
                : "Installation ₹500 until ₹1,000."
              : null,
          ]
            .filter(Boolean)
            .join(" ")
        : [
            "Apply Diwali code BALCONIA for free shipping on orders ₹500+ and free installation on orders ₹1,000+.",
            `Shipping ₹150${installNeeded ? " · Installation ₹500" : ""}.`,
          ].join(" "),
    };
    order.customer = { ...order.customer, fees };

    const id =
      "BAL-" +
      new Date().toISOString().slice(0, 10).replaceAll("-", "") +
      "-" +
      randomUUID().slice(0, 8).toUpperCase();
    const status =
      isInstallation
        ? "pending_service_quote"
        : "pending_confirmation";

    const record = {
      id,
      requestId: order.requestId,
      createdAt: new Date().toISOString(),
      status,
      paymentMethod: "cod",
      customer: order.customer,
      items: order.items,
      subtotalPaise: order.subtotalPaise,
      totalPaise,
      designId: body.designId || null,
      fulfilmentType,
      fulfilmentLabel,
      shippingStatus: shippingFree
        ? "free"
        : shippingPaise > 0
          ? "flat_fee"
          : "to_be_confirmed",
      ownerId: user?.id || null,
      fees,
    };

    if (supabaseConfigured()) {
      const { error } = await supabaseAdmin().from("orders").insert({
        id: record.id,
        request_id: record.requestId,
        owner_id: record.ownerId,
        created_at: record.createdAt,
        status: record.status,
        payment_method: record.paymentMethod,
        customer: record.customer,
        items: record.items,
        design_id: record.designId,
        fulfilment_type: record.fulfilmentType,
        subtotal_paise: record.subtotalPaise,
        shipping_status: record.shippingStatus,
      });
      if (error) throw new Error(error.message);
    } else {
      await saveJsonRecord("orders", id, record);
    }

    const mail = await sendOrderEmails({
      orderId: id,
      fulfilmentType,
      subtotalPaise: order.subtotalPaise,
      customer: order.customer as {
        name: string;
        phone: string;
        email?: string;
        address?: string;
        city?: string;
        pin?: string;
      },
      items: order.items as Array<{
        name: string;
        quantity: number;
        unitPricePaise: number;
      }>,
    });
    if (mail.sent && supabaseConfigured()) {
      await supabaseAdmin()
        .from("orders")
        .update({ email_sent_at: new Date().toISOString() })
        .eq("id", id);
    }

    return json(
      {
        id,
        subtotalPaise: order.subtotalPaise,
        totalPaise,
        status,
        fulfilmentType,
        fulfilmentLabel,
        emailSent: mail.sent,
        fees,
      },
      201
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (e instanceof CoverageError) return json({ error: message }, e.status);
    if (/Please|Enter|Invalid|Your cart/.test(message)) {
      return json({ error: message }, 400);
    }
    console.error("Order save failed", e);
    return json(
      {
        error:
          "Your order could not be saved. Please try again; your cart is safe.",
      },
      503
    );
  }
}
