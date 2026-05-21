"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarbersFromSupabase } from "@/app/lib/barbersSupabase";
import type { Booking, BookingStatus } from "@/app/lib/bookingStore";
import {
  getAllBookingsFromSupabase,
  updateBookingStatusInSupabase,
  updateBookingAssignmentInSupabase,
} from "@/app/lib/bookingsSupabase";
import { readSalonSettings } from "@/app/lib/salonSettingsStore";
import { fmtMoney, statusLabel, statusPillStyle } from "@/app/lib/formatters";
import { requireSalonAuth } from "@/app/portal/_lib/portalAuth";
import { supabase } from "@/app/lib/supabase";
import { subscribeToBookings } from "@/app/lib/realtime";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function SalonBookingsAdminPage() {
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
  const [barbers, setBarbers] = useState<CustomerBarber[]>([]);

  const [all, setAll] = useState<Booking[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "future" | "past">("future");
  
  async function loadAll() {
  try {
    const [bookingRows, barberRows] = await Promise.all([
      getAllBookingsFromSupabase(),
      getBarbersFromSupabase(),
    ]);

    setAll(bookingRows);

    setBarbers(
      barberRows.map((b) => ({
        id: b.id,
        name: b.name,
        area: b.area,
        address: b.address,
        distKm: Number(b.dist_km ?? 0),
        rating: Number(b.rating ?? 0),
        reviews: Number(b.reviews ?? 0),
        tagline: b.tagline ?? undefined,
        about: b.about ?? undefined,
        imageUrl: b.image_url ?? undefined,
        speciality: b.speciality ?? undefined,
        active: b.active ?? true,
      }))
    );
  } catch (err) {
    console.error("Failed to load salon booking data:", err);
    setAll([]);
    setBarbers([]);
  }
}

  useEffect(() => {
  async function loadBookings() {
    try {
      const data = await getAllBookingsFromSupabase();
      setAll(data);
    } catch (err) {
      console.error("Failed to load salon bookings:", err);
      setAll([]);
    }
  }

  loadBookings();

  const unsubscribe = subscribeToBookings(() => {
    loadBookings();
  });

  return unsubscribe;
}, []);

  const counts = useMemo(() => {
    const base = all.map((b) => ({
      ...b,
      status: (b.status ?? "pending") as BookingStatus,
    }));

    const by: Record<string, number> = { all: base.length };
    for (const s of ["pending", "confirmed", "completed", "cancelled", "no_show"] as BookingStatus[]) {
      by[s] = base.filter((b) => b.status === s).length;
    }
    return by;
  }, [all]);

  const visible = useMemo(() => {
    const today = todayKey();
    const query = q.trim().toLowerCase();

    return all
      .map((b) => ({
        ...b,
        status: (b.status ?? "pending") as BookingStatus,
        assignedBarberId: b.assignedBarberId ?? b.barberId,
      }))
      .filter((b) => {
        if (statusFilter !== "all" && b.status !== statusFilter) return false;

        if (dateFilter === "today" && b.date !== today) return false;
        if (dateFilter === "future" && b.date < today) return false;
        if (dateFilter === "past" && b.date >= today) return false;

        if (!query) return true;

        const blob = [
          b.userEmail,
          b.barberName,
          b.serviceName,
          b.date,
          b.time,
          b.paymentMethod,
          b.id,
          b.barberId,
          b.assignedBarberId ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return blob.includes(query);
      })
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  }, [all, q, statusFilter, dateFilter]);

  async function assignBarber(id: string, barberId: string) {
  try {
    const barber = barbers.find((x) => x.id === barberId);

    await updateBookingAssignmentInSupabase(
      id,
      barberId,
      barber?.name ?? "Unknown"
    );

    await loadAll();
  } catch (err) {
    console.error("Failed to assign barber:", err);
  }
}

  async function patchStatus(id: string, status: BookingStatus) {
  try {
    await updateBookingStatusInSupabase(id, status);

    await loadAll();
  } catch (err) {
    console.error("Failed to update booking status:", err);
  }
}

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 999,
    border: active ? "1px solid rgba(0,0,0,0.18)" : "1px solid rgba(0,0,0,0.08)",
    background: active ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <WebShell title="Salon Bookings" subtitle={`Manage bookings for ${salon.salonName}`}>
      <div className="mx-auto max-w-6xl">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/portal/salon" className="btn btn-secondary" style={{ height: 42 }}>
              ← Dashboard
            </Link>
            <Link href="/portal/salon/calendar" className="btn btn-secondary" style={{ height: 42 }}>
              Calendar
            </Link>
            <Link href="/portal/salon/staff" className="btn btn-secondary" style={{ height: 42 }}>
              Staff
            </Link>
            <Link href="/portal/salon/services" className="btn btn-secondary" style={{ height: 42 }}>
              Services
            </Link>
            <Link href="/portal/salon/availability" className="btn btn-secondary" style={{ height: 42 }}>
              Availability
            </Link>
          </div>

          <div className="theme-muted" style={{ fontWeight: 900, alignSelf: "center" }}>
            Total: {counts.all}
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div className="theme-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={chip(statusFilter === "all")} onClick={() => setStatusFilter("all")}>
                All ({counts.all})
              </button>
              <button style={chip(statusFilter === "pending")} onClick={() => setStatusFilter("pending")}>
                Pending ({counts.pending})
              </button>
              <button style={chip(statusFilter === "confirmed")} onClick={() => setStatusFilter("confirmed")}>
                Confirmed ({counts.confirmed})
              </button>
              <button style={chip(statusFilter === "completed")} onClick={() => setStatusFilter("completed")}>
                Completed ({counts.completed})
              </button>
              <button style={chip(statusFilter === "cancelled")} onClick={() => setStatusFilter("cancelled")}>
                Cancelled ({counts.cancelled})
              </button>
              <button style={chip(statusFilter === "no_show")} onClick={() => setStatusFilter("no_show")}>
                No-show ({counts.no_show})
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as "all" | "today" | "future" | "past")}
                className="input"
                style={{ height: 42, borderRadius: 14, padding: "0 12px", minWidth: 140 }}
              >
                <option value="future">Future</option>
                <option value="today">Today</option>
                <option value="past">Past</option>
                <option value="all">All dates</option>
              </select>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search customer, barber, service, date, time…"
                className="input"
                style={{ height: 42, borderRadius: 14, padding: "0 14px", minWidth: 260 }}
              />
            </div>
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div className="theme-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Bookings</div>
          <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
            {visible.length} result(s)
          </div>

          <div style={{ height: 12 }} />

          {visible.length === 0 ? (
            <div className="theme-muted" style={{ padding: 12 }}>
              No bookings match your filters.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {visible.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.02)",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>
                        {b.date} • {b.time} • {b.serviceName}
                      </div>
                      <div className="theme-muted" style={{ marginTop: 4, fontSize: 13 }}>
                        Customer: <b>{b.userEmail}</b> • Payment:{" "}
                        {b.paymentMethod === "online" ? "Online" : "At salon"}
                      </div>
                      <div className="theme-muted" style={{ marginTop: 4, fontSize: 12 }}>
                        ID: {b.id} • Reserved: {b.reservedTimes?.length ? b.reservedTimes.join(", ") : b.time}
                      </div>
                    </div>

                    <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                      <span style={statusPillStyle(b.status)}>{statusLabel(b.status)}</span>
                      <div style={{ fontWeight: 950 }}>
                        {fmtMoney(Number(b.totalEuro) || 0, salon.currency)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(255,255,255,0.6)",
                        padding: 12,
                      }}
                    >
                      <div className="theme-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                        Assign barber
                      </div>
                      <div style={{ height: 8 }} />
                      <select
                        className="input"
                        style={{ height: 42, borderRadius: 14, padding: "0 12px", width: "100%" }}
                        value={b.assignedBarberId ?? b.barberId}
                        onChange={(e) => assignBarber(b.id, e.target.value)}
                      >
                        {barbers.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      style={{
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(255,255,255,0.6)",
                        padding: 12,
                      }}
                    >
                      <div className="theme-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                        Status
                      </div>
                      <div style={{ height: 8 }} />
                      <select
                        className="input"
                        style={{ height: 42, borderRadius: 14, padding: "0 12px", width: "100%" }}
                        value={b.status}
                        onChange={(e) => patchStatus(b.id, e.target.value as BookingStatus)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No-show</option>
                      </select>
                    </div>

                    <div
                      style={{
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(255,255,255,0.6)",
                        padding: 12,
                        display: "grid",
                        gap: 10,
                        alignContent: "start",
                      }}
                    >
                      <div className="theme-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                        Quick actions
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="btn btn-secondary" onClick={() => patchStatus(b.id, "confirmed")}>
                          Confirm
                        </button>
                        <button className="btn btn-secondary" onClick={() => patchStatus(b.id, "completed")}>
                          Complete
                        </button>
                        <button className="btn btn-secondary" onClick={() => patchStatus(b.id, "no_show")}>
                          No-show
                        </button>
                        <button className="btn btn-secondary" onClick={() => patchStatus(b.id, "cancelled")}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div className="theme-muted" style={{ fontSize: 12 }}>
                      Current barber: <b>{b.barberName}</b> ({b.barberId})
                    </div>
                    <div className="theme-muted" style={{ fontSize: 12 }}>
                      Base: {fmtMoney(Number(b.basePriceEuro) || 0, salon.currency)} • Tip:{" "}
                      {fmtMoney(Number(b.tipEuro) || 0, salon.currency)} • Total:{" "}
                      <b>{fmtMoney(Number(b.totalEuro) || 0, salon.currency)}</b>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 16 }} />
      </div>
    </WebShell>
  );
}