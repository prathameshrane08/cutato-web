"use client";

import type { BookingStatus, Demand } from "@/app/lib/bookingStore";

export function fmtMoney(v: number, currency = "EUR", locale = "de-DE") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(Number(v || 0));
  } catch {
    return `${currency} ${Number(v || 0).toFixed(2)}`;
  }
}

export function formatDate(
  dateStr: string,
  timezone = "Europe/Berlin",
  locale?: string
) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);

  return dt.toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  });
}

export function formatLongDate(
  dateStr: string,
  timezone = "Europe/Berlin",
  locale?: string
) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);

  return dt.toLocaleDateString(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  });
}

export function formatShortDay(
  dateStr: string,
  timezone = "Europe/Berlin",
  locale?: string
) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);

  return dt.toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: timezone,
  });
}

export function statusLabel(s?: BookingStatus) {
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  if (s === "no_show") return "No-show";
  if (s === "confirmed") return "Confirmed";
  return "Pending";
}

export function demandLabel(d: Demand) {
  if (d === "busy") return "Busy";
  if (d === "quiet") return "Quiet";
  return "Normal";
}

export function paymentMethodLabel(method: "online" | "salon") {
  return method === "online" ? "Online" : "At salon";
}

export function statusPillStyle(s?: BookingStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(0,0,0,0.03)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  if (!s || s === "pending") {
    return {
      ...base,
      background: "rgba(255, 193, 7, 0.14)",
      border: "1px solid rgba(255, 193, 7, 0.30)",
    };
  }

  if (s === "confirmed") {
    return {
      ...base,
      background: "rgba(76, 175, 80, 0.14)",
      border: "1px solid rgba(76, 175, 80, 0.26)",
    };
  }

  if (s === "completed") {
    return {
      ...base,
      background: "rgba(0,0,0,0.05)",
      border: "1px solid rgba(0,0,0,0.10)",
    };
  }

  if (s === "cancelled") {
    return {
      ...base,
      background: "rgba(255,59,94,0.10)",
      border: "1px solid rgba(255,59,94,0.22)",
    };
  }

  return {
    ...base,
    background: "rgba(255,59,94,0.10)",
    border: "1px solid rgba(255,59,94,0.22)",
  };
}

export function simpleBadgeStyle(subtle?: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: subtle ? "1px solid rgba(0,0,0,0.10)" : "1px solid rgba(0,0,0,0.14)",
    background: subtle ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.04)",
  };
}