"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";
import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";
import { getBookingsForBarber } from "@/app/lib/bookingsSupabase";
import type { Booking } from "@/app/lib/bookingStore";
import { fmtMoney, formatDate, statusLabel } from "@/app/lib/formatters";
import { subscribeToBookings } from "@/app/lib/realtime";

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

  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(monday.getDate()).padStart(2, "0")}`;
}

function weekEndKey() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);

  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(sunday.getDate()).padStart(2, "0")}`;
}

function sum(list: Booking[], field: keyof Booking) {
  return list.reduce(
    (total, item) => total + Number(item[field] || 0),
    0
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object" && "message" in error) {
    return String(
      (error as { message?: unknown }).message ?? "Unknown error"
    );
  }

  return "Unknown error";
}

export default function BarberEarningsPage() {
  const authUser = useMemo(() => getAuthUser(), []);

  const barberId =
    authUser?.role === "barber" ? authUser.barberId ?? "" : "";

  const [barber, setBarber] = useState<CustomerBarber | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(
    async (showLoader = false) => {
      if (!barberId) {
        setLoadError(
          "This barber account is not linked to a barber profile."
        );
        setLoading(false);
        return;
      }

      try {
        if (showLoader) setLoading(true);
        setLoadError("");

        const [barberRow, rows] = await Promise.all([
          getBarberByIdFromSupabase(barberId),
          getBookingsForBarber(barberId),
        ]);

        if (!barberRow) {
          throw new Error(
            "The barber profile linked to this account does not exist."
          );
        }

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

        setBookings(
          (rows ?? []).filter(
            (booking) =>
              booking.status !== "cancelled" &&
              booking.status !== "no_show"
          )
        );
      } catch (error) {
        const message = errorMessage(error);
        console.error("BARBER EARNINGS LOAD ERROR:", message);

        setBarber(null);
        setBookings([]);
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    },
    [barberId]
  );

  useEffect(() => {
    void loadData(true);

    if (!barberId) return;

    const unsubscribe = subscribeToBookings(
      () => {
        void loadData(false);
      },
      `barber_id=eq.${barberId}`
    );

    return unsubscribe;
  }, [barberId, loadData]);

  const today = todayKey();
  const weekStart = weekStartKey();
  const weekEnd = weekEndKey();
  const monthPrefix = today.slice(0, 7);

  const todayBookings = useMemo(
    () => bookings.filter((booking) => booking.date === today),
    [bookings, today]
  );

  const weekBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.date >= weekStart && booking.date <= weekEnd
      ),
    [bookings, weekStart, weekEnd]
  );

  const monthBookings = useMemo(
    () =>
      bookings.filter((booking) =>
        booking.date.startsWith(monthPrefix)
      ),
    [bookings, monthPrefix]
  );

  const completedBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.status === "completed"
      ),
    [bookings]
  );

  const recent = useMemo(
    () =>
      bookings
        .slice()
        .sort((first, second) =>
          `${second.date}${second.time}`.localeCompare(
            `${first.date}${first.time}`
          )
        )
        .slice(0, 12),
    [bookings]
  );

  if (!authUser || authUser.role !== "barber") {
    return (
      <WebShell
        title="Access denied"
        subtitle="Barber account required."
      >
        <div className="mx-auto max-w-4xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">
            Barber login required
          </h2>

          <Link
            href="/login"
            className="mt-5 inline-flex rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white"
          >
            Login
          </Link>
        </div>
      </WebShell>
    );
  }

  if (loading) {
    return (
      <WebShell
        title="Barber Earnings"
        subtitle="Loading your earnings..."
      >
        <div className="mx-auto max-w-6xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
          Loading earnings...
        </div>
      </WebShell>
    );
  }

  if (loadError) {
    return (
      <WebShell
        title="Barber Earnings"
        subtitle="Could not load your earnings."
      >
        <div className="mx-auto max-w-4xl rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">
            Earnings could not be loaded
          </h2>

          <p className="mt-3 text-sm text-neutral-500">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() => void loadData(true)}
            className="mt-5 rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white"
          >
            Try again
          </button>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell
      title="Barber Earnings"
      subtitle={`Track income and tips for ${barber?.name ?? "your account"}.`}
    >
      <div className="mx-auto max-w-6xl">
        <PortalNav />

        <section className="mt-6 rounded-[32px] bg-neutral-950 p-7 text-white shadow-[0_20px_70px_rgba(0,0,0,0.12)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
            Earnings
          </p>

          <h2 className="mt-2 text-3xl font-black">
            {barber?.name}
          </h2>

          <p className="mt-2 text-sm text-white/50">
            Revenue shown here comes only from bookings assigned to this barber.
          </p>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            sub="Across non-cancelled bookings"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Completed revenue"
            value={fmtMoney(
              sum(completedBookings, "totalEuro"),
              "EUR"
            )}
            sub={`${completedBookings.length} completed booking(s)`}
          />

          <StatCard
            label="Online payments"
            value={fmtMoney(
              sum(
                bookings.filter(
                  (booking) => booking.paymentMethod === "online"
                ),
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
                bookings.filter(
                  (booking) => booking.paymentMethod === "salon"
                ),
                "totalEuro"
              ),
              "EUR"
            )}
            sub="Collected at salon"
          />
        </div>

        <section className="mt-6 rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-black">
              Recent earnings
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Latest non-cancelled bookings assigned to you.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {recent.length === 0 ? (
              <div className="rounded-[20px] bg-neutral-50 p-5 text-sm font-bold text-neutral-500">
                No earnings yet.
              </div>
            ) : (
              recent.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap justify-between gap-4 rounded-[22px] border border-black/10 bg-neutral-50 p-5"
                >
                  <div>
                    <h3 className="font-black">
                      {booking.serviceName}
                    </h3>

                    <p className="mt-1 text-sm text-neutral-500">
                      {formatDate(booking.date)} • {booking.time}
                    </p>

                    <p className="mt-1 text-xs text-neutral-400">
                      {booking.paymentMethod === "online"
                        ? "Online"
                        : "At salon"}{" "}
                      • {statusLabel(booking.status)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-black">
                      {fmtMoney(
                        Number(booking.totalEuro) || 0,
                        "EUR"
                      )}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Service{" "}
                      {fmtMoney(
                        Number(booking.servicePriceEuro) || 0,
                        "EUR"
                      )}
                    </p>

                    <p className="mt-1 text-xs font-bold text-[#ff355d]">
                      Tip{" "}
                      {fmtMoney(
                        Number(booking.tipEuro) || 0,
                        "EUR"
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </WebShell>
  );
}

function PortalNav() {
  return (
    <div className="flex flex-wrap gap-2">
      <Nav href="/portal/barber">← Dashboard</Nav>
      <Nav href="/portal/barber/bookings">Bookings</Nav>
      <Nav href="/portal/barber/schedule">Schedule</Nav>
      <Nav href="/portal/barber/availability">Availability</Nav>
    </div>
  );
}

function Nav({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-black hover:bg-neutral-50"
    >
      {children}
    </Link>
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
    <div className="rounded-[26px] border border-black/10 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-neutral-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black tracking-[-0.04em]">
        {value}
      </p>

      <p className="mt-2 text-xs font-bold text-neutral-400">
        {sub}
      </p>
    </div>
  );
}
