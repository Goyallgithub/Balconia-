"use client";

import { useState } from "react";
import { whatsappLink } from "@/lib/whatsapp";

const CITIES = [
  "Delhi",
  "Gurgaon",
  "Noida",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chandigarh",
  "Other",
];

export default function BookPage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "Delhi",
    size: "Medium",
    style: "Minimal",
    budget: 35000,
    date: "",
  });

  const wa = whatsappLink(
    `Hi Balconia, I want to book a makeover.\nName: ${form.name}\nPhone: ${form.phone}\nCity: ${form.city}\nSize: ${form.size}\nStyle: ${form.style}\nBudget: ₹${form.budget}\nPreferred date: ${form.date || "flexible"}`
  );

  async function submit() {
    await fetch("/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 md:px-8">
        <h1 className="display text-4xl tracking-[-0.04em]">
          We will WhatsApp you within 24 hours
        </h1>
        <p className="mt-4 text-ink/70">
          Your brief is with the design team. Tap below to message us now.
        </p>
        <a href={wa} className="btn-primary mt-8 inline-flex" target="_blank" rel="noopener noreferrer">
          Open WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 pb-28 md:px-8">
      <p className="furniture text-grey">
        Step {step + 1} of 5
      </p>
      <div className="mt-3 h-px w-full bg-ink/10">
        <div
          className="h-px bg-accent transition-all duration-500"
          style={{
            width: `${((step + 1) / 5) * 100}%`,
            transitionTimingFunction: "var(--ease)",
          }}
        />
      </div>

      <h1 className="display mt-8 text-4xl tracking-[-0.04em]">
        Book a makeover
      </h1>

      {step === 0 && (
        <div className="mt-8 space-y-4">
          <input
            className="w-full border border-ink/25 bg-plaster px-4 py-3"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="flex">
            <span className="flex items-center border border-r-0 border-ink/25 px-3 text-grey">
              +91
            </span>
            <input
              className="w-full border border-ink/25 bg-plaster px-4 py-3"
              placeholder="Mobile"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <select
            className="w-full border border-ink/25 bg-plaster px-4 py-3"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          >
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {step === 1 && (
        <div className="mt-8 space-y-3">
          <p className="text-ink/70">Balcony size</p>
          {["Small", "Medium", "Large"].map((s) => (
            <button
              key={s}
              type="button"
              className={`block w-full border px-4 py-4 text-left ${
                form.size === s ? "border-ink bg-ink text-plaster" : "border-ink/25"
              }`}
              onClick={() => setForm({ ...form, size: s })}
            >
              {s}{" "}
              <span className="text-sm opacity-70">
                {s === "Small"
                  ? "under 30 sq ft"
                  : s === "Medium"
                    ? "30–60 sq ft"
                    : "60+ sq ft"}
              </span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="mt-8 space-y-4">
          <p className="text-ink/70">Style</p>
          <div className="grid grid-cols-2 gap-2">
            {["Minimal", "Boho", "Modern", "Tropical", "Festive"].map((s) => (
              <button
                key={s}
                type="button"
                className={`border px-3 py-4 ${
                  form.style === s ? "border-ink bg-ink text-plaster" : "border-ink/25"
                }`}
                onClick={() => setForm({ ...form, style: s })}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="block pt-4">
            <span className="furniture text-grey">
              Budget · {formatBudget(form.budget)}
            </span>
            <input
              type="range"
              min={10000}
              max={100000}
              step={1000}
              value={form.budget}
              onChange={(e) =>
                setForm({ ...form, budget: Number(e.target.value) })
              }
              className="mt-3 w-full accent-[var(--accent)]"
            />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="furniture text-grey">Preferred visit date</span>
            <input
              type="date"
              className="mt-2 w-full border border-ink/25 bg-plaster px-4 py-3"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
        </div>
      )}

      {step === 4 && (
        <dl className="mt-8 space-y-3 text-sm">
          {Object.entries({
            Name: form.name,
            Phone: form.phone,
            City: form.city,
            Size: form.size,
            Style: form.style,
            Budget: formatBudget(form.budget),
            Date: form.date || "Flexible",
          }).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-ink/10 py-2">
              <dt className="text-grey">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-10 flex gap-3">
        {step > 0 ? (
          <button
            type="button"
            className="btn-outline flex-1"
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </button>
        ) : null}
        {step < 4 ? (
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </button>
        ) : (
          <button type="button" className="btn-primary flex-1" onClick={submit}>
            Submit
          </button>
        )}
      </div>
    </div>
  );
}

function formatBudget(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
