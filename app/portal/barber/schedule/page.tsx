"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";
import { useCustomerBarbers } from "@/app/lib/barbersStore";
import {
  readBookings,
  writeBookings,
  type Booking,
  type BookingStatus,
} from "@/app/lib/bookingStore";
import { requireBarberAuth } from "@/app/portal/_lib/portalAuth";
import { subscribeStoreUpdates } from "@/app/lib/storeEvents";

function fmtEUR(v: number) {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(v);
  } catch {
    return `€${v.toFixed(2)}`;
  }
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(s?: BookingStatus) {
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";
  if (s === "no_show") return "No-show";
  if (s === "confirmed") return "Confirmed";
  return "Pending";
}

function badge(subtle = false): React.CSSProperties {
  return {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: subtle
      ? "1px solid rgba(0,0,0,0.10)"
      : "1px solid rgba(0,0,0,0.14)",
    background: subtle ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.04)",
  };
}

export default function Page() {
  const auth = requireBarberAuth();
  if (!auth.ok) return <Denied role="barber" reason={auth.reason} />;

  const { byId } = useCustomerBarbers();
  const barberId = getAuthUser()?.barberId ?? "";
  const barber = barberId ? byId.get(barberId) ?? null : null;

  const [all, setAll] = useState<Booking[]>([]);
  const [dayFilter, setDayFilter] = useState<"today" | "tomorrow" | "all">("today");

  const today = dayKey(new Date());
  const tomorrow = dayKey(addDays(new Date(), 1));

  useEffect(() => {
    const load = () => {
      const next = barberId
        ? readBookings()
            .filter((b: Booking) => b.barberId === barberId)
            .sort(
              (a: Booking, b: Booking) =>
                new Date(`${a.date}T${a.time}:00`).getTime() -
                new Date(`${b.date}T${b.time}:00`).getTime()
            )
        : [];
      setAll(next);
    };

    load();
    const unsub = subscribeStoreUpdates(() => load());
    return unsub;
  }, [barberId]);

  const filtered = useMemo(() => {
    if (dayFilter === "today") return all.filter((b: Booking) => b.date === today);
    if (dayFilter === "tomorrow") return all.filter((b: Booking) => b.date === tomorrow);
    return all;
  }, [all, dayFilter, today, tomorrow]);

  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>();

    filtered.forEach((b: Booking) => {
      if (!map.has(b.date)) map.set(b.date, []);
      map.get(b.date)!.push(b);
    });

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  function patchStatus(id: string, status: BookingStatus) {
    const next = readBookings().map((b: Booking) => (b.id === id ? { ...b, status } : b));
    writeBookings(next);
  }

  if (!barberId || !barber) {
    return (
      <WebShell
        title="Barber Schedule"
        subtitle="Your barber account is not linked to a staff profile yet."
      >
        <div className="mx-auto max-w-4xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Barber profile not linked</div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              Ask the salon owner to create your staff profile first, then log in with your barber ID email.
            </div>
          </div>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell title="Barber Schedule" subtitle={`See your appointments for ${barber.name}.`}>
      <div className="mx-auto max-w-6xl" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/portal/barber" className="btn btn-secondary">
            ← Barber dashboard
          </Link>
          <Link href="/portal/barber/bookings" className="btn btn-secondary">
            Bookings
          </Link>
          <Link href="/portal/barber/earnings" className="btn btn-secondary">
            Earnings
          </Link>
        </div>

        <div className="theme-card" style={{ padding: 16, borderRadius: 20 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <div style={{ minWidth: 260 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Logged-in barber</div>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center" }}>{barber.name}</div>
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["today", "tomorrow", "all"] as const).map((x) => (
                <button
                  key={x}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    border:
                      dayFilter === x
                        ? "1px solid rgba(0,0,0,0.18)"
                        : "1px solid rgba(0,0,0,0.08)",
                    background: dayFilter === x ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)",
                    fontWeight: 900,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  onClick={() => setDayFilter(x)}
                >
                  {x[0].toUpperCase() + x.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="theme-muted" style={{ marginTop: 10, fontSize: 12 }}>
            Barber ID: <b>{barberId}</b>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No schedule items found</div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              No appointments match the selected day filter.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {grouped.map(([date, dayBookings]) => (
              <div key={date} className="theme-card" style={{ padding: 18, borderRadius: 20 }}>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{formatDate(date)}</div>
                <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
                  {dayBookings.length} appointment(s)
                </div>

                <div style={{ height: 12 }} />

                {dayBookings.map((b: Booking) => (
                  <div
                    key={b.id}
                    style={{
                      display: "grid",
                      gap: 10,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(0,0,0,0.02)",
                      borderRadius: 18,
                      padding: 14,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 950, fontSize: 17 }}>
                          {b.time} • {b.serviceName}
                        </div>
                        <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
                          Customer: {b.userEmail}
                        </div>
                        <div className="theme-muted" style={{ marginTop: 4, fontSize: 13 }}>
                          Duration: {b.durationMin} min • Reserved:{" "}
                          {b.reservedTimes?.length ? b.reservedTimes.join(", ") : b.time}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={badge()}>{statusLabel(b.status)}</span>
                        <span style={badge(true)}>
                          {b.paymentMethod === "online" ? "Online" : "At salon"}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      }}
                    >
                      <InfoCard title="Money">
                        <InfoRow label="Service" value={fmtEUR(Number(b.servicePriceEuro) || 0)} />
                        <InfoRow label="Tip" value={fmtEUR(Number(b.tipEuro) || 0)} />
                        <InfoRow label="Total" value={fmtEUR(Number(b.totalEuro) || 0)} strong />
                      </InfoCard>

                      <InfoCard title="Actions">
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {(["pending", "confirmed", "completed", "no_show", "cancelled"] as const).map(
                            (s) => (
                              <button
                                key={s}
                                className="btn btn-secondary"
                                onClick={() => patchStatus(b.id, s)}
                              >
                                {s === "no_show" ? "No-show" : s[0].toUpperCase() + s.slice(1)}
                              </button>
                            )
                          )}
                        </div>
                      </InfoCard>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </WebShell>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(0,0,0,0.02)",
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div className="theme-muted" style={{ fontSize: 13, fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: strong ? 950 : 800, textAlign: "right" }}>
        {value}
      </div>
    </div>
  );
}

function Denied({ role, reason }: { role: string; reason: string | null }) {
  return (
    <WebShell title="Access denied" subtitle="You do not have permission to open this page.">
      <div className="mx-auto max-w-4xl">
        <div className="theme-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            {reason === "not_logged_in" ? "Please log in" : "Wrong account type"}
          </div>
          <div className="theme-muted" style={{ marginTop: 8 }}>
            This page is only available for {role} accounts.
          </div>
        </div>
      </div>
    </WebShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "rgba(0,0,0,0.02)",
  outline: "none",
  fontWeight: 800,
};