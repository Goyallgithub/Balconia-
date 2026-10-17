type OrderEmailInput = {
  orderId: string;
  fulfilmentType: string;
  subtotalPaise: number;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    pin?: string;
  };
  items: Array<{ name: string; quantity: number; unitPricePaise: number }>;
};

function money(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function orderHtml(input: OrderEmailInput) {
  const lines = input.items
    .map(
      (i) =>
        `<li>${i.quantity} × ${i.name} — ${money(i.unitPricePaise * i.quantity)}</li>`
    )
    .join("");
  const feesNote =
    (input.customer as { fees?: { note?: string | null } })?.fees?.note || "";
  return `<div style="font-family:Georgia,serif;color:#304c35">
    <h1>Balconia order ${input.orderId}</h1>
    <p>Hi ${input.customer.name},</p>
    <p>We received your <strong>${input.fulfilmentType === "balconia" ? "makeover" : "DIY"}</strong> request.</p>
    <p><strong>Total products:</strong> ${money(input.subtotalPaise)}${feesNote ? ` · ${feesNote}` : ""}</p>
    <ul>${lines}</ul>
    <p>${input.customer.address || ""}${input.customer.city ? ", " + input.customer.city : ""} ${input.customer.pin || ""}</p>
    <p>Phone: ${input.customer.phone}</p>
    <p>We’ll confirm next steps by call or WhatsApp. — Team Balconia · orders@balconia.in</p>
  </div>`;
}

function parseOpsList(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    ),
  ];
}

async function sendOne(
  key: string,
  from: string,
  to: string[],
  subject: string,
  html: string
): Promise<{ ok: boolean; reason?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      "Order email failed",
      to.join(","),
      res.status,
      text.slice(0, 300)
    );
    return { ok: false, reason: `Resend ${res.status}` };
  }
  return { ok: true };
}

/**
 * Sends ops alert to ORDER_EMAIL_OPS (default orders@balconia.in).
 * Requires RESEND_API_KEY and a verified domain sender in ORDER_EMAIL_FROM.
 */
export async function sendOrderEmails(input: OrderEmailInput): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const key = process.env.RESEND_API_KEY?.trim() || "";
  const from =
    process.env.ORDER_EMAIL_FROM || "Balconia <orders@balconia.in>";
  const opsList = parseOpsList(
    process.env.ORDER_EMAIL_OPS || "orders@balconia.in"
  );
  if (!opsList.length) return { sent: false, reason: "ORDER_EMAIL_OPS empty" };
  if (!key) return { sent: false, reason: "RESEND_API_KEY not set" };

  const subject = `Balconia order ${input.orderId}`;
  const html = orderHtml(input);
  const opsSubject = `[Ops] ${subject} · ${input.customer.phone}`;

  let anyOk = false;
  const failures: string[] = [];
  for (const ops of opsList) {
    const result = await sendOne(key, from, [ops], opsSubject, html);
    if (result.ok) anyOk = true;
    else failures.push(`${ops}:${result.reason}`);
  }

  const toCustomer = input.customer.email?.trim().toLowerCase();
  if (toCustomer && !opsList.includes(toCustomer)) {
    await sendOne(key, from, [toCustomer], subject, html);
  }

  if (!anyOk)
    return { sent: false, reason: failures.join("; ") || "ops failed" };
  return {
    sent: true,
    reason: failures.length ? failures.join("; ") : undefined,
  };
}
