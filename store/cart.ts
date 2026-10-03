"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  slug: string;
  name: string;
  price: number;
  image: string;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  coupon: string | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  add: (item: Omit<CartLine, "qty">, qty?: number) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  setCoupon: (code: string | null) => void;
  count: () => number;
  subtotal: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      coupon: null,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      add: (item, qty = 1) => {
        set((s) => {
          const existing = s.lines.find((l) => l.slug === item.slug);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.slug === item.slug ? { ...l, qty: l.qty + qty } : l
              ),
              isOpen: true,
            };
          }
          return { lines: [...s.lines, { ...item, qty }], isOpen: true };
        });
      },
      remove: (slug) =>
        set((s) => ({ lines: s.lines.filter((l) => l.slug !== slug) })),
      setQty: (slug, qty) =>
        set((s) => ({
          lines:
            qty <= 0
              ? s.lines.filter((l) => l.slug !== slug)
              : s.lines.map((l) => (l.slug === slug ? { ...l, qty } : l)),
        })),
      clear: () => set({ lines: [], coupon: null }),
      setCoupon: (code) => set({ coupon: code }),
      count: () => get().lines.reduce((n, l) => n + l.qty, 0),
      subtotal: () => get().lines.reduce((n, l) => n + l.price * l.qty, 0),
    }),
    {
      name: "balconia-cart",
      partialize: (s) => ({ lines: s.lines, coupon: s.coupon }),
    }
  )
);
