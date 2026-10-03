/** Indian digit grouping for INR amounts, e.g. 12499 → "12,499" */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount);
  const neg = rounded < 0;
  const n = Math.abs(rounded).toString();
  if (n.length <= 3) return `${neg ? "-" : ""}₹${n}`;

  const last3 = n.slice(-3);
  let rest = n.slice(0, -3);
  const parts: string[] = [];

  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);

  return `${neg ? "-" : ""}₹${parts.join(",")},${last3}`;
}

export function formatINRPlain(amount: number): string {
  return formatINR(amount).replace("₹", "");
}
