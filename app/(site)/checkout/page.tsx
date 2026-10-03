"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/store/cart";
import { formatINR } from "@/lib/format";
import { isDiwaliActive } from "@/config/season";
import { buildUpiPayUrl, payments } from "@/config/payments";

const inputClass =
  "w-full border border-ink/25 bg-plaster px-4 py-3 font-bodoni";

/**
 * UPI-only checkout. No payment gateway.
 * Customer pays via UPI app / ID, then submits UTR for confirmation.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const coupon = useCartStore((s) => s.coupon);
  const clear = useCartStore((s) => s.clear);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"details" | "pay">("details");
  const [draft, setDraft] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
  });

  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const diwali = isDiwaliActive();
  const discount =
    diwali && coupon?.toUpperCase() === "DIWALI10"
      ? Math.round(subtotal * 0.1)
      : 0;
  const total = subtotal - discount;

  const orderNote = useMemo(
    () => `Balconia order ${draft.name || "guest"}`.trim(),
    [draft.name]
  );
  const upiUrl = buildUpiPayUrl(total, orderNote);

  if (lines.length === 0) {
    return (
      <div className="px-4 py-24 text-center">
        <h1 className="display text-3xl">Nothing to check out</h1>
        <Link href="/shop" className="btn-primary mt-8 inline-flex">
          Browse shop
        </Link>
      </div>
    );
  }

  function validateDetails(): boolean {
    setError("");
    if (
      !draft.name ||
      !draft.phone ||
      !draft.email ||
      !draft.address ||
      !draft.city
    ) {
      setError("Please fill every field.");
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(draft.phone.replace(/\D/g, "").slice(-10))) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return false;
    }
    if (!/^\d{6}$/.test(draft.pincode)) {
      setError("Enter a valid 6-digit PIN code.");
      return false;
    }
    return true;
  }

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(payments.upiId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Please note the UPI ID manually.");
    }
  }

  async function confirmPaid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const utr = String(form.get("utr") || "").trim();
    if (utr.length < 6) {
      setError("Enter the UPI transaction / UTR reference from your app.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: total,
          currency: "INR",
          payment: "upi",
          utr,
          customer: draft,
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      clear();
      router.push(
        `/order/success?order=${data.orderId}&utr=${encodeURIComponent(utr)}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1000px] gap-10 px-4 py-12 pb-28 md:grid-cols-[1.3fr_1fr] md:px-8">
      <div>
        <p className="furniture text-grey">Checkout · UPI only</p>
        <h1 className="display mt-2 text-4xl tracking-[-0.04em]">
          {step === "details" ? "Shipping details" : "Pay with UPI"}
        </h1>

        {step === "details" ? (
          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (validateDetails()) setStep("pay");
            }}
          >
            <input
              placeholder="Full name"
              className={inputClass}
              style={{ minHeight: 48 }}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
            <div className="flex">
              <span className="flex items-center border border-r-0 border-ink/25 px-3 text-sm text-grey">
                +91
              </span>
              <input
                placeholder="Mobile"
                className={`${inputClass} border-l-0`}
                style={{ minHeight: 48 }}
                inputMode="numeric"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                required
              />
            </div>
            <input
              type="email"
              placeholder="Email"
              className={inputClass}
              style={{ minHeight: 48 }}
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              required
            />
            <textarea
              placeholder="Address"
              className={`${inputClass} min-h-24`}
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              required
            />
            <input
              placeholder="City"
              className={inputClass}
              style={{ minHeight: 48 }}
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              required
            />
            <input
              placeholder="PIN code"
              className={inputClass}
              style={{ minHeight: 48 }}
              inputMode="numeric"
              maxLength={6}
              value={draft.pincode}
              onChange={(e) => setDraft({ ...draft, pincode: e.target.value })}
              required
            />
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <button type="submit" className="btn-primary w-full">
              Continue to UPI payment
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="border border-ink/15 bg-paper p-5">
              <p className="furniture text-grey">Pay exactly</p>
              <p className="price mt-2 text-3xl">{formatINR(total)}</p>
              <p className="mt-4 furniture text-grey">UPI ID</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="text-lg tracking-[-0.02em]">{payments.upiId}</code>
                <button
                  type="button"
                  className="furniture border border-ink px-3 py-2"
                  onClick={copyUpi}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-sm text-ink/65">
                Payee: {payments.payeeName}
              </p>
            </div>

            <a href={upiUrl} className="btn-primary flex w-full justify-center text-center">
              Open UPI app
            </a>
            <p className="text-sm text-ink/60">
              Opens GPay, PhonePe, Paytm or any UPI app with the amount filled.
              If the link does not open, copy the UPI ID and pay manually.
            </p>

            <form
              onSubmit={confirmPaid}
              className="space-y-4 border-t border-ink/10 pt-6"
            >
              <label className="block">
                <span className="furniture text-grey">
                  UPI transaction / UTR reference
                </span>
                <input
                  name="utr"
                  className={`${inputClass} mt-2`}
                  style={{ minHeight: 48 }}
                  placeholder="e.g. 123456789012"
                  required
                />
              </label>
              {error ? <p className="text-sm text-accent">{error}</p> : null}
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={pending}
              >
                {pending ? "Confirming…" : "I have paid"}
              </button>
              <button
                type="button"
                className="btn-outline w-full"
                onClick={() => {
                  setError("");
                  setStep("details");
                }}
              >
                Back to details
              </button>
            </form>
          </div>
        )}
      </div>

      <aside className="h-fit border border-ink/15 bg-paper p-6">
        <p className="furniture">Order summary</p>
        <ul className="mt-4 space-y-3 text-sm">
          {lines.map((l) => (
            <li key={l.slug} className="flex justify-between gap-3">
              <span>
                {l.name} × {l.qty}
              </span>
              <span className="tabular-nums">{formatINR(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        {discount > 0 ? (
          <div className="mt-3 flex justify-between text-sm text-accent">
            <span>DIWALI10</span>
            <span>−{formatINR(discount)}</span>
          </div>
        ) : null}
        <div className="mt-6 flex justify-between border-t border-ink/10 pt-4 text-lg">
          <span>Total</span>
          <span className="price">{formatINR(total)}</span>
        </div>
        <p className="furniture mt-4 text-grey">Payment · UPI only</p>
      </aside>
    </div>
  );
}
