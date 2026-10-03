"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { recommend } from "@/lib/recommend";
import { useCartStore } from "@/store/cart";
import { formatINR } from "@/lib/format";
import type { Product } from "@/data/products";

type Answers = {
  size: "Small" | "Medium" | "Large";
  light: "full" | "partial" | "shade";
  style: "Minimal" | "Boho" | "Modern" | "Tropical" | "Festive";
  budget: number;
};

export default function DiyPage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    size: "Medium",
    light: "partial",
    style: "Modern",
    budget: 25000,
  });
  const add = useCartStore((s) => s.add);

  const bundle = useMemo(
    () => (done ? recommend(answers) : ([] as Product[])),
    [done, answers]
  );
  const total = bundle.reduce((n, p) => n + p.price, 0);

  async function finish() {
    await fetch("/api/diy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    });
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 py-12 pb-28 md:px-8">
        <p className="furniture text-grey">Your Balconia list</p>
        <h1 className="display mt-3 text-4xl tracking-[-0.04em]">
          Curated for your balcony
        </h1>
        <p className="mt-3 text-ink/70">
          {answers.size} · {answers.light} light · {answers.style} · budget{" "}
          {formatINR(answers.budget)}
        </p>
        <p className="price mt-4 text-2xl">Bundle {formatINR(total)}</p>

        <button
          type="button"
          className="btn-primary mt-6"
          onClick={() =>
            bundle.forEach((p) =>
              add({
                slug: p.slug,
                name: p.name,
                price: p.price,
                image: p.images[0],
              })
            )
          }
        >
          Add all to cart
        </button>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {bundle.map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} />
          ))}
        </div>

        <p className="mt-12 text-ink/70">
          Prefer us to do it?{" "}
          <Link href="/book" className="text-accent">
            Book a makeover
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 pb-28 md:px-8">
      <p className="furniture text-grey">Question {step + 1} of 4</p>
      <h1 className="display mt-4 text-4xl tracking-[-0.04em]">
        Build your list
      </h1>

      {step === 0 && (
        <Choice
          label="Balcony size"
          options={["Small", "Medium", "Large"]}
          value={answers.size}
          onChange={(size) =>
            setAnswers({ ...answers, size: size as Answers["size"] })
          }
        />
      )}
      {step === 1 && (
        <Choice
          label="Light"
          options={["full", "partial", "shade"]}
          labels={{ full: "Full sun", partial: "Partial", shade: "Shade" }}
          value={answers.light}
          onChange={(light) =>
            setAnswers({ ...answers, light: light as Answers["light"] })
          }
        />
      )}
      {step === 2 && (
        <Choice
          label="Style"
          options={["Minimal", "Boho", "Modern", "Tropical", "Festive"]}
          value={answers.style}
          onChange={(style) =>
            setAnswers({ ...answers, style: style as Answers["style"] })
          }
        />
      )}
      {step === 3 && (
        <label className="mt-8 block">
          <span className="furniture text-grey">
            Budget · {formatINR(answers.budget)}
          </span>
          <input
            type="range"
            min={5000}
            max={80000}
            step={1000}
            value={answers.budget}
            onChange={(e) =>
              setAnswers({ ...answers, budget: Number(e.target.value) })
            }
            className="mt-4 w-full accent-[var(--accent)]"
          />
        </label>
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
        {step < 3 ? (
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </button>
        ) : (
          <button type="button" className="btn-primary flex-1" onClick={finish}>
            See my list
          </button>
        )}
      </div>
    </div>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
  labels,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="mt-8 space-y-2">
      <p className="text-ink/70">{label}</p>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`block w-full border px-4 py-4 text-left ${
            value === o ? "border-ink bg-ink text-plaster" : "border-ink/25"
          }`}
          onClick={() => onChange(o)}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}
