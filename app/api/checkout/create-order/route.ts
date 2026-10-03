import { NextResponse } from "next/server";

/**
 * Frontend-only UPI orders. Logs the lead + UTR for the owner to verify manually.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const utr = String(body.utr || "").trim();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (utr.length < 6) {
      return NextResponse.json(
        { error: "UPI transaction reference required" },
        { status: 400 }
      );
    }

    const orderId = `BAL${Date.now().toString(36).toUpperCase()}`;

    console.log("[checkout] UPI order", {
      orderId,
      amount,
      utr,
      payment: "upi",
      customer: body.customer,
      lines: body.lines?.map(
        (l: { slug: string; qty: number }) => `${l.slug}×${l.qty}`
      ),
    });

    return NextResponse.json({
      orderId,
      amount,
      currency: "INR",
      payment: "upi",
      utr,
    });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
