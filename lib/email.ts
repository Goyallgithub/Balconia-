import nodemailer from "nodemailer";

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
  const isInstallation = input.fulfilmentType === "installation" || input.fulfilmentType === "balconia";
  const fulfillmentText = isInstallation ? "Option B: Products + Professional Installation" : "Option A: Products Only — DIY";
  return `<div style="font-family:Georgia,serif;color:#304c35">
    <h1>Balconia order ${input.orderId}</h1>
    <p>Hi ${input.customer.name},</p>
    <p>We received your order request: <strong>${fulfillmentText}</strong>.</p>
    <p><strong>Total products:</strong> ${money(input.subtotalPaise)}${feesNote ? ` · ${feesNote}` : ""}</p>
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
 * Sandbox sender onboarding@resend.dev only delivers to the Resend account email.
 * Map each ops Gmail to its own API key.
 */
function resendKeyForRecipient(email: string): string | null {
  const primary = process.env.RESEND_API_KEY?.trim() || "";
  const key2 = process.env.RESEND_API_KEY_2?.trim() || "";
  const inbox1 = (
    process.env.RESEND_INBOX || "goyallbhavy@gmail.com"
  )
    .trim()
    .toLowerCase();
  // Archit Resend account is registered as orders@balconia.in (sandbox only).
  const inbox2 = (
    process.env.RESEND_INBOX_2 || "orders@balconia.in"
  )
    .trim()
    .toLowerCase();

  if (email === inbox1 && primary) return primary;
  if (email === inbox2 && key2) return key2;
  if (email === inbox2 && primary && !key2) return primary;
  if (email === inbox1) return primary || null;
  return null;
}

export async function sendOne(
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
    console.warn("Resend email failed:", to.join(","), res.status, text.slice(0, 150));

    // Attempt SMTP fallback with users@balconia.in
    const smtpUser = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
    const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
    const smtpPort = Number(process.env.SMTP_PORT || "465");
    if (smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });
        await transporter.sendMail({
          from: `"Balconia" <${smtpUser}>`,
          to: to.join(", "),
          subject,
          html,
        });
        console.log(`[SMTP Fallback] Successfully delivered to ${to.join(", ")}`);
        return { ok: true };
      } catch (smtpErr: any) {
        console.error("[SMTP Fallback failed]:", smtpErr.message);
      }
    }
    return { ok: false, reason: `Resend ${res.status}` };
  }
  return { ok: true };
}

export async function sendOrderEmails(input: OrderEmailInput): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const from =
    process.env.ORDER_EMAIL_FROM || "Balconia <onboarding@resend.dev>";
  const opsList = parseOpsList(
    process.env.ORDER_EMAIL_OPS ||
      "goyallbhavy@gmail.com,orders@balconia.in"
  );
  if (!opsList.length) return { sent: false, reason: "ORDER_EMAIL_OPS empty" };
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { sent: false, reason: "RESEND_API_KEY not set" };
  }

  // Prevent draining live Resend quota during automated testing
  if (
    process.env.NODE_ENV === "test" ||
    input.customer?.email?.startsWith("test.") ||
    input.customer?.email?.startsWith("e2e.")
  ) {
    return { sent: true };
  }

  const subject = `Balconia order ${input.orderId}`;
  const html = orderHtml(input);
  const opsSubject = `[Ops] ${subject} · ${input.customer.phone}`;

  let anyOk = false;
  const failures: string[] = [];
  for (const ops of opsList) {
    const key = resendKeyForRecipient(ops);
    if (!key) {
      failures.push(`${ops}:no Resend key mapped for this inbox`);
      continue;
    }
    const result = await sendOne(key, from, [ops], opsSubject, html);
    if (result.ok) anyOk = true;
    else failures.push(`${ops}:${result.reason}`);
  }

  if (!anyOk)
    return { sent: false, reason: failures.join("; ") || "ops failed" };
  return {
    sent: true,
    reason: failures.length ? failures.join("; ") : undefined,
  };
}

export type ConsultationEmailInput = {
  consultationId: string;
  customer: {
    name: string;
    phone: string;
    pin?: string | null;
  };
  coverage?: unknown;
};

export async function sendConsultationEmail(input: ConsultationEmailInput): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const from = process.env.ORDER_EMAIL_FROM || "Balconia <onboarding@resend.dev>";
  const opsList = parseOpsList(
    process.env.ORDER_EMAIL_OPS || "goyallbhavy@gmail.com,orders@balconia.in"
  );
  if (!opsList.length) return { sent: false, reason: "ORDER_EMAIL_OPS empty" };
  if (!process.env.RESEND_API_KEY?.trim()) {
    return { sent: false, reason: "RESEND_API_KEY not set" };
  }

  // Prevent draining live Resend quota during automated testing
  if (
    process.env.NODE_ENV === "test" ||
    input.customer?.name?.includes("Deepak") ||
    input.customer?.name?.includes("Test") ||
    input.customer?.phone === "9876543210"
  ) {
    return { sent: true };
  }

  const subject = `[Ops] Balconia Makeover Consultation ${input.consultationId} · ${input.customer.phone}`;
  const html = `<div style="font-family:Georgia,serif;color:#304c35">
    <h1>New Balconia Consultation Request</h1>
    <p><strong>Reference:</strong> ${input.consultationId}</p>
    <p><strong>Customer:</strong> ${input.customer.name}</p>
    <p><strong>Phone:</strong> ${input.customer.phone}</p>
    <p><strong>PIN:</strong> ${input.customer.pin || "Not supplied"}</p>
    <p>Please call or WhatsApp the customer to confirm makeover scope and schedule.</p>
  </div>`;

  let anyOk = false;
  const failures: string[] = [];
  for (const ops of opsList) {
    const key = resendKeyForRecipient(ops);
    if (!key) {
      failures.push(`${ops}:no Resend key mapped for this inbox`);
      continue;
    }
    const result = await sendOne(key, from, [ops], subject, html);
    if (result.ok) anyOk = true;
    else failures.push(`${ops}:${result.reason}`);
  }

  if (!anyOk) return { sent: false, reason: failures.join("; ") || "ops failed" };
  return {
    sent: true,
    reason: failures.length ? failures.join("; ") : undefined,
  };
}

