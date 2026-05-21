"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";
import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";
import {
  getBookingsForBarber,
  updateBookingStatusInSupabase,
} from "@/app/lib/bookingsSupabase";
import type { Booking, BookingStatus } from "@/app/lib/bookingStore";
import { requireBarberAuth } from "@/app/portal/_lib/portalAuth";
import { subscribeToBookings } from "@/app/lib/realtime";

function fmtEUR(v: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(v);
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

function pill(subtle = false): React.CSSProperties {
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

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function Page() {
  const auth = requireBarberAuth();

  const user = getAuthUser();
  const barberId = user?.barberId ?? "";

  const [barber, setBarber] = useState<CustomerBarber | null>(null);
  const [all, setAll] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"today" | "upcoming" | "past" | "all">("today");
  const [search, setSearch] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      if (!barberId) {
        setBarber(null);
        setAll([]);
        return;
      }

      const [barberRow, bookings] = await Promise.all([
        getBarberByIdFromSupabase(barberId),
        getBookingsForBarber(barberId),
      ]);

      if (barberRow) {
        setBarber({
          id: barberRow.id,
          name: barberRow.name,
          area: barberRow.area,
          address: barberRow.address,
          distKm: Number(barberRow.dist_km ?? 0),
          rating: Number(barberRow.rating ?? 0),
          reviews: Number(barberRow.reviews ?? 0),
          tagline: barberRow.tagline ?? undefined,
          about: barberRow.about ?? undefined,
          imageUrl: barberRow.image_url ?? undefined,
          speciality: barberRow.speciality ?? undefined,
          active: barberRow.active ?? true,
        });
      } else {
        setBarber(null);
      }

      setAll(bookings);
    } catch (err) {
      console.error("Failed to load barber bookings page:", err);
      setBarber(null);
      setAll([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!auth.ok || !barberId) {
      setLoading(false);
      return;
    }

    loadData();

    const unsubscribe = subscribeToBookings(
      () => {
        loadData();
      },
      `barber_id=eq.${barberId}`
    );

    return unsubscribe;
  }, [auth.ok, barberId]);

  const filtered = useMemo(() => {
    const today = todayKey();
    const q = search.trim().toLowerCase();

    return all
      .filter((b) => {
        const status = (b.status ?? "pending") as BookingStatus;

        if (tab === "today" && b.date !== today) return false;

        if (tab === "upcoming" && !(status === "pending" || status === "confirmed")) {
          return false;
        }

        if (
          tab === "past" &&
          !(status === "completed" || status === "cancelled" || status === "no_show")
        ) {
          return false;
        }

        if (!q) return true;

        return [
          b.userEmail,
          b.serviceName,
          b.date,
          b.time,
          b.paymentMethod,
          status,
          b.aiStyle ?? "",
          b.haircutBrief ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort(
        (a, b) =>
          new Date(`${a.date}T${a.time}:00`).getTime() -
          new Date(`${b.date}T${b.time}:00`).getTime()
      );
  }, [all, tab, search]);

  async function patchStatus(id: string, status: BookingStatus) {
    try {
      await updateBookingStatusInSupabase(id, status);
      await loadData();
    } catch (err) {
      console.error("Failed to update booking status:", err);
      alert("Could not update booking status.");
    }
  }

  if (!auth.ok) {
    return <Denied role="barber" reason={auth.reason} />;
  }

  if (loading) {
    return (
      <WebShell title="Barber Bookings" subtitle="Loading your appointments...">
        <div className="mx-auto max-w-4xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900 }}>Loading bookings...</div>
          </div>
        </div>
      </WebShell>
    );
  }

  if (!barberId || !barber) {
    return (
      <WebShell
        title="Barber Bookings"
        subtitle="Your barber account is not linked to a staff profile yet."
      >
        <div className="mx-auto max-w-4xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Barber profile not linked</div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              Make sure Supabase has a barber row with ID <b>{barberId || "missing"}</b>.
            </div>
          </div>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell
      title="Barber Bookings"
      subtitle={`See only the appointments assigned to ${barber.name}.`}
    >
      <div className="mx-auto max-w-6xl" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/portal/barber" className="btn btn-secondary">
            ← Barber dashboard
          </Link>
          <Link href="/portal/barber/schedule" className="btn btn-secondary">
            Schedule
          </Link>
          <Link href="/portal/barber/earnings" className="btn btn-secondary">
            Earnings
          </Link>
        </div>

        <div className="theme-card" style={{ padding: 16, borderRadius: 20 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <div style={{ minWidth: 260 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Logged-in barber</div>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center" }}>
                {barber.name}
              </div>
            </div>

            <div style={{ flex: "1 1 320px", minWidth: 240 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Search</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, service, date, AI brief..."
                style={inputStyle}
              />
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["today", "upcoming", "past", "all"] as const).map((x) => (
                <button
                  key={x}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 999,
                    border:
                      tab === x
                        ? "1px solid rgba(0,0,0,0.18)"
                        : "1px solid rgba(0,0,0,0.08)",
                    background: tab === x ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)",
                    fontWeight: 900,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  onClick={() => setTab(x)}
                >
                  {x[0].toUpperCase() + x.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="theme-muted" style={{ marginTop: 10, fontSize: 12 }}>
            Barber ID: <b>{barberId}</b> • Total bookings: <b>{all.length}</b>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No bookings found</div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              No appointments match your current filters.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((b) => (
              <div
                key={b.id}
                className="theme-card"
                style={{ padding: 18, borderRadius: 20, display: "grid", gap: 12 }}
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
                    <div style={{ fontWeight: 950, fontSize: 18 }}>{b.serviceName}</div>
                    <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
                      {formatDate(b.date)} • {b.time} • {b.durationMin} min
                    </div>
                    <div className="theme-muted" style={{ marginTop: 4, fontSize: 13 }}>
                      Customer: {b.userEmail}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={pill()}>{statusLabel(b.status)}</span>
                    <span style={pill(true)}>
                      {b.paymentMethod === "online" ? "Online" : "At salon"}
                    </span>
                  </div>
                </div>

                {(b.aiStyle || b.haircutBrief || b.referenceImage) ? (
                  <div className="rounded-[22px] border border-[#ff355d]/20 bg-[#ff355d]/5 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
                      AI Haircut Brief
                    </div>

                    {b.aiStyle ? (
                      <div className="mt-2 text-lg font-black">{b.aiStyle}</div>
                    ) : null}

                    {b.haircutBrief ? (
                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        {b.haircutBrief}
                      </p>
                    ) : null}

                    {b.referenceImage ? (
                      <img
                        src={b.referenceImage}
                        alt="Haircut reference"
                        className="mt-4 h-64 w-full rounded-[22px] object-cover"
                      />
                    ) : null}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  }}
                >
                  <InfoCard title="Booking">
                    <InfoRow
                      label="Reserved slots"
                      value={b.reservedTimes?.length ? b.reservedTimes.join(", ") : b.time}
                    />
                    <InfoRow label="Booking ID" value={b.id.slice(0, 10)} />
                    <InfoRow label="Created" value={new Date(b.createdAt).toLocaleString()} />
                  </InfoCard>

                  <InfoCard title="Money">
                    <InfoRow label="Service final" value={fmtEUR(Number(b.servicePriceEuro) || 0)} />
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