"use client";

import { useCartStore } from "@/store/cart";

/** Convenience selector hook around the persisted Zustand cart. */
export function useCart() {
  const store = useCartStore();
  return {
    ...store,
    itemCount: store.count(),
    subtotal: store.subtotal(),
  };
}
