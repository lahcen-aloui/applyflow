"use client";
import { useEffect, useState } from "react";
// Reschedule local midnight using calendar arithmetic so daylight saving is respected.
export function useLocalDay(): Date | null {
  const [day, setDay] = useState<Date | null>(null);
  useEffect(() => {
    let timer: number;
    const refresh = () => {
      const now = new Date();
      setDay(now);
      window.clearTimeout(timer);
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(refresh, midnight.getTime() - now.getTime());
    };
    const first = window.setTimeout(refresh, 0);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearTimeout(first); window.clearTimeout(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return day;
}
