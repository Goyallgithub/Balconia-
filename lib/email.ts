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
  const promoNote =
    (input.customer as { promo?: { note?: string | null } })?.promo?.note ||
    "";
  return `<div style="font-family:Georgia,serif;color:#304c35">
    <h1>Balconia order ${input.orderId}</h1>
    <p>Hi ${input.customer.name},</p>
    <p>We received your <strong>${input.fulfilmentType === "balconia" ? "makeover" : "DIY"}</strong> request.</p>
    <p><strong>Total products:</strong> ${money(input.subtotalPaise)}${promoNote ? ` · ${promoNote}` : " (delivery/installation quoted separately if needed)"}</p>
    <ul>${lines}</ul>
    <p>${input.customer.address || ""}${input.customer.city ? ", " + input.customer.city : ""} ${input.customer.pin || ""}</p>
    <p>Phone: ${input.customer.phone}</p>
    <p>We’ll confirm next steps by call or WhatsApp. — Team Balconia · care@balconia.in</p>
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

/**
 * Without a verified domain, Resend only delivers to the email that owns each API key.
 * Map: primary key → RESEND_INBOX (default goyallbhavy@gmail.com)
 *      RESEND_API_KEY_2 → RESEND_INBOX_2 (default cachetanruwatia01@gmail.com)
 */
function resendKeyForRecipient(email: string): string | null {
  const primary = process.env.RESEND_API_KEY?.trim() || "";
  const key2 = process.env.RESEND_API_KEY_2?.trim() || "";
  const inbox1 = (
    process.env.RESEND_INBOX || "goyallbhavy@gmail.com"
  ).trim().toLowerCase();
  const inbox2 = (
    process.env.RESEND_INBOX_2 || "cachetanruwatia01@gmail.com"
  ).trim().toLowerCase();

  if (email === inbox2 && key2) return key2;
  if (email === inbox1 && primary) return primary;
  if (email === inbox2 && !key2) return null; // need friend's key
  return primary || null;
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
 * Ops alerts to ORDER_EMAIL_OPS. Without a domain, each recipient needs a Resend
 * API key from an account registered to THAT gmail (see RESEND_API_KEY_2).
 */
export async function sendOrderEmails(input: OrderEmailInput): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const from =
    process.env.ORDER_EMAIL_FROM || "Balconia <onboarding@resend.dev>";
  const opsList = parseOpsList(
    process.env.ORDER_EMAIL_OPS || "goyallbhavy@gmail.com"
  );
  if (!opsList.length) return { sent: false, reason: "ORDER_EMAIL_OPS empty" };
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { sent: false, reason: "RESEND_API_KEY not set" };
  }

  const subject = `Balconia order ${input.orderId}`;
  const html = orderHtml(input);
  const opsSubject = `[Ops] ${subject} · ${input.customer.phone}`;

  let anyOk = false;
  const failures: string[] = [];
  for (const ops of opsList) {
    const key = resendKeyForRecipient(ops);
    if (!key) {
      failures.push(
        `${ops}:no Resend key for this inbox (add RESEND_API_KEY_2 from an account signed up with this Gmail)`
      );
      console.error(
        "Order email skipped — need RESEND_API_KEY_2 from a Resend account for",
        ops
      );
      continue;
    }
    const result = await sendOne(key, from, [ops], opsSubject, html);
    if (result.ok) anyOk = true;
    else failures.push(`${ops}:${result.reason}`);
  }

  const toCustomer = input.customer.email?.trim().toLowerCase();
  if (toCustomer && !opsList.includes(toCustomer)) {
    const key = resendKeyForRecipient(toCustomer);
    if (key) await sendOne(key, from, [toCustomer], subject, html);
  }

  if (!anyOk) return { sent: false, reason: failures.join("; ") || "ops failed" };
  return {
    sent: true,
    reason: failures.length ? failures.join("; ") : undefined,
  };
}
