"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";
import { useCustomerBarbers } from "@/app/lib/barbersStore";
import { readBookings, type Booking } from "@/app/lib/bookingStore";
import { fmtMoney, formatDate, statusLabel } from "@/app/lib/formatters";
import { requireBarberAuth } from "@/app/portal/_lib/portalAuth";
import { subscribeStoreUpdates } from "@/app/lib/storeEvents";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function weekStartKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);

  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(
    monday.getDate()
  ).padStart(2, "0")}`;
}

function weekEndKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);

  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(
    sunday.getDate()
  ).padStart(2, "0")}`;
}

function sum(list: Booking[], field: keyof Booking) {
  return list.reduce((total, item) => total + Number(item[field] || 0), 0);
}

export default function Page() {
  const auth = requireBarberAuth();

  if (!auth.ok) {
    return <Denied role="barber" reason={auth.reason} />;
  }

  const barberId = getAuthUser()?.barberId ?? "";
  const { byId } = useCustomerBarbers();
  const barber = barberId ? byId.get(barberId) ?? null : null;

  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const load = () => {
      if (!barberId) {
        setBookings([]);
        return;
      }

      const next = readBookings().filter(
        (b: Booking) =>
          b.barberId === barberId &&
          b.status !== "cancelled" &&
          b.status !== "no_show"
      );
      setBookings(next);
    };

    load();
    const unsub = subscribeStoreUpdates(() => load());
    return unsub;
  }, [barberId]);

  const today = todayKey();
  const weekStart = weekStartKey();
  const weekEnd = weekEndKey();
  const monthPrefix = today.slice(0, 7);

  const todayBookings = useMemo(
    () => bookings.filter((b: Booking) => b.date === today),
    [bookings, today]
  );

  const weekBookings = useMemo(
    () => bookings.filter((b: Booking) => b.date >= weekStart && b.date <= weekEnd),
    [bookings, weekStart, weekEnd]
  );

  const monthBookings = useMemo(
    () => bookings.filter((b: Booking) => b.date.startsWith(monthPrefix)),
    [bookings, monthPrefix]
  );

  const recent = useMemo(() => {
    return bookings
      .slice()
      .sort(
        (a: Booking, b: Booking) =>
          new Date(`${b.date}T${b.time}:00`).getTime() -
          new Date(`${a.date}T${a.time}:00`).getTime()
      )
      .slice(0, 12);
  }, [bookings]);

  if (!barberId || !barber) {
    return (
      <WebShell
        title="Barber Earnings"
        subtitle="Your barber account is not linked to a staff profile yet."
      >
        <div className="mx-auto max-w-4xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Barber profile not linked</div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              Ask the salon owner to create your staff profile first.
            </div>
          </div>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell
      title="Barber Earnings"
      subtitle={`Track your income and tips for ${barber.name}.`}
    >
      <div className="mx-auto max-w-6xl" style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/portal/barber" className="btn btn-secondary">
            ← Dashboard
          </Link>
          <Link href="/portal/barber/bookings" className="btn btn-secondary">
            Bookings
          </Link>
          <Link href="/portal/barber/schedule" className="btn btn-secondary">
            Schedule
          </Link>
        </div>

        <div className="theme-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Logged-in barber</div>
          <div
            style={{
              width: 280,
              height: 44,
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.1)",
              padding: "0 12px",
              fontWeight: 800,
              background: "rgba(0,0,0,0.02)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {barber.name}
          </div>
          <div className="theme-muted" style={{ marginTop: 8, fontSize: 12 }}>
            Barber ID: <b>{barberId}</b>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <StatCard
            label="Today"
            value={fmtMoney(sum(todayBookings, "totalEuro"), "EUR")}
            sub={`${todayBookings.length} booking(s)`}
          />
          <StatCard
            label="This week"
            value={fmtMoney(sum(weekBookings, "totalEuro"), "EUR")}
            sub={`${weekBookings.length} booking(s)`}
          />
          <StatCard
            label="This month"
            value={fmtMoney(sum(monthBookings, "totalEuro"), "EUR")}
            sub={`${monthBookings.length} booking(s)`}
          />
          <StatCard
            label="Tips"
            value={fmtMoney(sum(bookings, "tipEuro"), "EUR")}
            sub="Across all non-cancelled bookings"
          />
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          <StatCard
            label="Online payments"
            value={fmtMoney(
              sum(
                bookings.filter((b: Booking) => b.paymentMethod === "online"),
                "totalEuro"
              ),
              "EUR"
            )}
            sub="Paid online"
          />
          <StatCard
            label="Pay at salon"
            value={fmtMoney(
              sum(
                bookings.filter((b: Booking) => b.paymentMethod === "salon"),
                "totalEuro"
              ),
              "EUR"
            )}
            sub="Collected at salon"
          />
        </div>

        <div className="theme-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Recent earnings</div>

          <div style={{ display: "grid", gap: 10 }}>
            {recent.length === 0 ? (
              <div className="theme-muted">No earnings yet.</div>
            ) : (
              recent.map((b: Booking) => (
                <div
                  key={b.id}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.02)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>{b.serviceName}</div>
                    <div className="theme-muted" style={{ fontSize: 13 }}>
                      {formatDate(b.date)} • {b.time}
                    </div>
                    <div className="theme-muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {b.paymentMethod === "online" ? "Online" : "At salon"} •{" "}
                      {statusLabel(b.status)}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900 }}>
                      {fmtMoney(Number(b.totalEuro) || 0, "EUR")}
                    </div>
                    <div className="theme-muted" style={{ fontSize: 12 }}>
                      Service {fmtMoney(Number(b.servicePriceEuro) || 0, "EUR")}
                    </div>
                    <div className="theme-muted" style={{ fontSize: 12 }}>
                      Tip {fmtMoney(Number(b.tipEuro) || 0, "EUR")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </WebShell>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="theme-card" style={{ padding: 18, borderRadius: 18 }}>
      <div className="theme-muted" style={{ fontSize: 13, fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontWeight: 950, fontSize: 24 }}>{value}</div>
      <div className="theme-muted" style={{ marginTop: 8, fontSize: 12 }}>
        {sub}
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