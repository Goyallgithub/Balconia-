import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/order-store";
import { userFromRequest } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id || typeof id !== "string") {
      return json({ error: "Order ID is required." }, 400);
    }

    const order = await getOrderById(id);
    if (!order) {
      return json({ error: "Order not found." }, 404);
    }

    const user = await userFromRequest(request);
    // If order was placed by an authenticated user, enforce ownership
    if (order.ownerId && (!user || user.id !== order.ownerId)) {
      return json({ error: "Unauthorized access to order." }, 403);
    }

    return json({
      id: order.id,
      createdAt: order.createdAt || order.created_at,
      status: order.status,
      paymentMethod: order.paymentMethod || order.payment_method || "cod",
      customer: order.customer,
      items: order.items,
      subtotalPaise: order.subtotalPaise ?? order.subtotal_paise,
      totalPaise: order.totalPaise ?? order.total_paise ?? order.subtotalPaise,
      fulfilmentType: order.fulfilmentType || order.fulfilment_type || "diy",
      fulfilmentLabel:
        order.fulfilmentLabel ||
        ((order.fulfilmentType || order.fulfilment_type) === "installation"
          ? "Option B: Products + Professional Installation"
          : "Option A: Products Only — DIY"),
      fees: order.fees,
      shippingStatus: order.shippingStatus || order.shipping_status,
    });
  } catch (error) {
    console.error("Order lookup error:", error);
    return json({ error: "Failed to retrieve order." }, 500);
  }
}
