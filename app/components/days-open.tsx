"use client";
import { useEffect, useState } from "react";

/**
 * DaysOpen
 * Calculates whole days between the provided ISO date (date received) and now.
 * Updates automatically at midnight (local) to avoid stale counts without frequent re-renders.
 */
export interface DaysOpenProps {
  startDate?: string | null; // ISO string of date_received (YYYY-MM-DD or full ISO)
  fallback?: number; // Optional precomputed number if startDate missing
  className?: string;
  label?: string; // Override label (default: "days open")
  emptyText?: string; // Text when no start date
}

function diffInDays(start: Date, end: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  // Ignore time component by using UTC midnight conversion
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.floor((endUtc - startUtc) / msPerDay));
}

export function DaysOpen({
  startDate,
  fallback,
  className = "",
  label = "days open",
  emptyText = "—",
}: DaysOpenProps) {
  const [days, setDays] = useState<number | null>(() => {
    if (!startDate) return fallback ?? null;
    const parsed = new Date(startDate);
    if (isNaN(parsed.getTime())) return fallback ?? null;
    return diffInDays(parsed, new Date());
  });

  useEffect(() => {
    if (!startDate) return;
    const parsed = new Date(startDate);
    if (isNaN(parsed.getTime())) return;

    function update() {
      setDays(diffInDays(parsed, new Date()));
    }

    // Calculate ms until next local midnight to schedule first rollover
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      1,
      0 // tiny offset to ensure day boundary passed
    );
    const initialTimeout = nextMidnight.getTime() - now.getTime();
    const timeoutId = window.setTimeout(() => {
      update();
      // After first update, update every 24h
      const intervalId = window.setInterval(update, 1000 * 60 * 60 * 24);
      return () => window.clearInterval(intervalId);
    }, initialTimeout);

    return () => window.clearTimeout(timeoutId);
  }, [startDate]);

  if (days == null) {
    return <span className={className}>{emptyText}</span>;
  }
  return (
    <span
      className={className}
      title={startDate ? `Since ${startDate}` : undefined}
    >
      {days} {label}
    </span>
  );
}
