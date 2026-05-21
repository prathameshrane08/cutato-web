"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { useCustomerBarbers } from "@/app/lib/barbersStore";
import { readSalonSettings } from "@/app/lib/salonSettingsStore";
import {
  readBookings,
  type Booking,
  type BookingStatus,
} from "@/app/lib/bookingStore";
import {
  fmtMoney,
  formatDate,
  simpleBadgeStyle,
  statusLabel,
} from "@/app/lib/formatters";
import { requireSalonAuth } from "@/app/portal/_lib/portalAuth";
import { subscribeStoreUpdates } from "@/app/lib/storeEvents";

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function dayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prettyShortDate(dateStr: string, timezone: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: timezone || "Europe/Berlin",
  });
}

function hmToMin(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function minToHm(v: number) {
  const h = Math.floor(v / 60);
  const m = v % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildTimeline(start = "09:00", end = "20:00", step = 30) {
  const arr: string[] = [];
  let cur = hmToMin(start);
  const stop = hmToMin(end);
  while (cur <= stop) {
    arr.push(minToHm(cur));
    cur += step;
  }
  return arr;
}

function bookingStateColor(status?: BookingStatus) {
  if (status === "completed") return "rgba(0,0,0,0.05)";
  if (status === "cancelled") return "rgba(255,59,94,0.10)";
  if (status === "no_show") return "rgba(255,59,94,0.10)";
  if (status === "confirmed") return "rgba(76,175,80,0.12)";
  return "rgba(255,193,7,0.14)";
}

function bookingBorderColor(status?: BookingStatus) {
  if (status === "completed") return "1px solid rgba(0,0,0,0.10)";
  if (status === "cancelled") return "1px solid rgba(255,59,94,0.22)";
  if (status === "no_show") return "1px solid rgba(255,59,94,0.22)";
  if (status === "confirmed") return "1px solid rgba(76,175,80,0.26)";
  return "1px solid rgba(255,193,7,0.30)";
}

export default function SalonCalendarPage() {
  const auth = requireSalonAuth();

  if (!auth.ok) {
    return (
      <WebShell title="Access denied" subtitle="You do not have permission to open this page.">
        <div className="mx-auto max-w-4xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {auth.reason === "not_logged_in" ? "Please log in" : "Wrong account type"}
            </div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              This page is only available for salon accounts.
            </div>
          </div>
        </div>
      </WebShell>
    );
  }

  const salon = useMemo(() => readSalonSettings(), []);
  const { barbers } = useCustomerBarbers();

  const today = dayKey(new Date());
  const tomorrow = dayKey(addDays(new Date(), 1));
  const afterTomorrow = dayKey(addDays(new Date(), 2));

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [barberFilter, setBarberFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const load = () => setAllBookings(readBookings());
    load();
    const unsub = subscribeStoreUpdates(() => load());
    return unsub;
  }, []);

  const timeline = useMemo(() => buildTimeline("09:00", "20:00", 30), []);

  const filteredBookings = useMemo(() => {
    let arr = allBookings.filter((b) => b.date === selectedDate);

    if (barberFilter !== "all") {
      arr = arr.filter((b) => b.barberId === barberFilter);
    }

    if (statusFilter !== "all") {
      arr = arr.filter((b) => (b.status ?? "pending") === statusFilter);
    }

    arr.sort((a, b) => a.time.localeCompare(b.time));
    return arr;
  }, [allBookings, selectedDate, barberFilter, statusFilter]);

  const bookingsByBarber = useMemo(() => {
    const map = new Map<string, Booking[]>();

    const activeBarbers =
      barberFilter === "all"
        ? barbers.filter((b) => b.active !== false)
        : barbers.filter((b) => b.id === barberFilter);

    for (const b of activeBarbers) {
      map.set(b.id, []);
    }

    for (const booking of filteredBookings) {
      if (!map.has(booking.barberId)) {
        map.set(booking.barberId, []);
      }
      map.get(booking.barberId)!.push(booking);
    }

    return map;
  }, [filteredBookings, barbers, barberFilter]);

  const visibleBarbers = useMemo(() => {
    const source =
      barberFilter === "all"
        ? barbers.filter((b) => b.active !== false)
        : barbers.filter((b) => b.id === barberFilter);

    return source.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [barbers, barberFilter]);

  const dayRevenue = useMemo(() => {
    return filteredBookings
      .filter((b) => b.status !== "cancelled" && b.status !== "no_show")
      .reduce((sum, b) => sum + Number(b.totalEuro || 0), 0);
  }, [filteredBookings]);

  const openCount = useMemo(() => {
    return filteredBookings.filter((b) => b.status === "pending" || b.status === "confirmed").length;
  }, [filteredBookings]);

  const completedCount = useMemo(() => {
    return filteredBookings.filter((b) => b.status === "completed").length;
  }, [filteredBookings]);

  const cancelledCount = useMemo(() => {
    return filteredBookings.filter((b) => b.status === "cancelled" || b.status === "no_show").length;
  }, [filteredBookings]);

  return (
    <WebShell title="Salon Calendar" subtitle={`Visual day view for bookings at ${salon.salonName}`}>
      <div className="mx-auto max-w-7xl" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/portal/salon" className="btn btn-secondary">
            ← Salon dashboard
          </Link>
          <Link href="/portal/salon/bookings" className="btn btn-secondary">
            Bookings
          </Link>
          <Link href="/portal/salon/staff" className="btn btn-secondary">
            Staff
          </Link>
          <Link href="/portal/salon/availability" className="btn btn-secondary">
            Availability
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <StatCard label="Open bookings" value={String(openCount)} />
          <StatCard label="Completed" value={String(completedCount)} />
          <StatCard label="Cancelled / no-show" value={String(cancelledCount)} />
          <StatCard label="Day revenue" value={fmtMoney(dayRevenue, salon.currency)} />
        </div>

        <div className="theme-card" style={{ padding: 16, borderRadius: 20 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "end",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Date</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <DateChip
                  active={selectedDate === today}
                  label={`Today • ${prettyShortDate(today, salon.timezone)}`}
                  onClick={() => setSelectedDate(today)}
                />
                <DateChip
                  active={selectedDate === tomorrow}
                  label={`Tomorrow • ${prettyShortDate(tomorrow, salon.timezone)}`}
                  onClick={() => setSelectedDate(tomorrow)}
                />
                <DateChip
                  active={selectedDate === afterTomorrow}
                  label={prettyShortDate(afterTomorrow, salon.timezone)}
                  onClick={() => setSelectedDate(afterTomorrow)}
                />
              </div>
            </div>

            <div style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Barber</div>
              <select
                value={barberFilter}
                onChange={(e) => setBarberFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="all">All barbers</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Status</div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | BookingStatus)}
                style={inputStyle}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No-show</option>
              </select>
            </div>
          </div>

          <div className="theme-muted" style={{ marginTop: 10, fontSize: 12 }}>
            Viewing <b>{formatDate(selectedDate, salon.timezone)}</b> • {filteredBookings.length} booking(s)
          </div>
        </div>

        {visibleBarbers.length === 0 ? (
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No barbers found</div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              Add staff first to use the salon calendar.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {visibleBarbers.map((barber) => {
              const barberBookings = bookingsByBarber.get(barber.id) ?? [];

              return (
                <div key={barber.id} className="theme-card" style={{ padding: 16, borderRadius: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 950, fontSize: 18 }}>{barber.name}</div>
                      <div className="theme-muted" style={{ marginTop: 4, fontSize: 13 }}>
                        ID: {barber.id} • {barber.area || "—"} • {barber.active === false ? "Hidden" : "Active"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={simpleBadgeStyle()}>
                        {barberBookings.length} booking(s)
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(0,0,0,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    {timeline.map((time) => {
                      const booking = barberBookings.find((b) => b.time === time);

                      return (
                        <div
                          key={`${barber.id}_${time}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "110px 1fr",
                            borderTop: "1px solid rgba(0,0,0,0.06)",
                            minHeight: 64,
                            background: booking ? bookingStateColor(booking.status) : "transparent",
                          }}
                        >
                          <div
                            style={{
                              padding: "12px 14px",
                              fontWeight: 900,
                              fontSize: 13,
                              borderRight: "1px solid rgba(0,0,0,0.06)",
                              background: "rgba(0,0,0,0.02)",
                            }}
                          >
                            {time}
                          </div>

                          <div style={{ padding: 10 }}>
                            {booking ? (
                              <Link
                                href={`/portal/salon/bookings?booking=${encodeURIComponent(booking.id)}`}
                                style={{ textDecoration: "none", color: "inherit" }}
                              >
                                <div
                                  style={{
                                    borderRadius: 14,
                                    border: bookingBorderColor(booking.status),
                                    background: "rgba(255,255,255,0.35)",
                                    padding: 10,
                                    display: "grid",
                                    gap: 8,
                                    cursor: "pointer",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 10,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 950 }}>{booking.serviceName}</div>
                                      <div className="theme-muted" style={{ fontSize: 13, marginTop: 4 }}>
                                        Customer: {booking.userEmail}
                                      </div>
                                    </div>

                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                      <span style={simpleBadgeStyle()}>{statusLabel(booking.status)}</span>
                                      <span style={simpleBadgeStyle(true)}>
                                        {booking.paymentMethod === "online" ? "Online" : "At salon"}
                                      </span>
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 10,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <div className="theme-muted" style={{ fontSize: 12 }}>
                                      Duration: {booking.durationMin} min • Reserved:{" "}
                                      {booking.reservedTimes?.length ? booking.reservedTimes.join(", ") : booking.time}
                                    </div>
                                    <div style={{ fontWeight: 900, fontSize: 13 }}>
                                      {fmtMoney(Number(booking.totalEuro || 0))}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ) : (
                              <div className="theme-muted" style={{ fontSize: 13, paddingTop: 6 }}>
                                —
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WebShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-card" style={{ padding: 16, borderRadius: 20 }}>
      <div className="theme-muted" style={{ fontSize: 13, fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ marginTop: 8, fontWeight: 950, fontSize: 24 }}>{value}</div>
    </div>
  );
}

function DateChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 999,
        border: active ? "1px solid rgba(0,0,0,0.18)" : "1px solid rgba(0,0,0,0.08)",
        background: active ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)",
        fontWeight: 900,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
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