import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/order-store";
import { generateOrderReceiptPdf, OrderRecord } from "@/lib/pdf-receipt";
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

    const orderRaw = await getOrderById(id);
    if (!orderRaw) {
      return json({ error: "Order not found." }, 404);
    }

    // Verify authorization: If the order was created by a signed-in user, ensure the requester is that user
    const user = await userFromRequest(request);
    const ownerId = (orderRaw.ownerId || orderRaw.owner_id) as string | undefined;
    if (ownerId && (!user || user.id !== ownerId)) {
      return json({ error: "Unauthorized access to order receipt." }, 403);
    }

    const order: OrderRecord = {
      id: String(orderRaw.id),
      requestId: orderRaw.requestId ? String(orderRaw.requestId) : undefined,
      createdAt: String(orderRaw.createdAt || orderRaw.created_at || new Date().toISOString()),
      status: String(orderRaw.status || "pending_confirmation"),
      paymentMethod: String(orderRaw.paymentMethod || orderRaw.payment_method || "cod"),
      customer: orderRaw.customer as any,
      items: orderRaw.items as any,
      subtotalPaise: Number(orderRaw.subtotalPaise ?? orderRaw.subtotal_paise ?? 0),
      totalPaise: orderRaw.totalPaise != null ? Number(orderRaw.totalPaise) : undefined,
      fulfilmentType: String(orderRaw.fulfilmentType || orderRaw.fulfilment_type || "diy"),
      fulfilmentLabel: orderRaw.fulfilmentLabel ? String(orderRaw.fulfilmentLabel) : undefined,
      shippingStatus: orderRaw.shippingStatus ? String(orderRaw.shippingStatus) : undefined,
      fees: orderRaw.fees as any,
      ownerId,
    };

    const pdfBytes = await generateOrderReceiptPdf(order);

    const isDownload = new URL(request.url).searchParams.get("download") === "1";
    const disposition = isDownload
      ? `attachment; filename="Balconia-Receipt-${id}.pdf"`
      : `inline; filename="Balconia-Receipt-${id}.pdf"`;

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Content-Length": String(pdfBytes.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("PDF receipt generation failed:", error);
    return json({ error: "Could not generate order receipt PDF." }, 500);
  }
}
