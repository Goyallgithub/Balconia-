export const season = {
  diwali: {
    enabled: true,
    start: "2026-10-01",
    end: "2026-11-12",
    /** Diwali 2026 is 8 November — confirm before launch */
    date: "2026-11-08",
  },
} as const;

export function isDiwaliActive(now: Date = new Date()): boolean {
  const { enabled, start, end } = season.diwali;
  if (!enabled) return false;
  const t = now.getTime();
  const startMs = new Date(`${start}T00:00:00+05:30`).getTime();
  const endMs = new Date(`${end}T23:59:59+05:30`).getTime();
  return t >= startMs && t <= endMs;
}

export function getDiwaliDate(): Date {
  return new Date(`${season.diwali.date}T00:00:00+05:30`);
}
