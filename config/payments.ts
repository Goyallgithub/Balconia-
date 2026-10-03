/**
 * UPI-only payments (no gateway). Edit these for go-live.
 */
export const payments = {
  upiId: process.env.NEXT_PUBLIC_UPI_ID || "balconia@upi",
  payeeName: process.env.NEXT_PUBLIC_UPI_NAME || "Balconia",
} as const;

export function buildUpiPayUrl(amount: number, orderNote: string): string {
  const params = new URLSearchParams({
    pa: payments.upiId,
    pn: payments.payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: orderNote.slice(0, 80),
  });
  return `upi://pay?${params.toString()}`;
}
