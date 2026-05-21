"use client";

/**
 * Returns YYYY-MM-DD for a Date
 */
export function dayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns today's key YYYY-MM-DD
 */
export function todayKey() {
  return dayKey(new Date());
}

/**
 * Add days to date
 */
export function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Returns YYYY-MM prefix for current month
 */
export function monthPrefix() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");

  return `${yyyy}-${mm}`;
}

/**
 * Monday of current week (YYYY-MM-DD)
 */
export function weekStartKey() {
  const now = new Date();
  const day = now.getDay();

  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);

  return dayKey(monday);
}

/**
 * Tomorrow key
 */
export function tomorrowKey() {
  return dayKey(addDays(new Date(), 1));
}

/**
 * Check if date is today
 */
export function isToday(date: string) {
  return date === todayKey();
}

/**
 * Compare booking date+time
 */
export function bookingTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00`).getTime();
}