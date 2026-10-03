"use client";

import { useEffect, useState } from "react";

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

function partsUntil(target: Date, now: Date): CountdownParts {
  const diff = Math.max(0, target.getTime() - now.getTime());
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    done: diff <= 0,
  };
}

export function useCountdown(target: Date | null): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>(() =>
    target ? partsUntil(target, new Date()) : { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  );

  useEffect(() => {
    if (!target) return;
    const tick = () => setParts(partsUntil(target, new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return parts;
}
