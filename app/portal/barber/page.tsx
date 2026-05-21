"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";
import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";
import { readSalonSettings } from "@/app/lib/salonSettingsStore";
import type { Booking } from "@/app/lib/bookingStore";
import { getBookingsForBarber } from "@/app/lib/bookingsSupabase";
import { fmtMoney, statusLabel, statusPillStyle } from "@/app/lib/formatters";
import { requireBarberAuth } from "@/app/portal/_lib/portalAuth";

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function shortDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
  });
}

export default function BarberPortalPage() {
  const auth = requireBarberAuth();

  const user = getAuthUser();
  const barberId = user?.barberId ?? "";

  const [tick, setTick] = useState(0);
  const [barber, setBarber] = useState<CustomerBarber | null>(null);
  const [barberLoading, setBarberLoading] = useState(true);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);


  useEffect(() => {
    async function loadBarber() {
      try {
        setBarberLoading(true);

        if (!barberId) {
          setBarber(null);
          return;
        }

        const b = await getBarberByIdFromSupabase(barberId);

        if (!b) {
          setBarber(null);
          return;
        }

        setBarber({
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
        });
      } catch (err) {
        console.error("Failed to load barber profile:", err);
        setBarber(null);
      } finally {
        setBarberLoading(false);
      }
    }

    loadBarber();
  }, [barberId]);

  useEffect(() => {
  async function loadBookings() {
    try {
      if (!barberId) {
        setAllBookings([]);
        return;
      }

      const data = await getBookingsForBarber(barberId);
      setAllBookings(data);
    } catch (err) {
      console.error("Failed to load barber bookings:", err);
      setAllBookings([]);
    }
  }

  loadBookings();
}, [barberId, tick]);

  const salon = useMemo(() => readSalonSettings(), [tick]);
  const today = dayKey(new Date());

  const todayBookings = useMemo(
    () =>
      allBookings
        .filter((b) => b.date === today)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [allBookings, today]
  );

  const upcomingBookings = useMemo(
    () =>
      allBookings
        .filter((b) => {
          const s = b.status ?? "pending";
          return b.date >= today && s !== "completed" && s !== "cancelled" && s !== "no_show";
        })
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
        .slice(0, 6),
    [allBookings, today]
  );

  const completedRevenue = useMemo(
    () =>
      allBookings
        .filter((b) => b.status === "completed")
        .reduce((sum, b) => sum + Number(b.totalEuro || 0), 0),
    [allBookings]
  );

  const todayRevenue = useMemo(
    () =>
      todayBookings
        .filter((b) => {
          const s = b.status ?? "pending";
          return s !== "cancelled" && s !== "no_show";
        })
        .reduce((sum, b) => sum + Number(b.totalEuro || 0), 0),
    [todayBookings]
  );

  const openCount = useMemo(
    () =>
      allBookings.filter((b) => {
        const s = b.status ?? "pending";
        return s === "pending" || s === "confirmed";
      }).length,
    [allBookings]
  );

  const completedCount = useMemo(
    () => allBookings.filter((b) => b.status === "completed").length,
    [allBookings]
  );

  const onlineRevenue = useMemo(
    () =>
      allBookings
        .filter((b) => b.paymentMethod === "online" && b.status !== "cancelled" && b.status !== "no_show")
        .reduce((sum, b) => sum + Number(b.totalEuro || 0), 0),
    [allBookings]
  );

  const salonRevenue = useMemo(
    () =>
      allBookings
        .filter((b) => b.paymentMethod === "salon" && b.status !== "cancelled" && b.status !== "no_show")
        .reduce((sum, b) => sum + Number(b.totalEuro || 0), 0),
    [allBookings]
  );

  const statusBreakdown = useMemo(() => {
    const counts = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };

    for (const b of allBookings) {
      const s = (b.status ?? "pending") as keyof typeof counts;
      counts[s] += 1;
    }

    return counts;
  }, [allBookings]);

  const weekData = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const date = dayKey(addDays(new Date(), i - 6));
      const bookings = allBookings.filter((b) => b.date === date);
      const count = bookings.length;
      const revenue = bookings
        .filter((b) => {
          const s = b.status ?? "pending";
          return s !== "cancelled" && s !== "no_show";
        })
        .reduce((sum, b) => sum + Number(b.totalEuro || 0), 0);

      return { date, count, revenue };
    });

    const maxCount = Math.max(1, ...days.map((d) => d.count));
    return { days, maxCount };
  }, [allBookings]);

  if (!auth.ok) {
    return (
      <WebShell title="Access denied" subtitle="You do not have permission to open this page.">
        <div className="mx-auto max-w-4xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {auth.reason === "not_logged_in" ? "Please log in" : "Wrong account type"}
            </div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              This page is only available for barber accounts.
            </div>
          </div>
        </div>
      </WebShell>
    );
  }

  if (barberLoading) {
    return (
      <WebShell title="Barber Portal" subtitle="Loading your profile...">
        <div className="mx-auto max-w-4xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900 }}>Loading barber profile...</div>
          </div>
        </div>
      </WebShell>
    );
  }

  if (!barberId || !barber) {
    return (
      <WebShell title="Barber Portal" subtitle="Your barber account is not linked to a staff profile yet.">
        <div className="mx-auto max-w-4xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Barber profile not linked</div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              Make sure your Supabase barber row has id <b>{barberId || "missing"}</b>.
            </div>
          </div>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell title="Barber Dashboard" subtitle={`Welcome back, ${barber.name}.`}>
      <div className="mx-auto max-w-6xl" style={{ display: "grid", gap: 16 }}>
        <section
          style={{
            borderRadius: 26,
            padding: 22,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0.01))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 950 }}>{barber.name}</div>
              <div className="theme-muted" style={{ marginTop: 6 }}>
                ⭐ {Number(barber.rating ?? 0).toFixed(1)} • {barber.reviews ?? 0} reviews •{" "}
                {Number(barber.distKm ?? 0).toFixed(1)} km • {barber.area}
              </div>
              <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
                {barber.address}
              </div>
              {barber.speciality ? (
                <div style={{ marginTop: 8, fontWeight: 800 }}>{barber.speciality}</div>
              ) : null}
              {barber.tagline ? (
                <div style={{ marginTop: 8, fontWeight: 800 }}>{barber.tagline}</div>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 10, minWidth: 240 }}>
              <QuickCard label="Salon" value={salon.salonName} sub={salon.address} />
              <QuickCard label="Barber ID" value={barberId} sub="Login identity" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <Link href="/portal/barber/bookings" className="btn btn-primary">
              My bookings
            </Link>
            <Link href="/portal/barber/schedule" className="btn btn-secondary">
              Schedule
            </Link>
            <Link href="/portal/barber/availability" className="btn btn-secondary">
              Availability
            </Link>
            <Link href="/portal/barber/earnings" className="btn btn-secondary">
              Earnings
            </Link>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          }}
        >
          <StatCard label="Today’s bookings" value={String(todayBookings.length)} sub={today} />
          <StatCard label="Today’s revenue" value={fmtMoney(todayRevenue, salon.currency)} sub="Non-cancelled" />
          <StatCard label="Open bookings" value={String(openCount)} sub="Pending + confirmed" />
          <StatCard label="Completed" value={String(completedCount)} sub="Finished appointments" />
          <StatCard label="Completed revenue" value={fmtMoney(completedRevenue, salon.currency)} sub="All time" />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 theme-card" style={{ padding: 18, borderRadius: 24 }}>
            <SectionTitle
              title="7-day activity"
              subtitle="A quick view of bookings and momentum over the last week."
            />

            <div style={{ height: 14 }} />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gap: 12,
                alignItems: "end",
                minHeight: 200,
              }}
            >
              {weekData.days.map((d) => {
                const h = `${Math.max(10, Math.round((d.count / weekData.maxCount) * 140))}px`;

                return (
                  <div key={d.date} style={{ display: "grid", gap: 8, justifyItems: "center" }}>
                    <div
                      title={`${d.count} bookings • ${fmtMoney(d.revenue, salon.currency)}`}
                      style={{
                        width: "100%",
                        maxWidth: 56,
                        height: h,
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "linear-gradient(180deg, rgba(0,0,0,0.20), rgba(0,0,0,0.05))",
                      }}
                    />
                    <div style={{ fontWeight: 900, fontSize: 12 }}>{d.count}</div>
                    <div className="theme-muted" style={{ fontSize: 12 }}>
                      {shortDay(d.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="theme-card" style={{ padding: 18, borderRadius: 24, height: "fit-content" }}>
            <SectionTitle title="Payment split" subtitle="How customers are paying." />
            <div style={{ height: 14 }} />

            <SplitRow label="Online" value={fmtMoney(onlineRevenue, salon.currency)} />
            <SplitRow label="At salon" value={fmtMoney(salonRevenue, salon.currency)} />

            <div className="divider" style={{ margin: "14px 0" }} />

            <SectionTitle title="Status breakdown" subtitle="Current booking mix." />
            <div style={{ height: 12 }} />

            <StatusRow label="Pending" value={statusBreakdown.pending} />
            <StatusRow label="Confirmed" value={statusBreakdown.confirmed} />
            <StatusRow label="Completed" value={statusBreakdown.completed} />
            <StatusRow label="Cancelled" value={statusBreakdown.cancelled} />
            <StatusRow label="No-show" value={statusBreakdown.no_show} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 theme-card" style={{ padding: 18, borderRadius: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <SectionTitle
                title="Today’s schedule"
                subtitle={`${todayBookings.length} booking(s) scheduled today.`}
              />
              <Link href="/portal/barber/schedule" className="link" style={{ fontWeight: 900 }}>
                Open full schedule →
              </Link>
            </div>

            <div style={{ height: 12 }} />

            {todayBookings.length === 0 ? (
              <div className="theme-muted" style={{ padding: 12 }}>
                No bookings today yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {todayBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} currency={salon.currency} />
                ))}
              </div>
            )}
          </div>

          <div className="theme-card" style={{ padding: 18, borderRadius: 24, height: "fit-content" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <SectionTitle title="Next appointments" subtitle="Your next 6 upcoming bookings." />
              <Link href="/portal/barber/bookings" className="link" style={{ fontWeight: 900 }}>
                Open all →
              </Link>
            </div>

            <div style={{ height: 12 }} />

            {upcomingBookings.length === 0 ? (
              <div className="theme-muted">No upcoming bookings yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {upcomingBookings.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 950 }}>
                        {formatDate(b.date)} • {b.time}
                      </div>
                      <span style={statusPillStyle(b.status)}>{statusLabel(b.status)}</span>
                    </div>
                    <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
                      {b.serviceName}
                    </div>
                    <div className="theme-muted" style={{ marginTop: 4, fontSize: 12 }}>
                      {b.userEmail}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="divider" style={{ margin: "14px 0" }} />

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/portal/barber/bookings" className="btn btn-primary" style={{ width: "100%" }}>
                Open bookings
              </Link>
              <Link href="/portal/barber/schedule" className="btn btn-secondary" style={{ width: "100%" }}>
                Open schedule
              </Link>
              <Link href="/portal/barber/availability" className="btn btn-secondary" style={{ width: "100%" }}>
                Edit availability
              </Link>
              <Link href="/portal/barber/earnings" className="btn btn-secondary" style={{ width: "100%" }}>
                View earnings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </WebShell>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div style={{ fontWeight: 950, fontSize: 16 }}>{title}</div>
      <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
        {subtitle}
      </div>
    </div>
  );
}

function QuickCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <div className="theme-muted" style={{ fontSize: 12, fontWeight: 900 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontWeight: 900, fontSize: 18 }}>{value}</div>
      <div className="theme-muted" style={{ marginTop: 4, fontSize: 12 }}>{sub}</div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      className="theme-card"
      style={{
        padding: 16,
        borderRadius: 22,
        border: "1px solid rgba(0,0,0,0.06)",
        background: "rgba(0,0,0,0.02)",
      }}
    >
      <div className="theme-muted" style={{ fontWeight: 900, fontSize: 13 }}>
        {label}
      </div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 950 }}>{value}</div>
      <div className="theme-muted" style={{ marginTop: 8, fontSize: 12 }}>{sub}</div>
    </div>
  );
}

function SplitRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
      <div className="theme-muted" style={{ fontSize: 13, fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
      <div className="theme-muted" style={{ fontSize: 13, fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function BookingCard({ booking, currency }: { booking: Booking; currency: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 18,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(0,0,0,0.02)",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 950 }}>
            {booking.time} • {booking.serviceName}
          </div>
          <div className="theme-muted" style={{ marginTop: 4, fontSize: 13 }}>
            Customer: {booking.userEmail}
          </div>
        </div>

        <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
          <span style={statusPillStyle(booking.status)}>{statusLabel(booking.status)}</span>
          <div style={{ fontWeight: 950 }}>
            {fmtMoney(Number(booking.totalEuro) || 0, currency)}
          </div>
        </div>
      </div>

      <div className="theme-muted" style={{ fontSize: 12 }}>
        Duration: {booking.durationMin} min • Reserved:{" "}
        {booking.reservedTimes?.length ? booking.reservedTimes.join(", ") : booking.time}
      </div>
    </div>
  );
}