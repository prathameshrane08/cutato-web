"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import WebShell from "@/app/Components/WebShell";
import ChatBot from "@/app/Components/ChatBot";
import { downloadICS } from "@/app/lib/ics";
import { useCustomerBarbers } from "@/app/lib/barbersStore";
import type { Booking, BookingStatus } from "@/app/lib/bookingStore";
import {
  getBookingsForUser,
  updateBookingStatusInSupabase,
} from "@/app/lib/bookingsSupabase";
import { getCurrentUser } from "@/app/lib/authSupabase";
import { subscribeToBookings } from "@/app/lib/realtime";
import { readSalonSettings } from "@/app/lib/salonSettingsStore";
import {
  fmtMoney,
  formatDate,
  statusLabel,
  statusPillStyle,
} from "@/app/lib/formatters";

type PaymentMethod = "online" | "salon";

function toLocalStart(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function paymentLabel(p?: PaymentMethod) {
  if (p === "online") return "Online";
  if (p === "salon") return "At salon";
  return "—";
}

function normalizeMoney(b: Booking) {
  const base = Number(b.basePriceEuro || 0);
  const service = Number(b.servicePriceEuro || 0);
  const tip = Number(b.tipEuro || 0);
  const total = Number(b.totalEuro || service + tip || 0);
  return { base, service, tip, total };
}

export default function BookingsPage() {
  const router = useRouter();
  const { byId } = useCustomerBarbers();

  const [userEmail, setUserEmail] = useState("");
  const [items, setItems] = useState<Booking[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const salon = useMemo(() => readSalonSettings(), []);

  async function loadBookings(email: string) {
    try {
      setLoading(true);
      const data = await getBookingsForUser(email);
      setItems(data);
    } catch (err) {
      console.error("Failed to load bookings:", err);
      setItems([]);
    } finally {
      setLoading(false);
      setReady(true);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        const { data } = await getCurrentUser();
        const user = data.user;

        if (!user?.email) {
          router.replace(`/login?next=${encodeURIComponent("/bookings")}`);
          return;
        }

        const email = user.email.trim().toLowerCase();
        setUserEmail(email);
        await loadBookings(email);
      } catch (err) {
        console.error("Failed to initialize bookings page:", err);
        setItems([]);
        setReady(true);
        setLoading(false);
      }
    }

    init();
  }, [router]);

  useEffect(() => {
    if (!userEmail) return;

    const unsubscribe = subscribeToBookings(
      () => {
        loadBookings(userEmail);
      },
      `user_email=eq.${userEmail}`
    );

    return unsubscribe;
  }, [userEmail]);

  const grouped = useMemo(() => {
    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    const now = new Date();

    for (const b of items) {
      const status = (b.status ?? "pending") as BookingStatus;
      const dt = toLocalStart(b.date, b.time);

      const isPastByStatus =
        status === "completed" ||
        status === "cancelled" ||
        status === "no_show";

      const isPastByTime = dt.getTime() < now.getTime();

      if (isPastByStatus || isPastByTime) past.push(b);
      else upcoming.push(b);
    }

    upcoming.sort(
      (a, c) =>
        toLocalStart(a.date, a.time).getTime() -
        toLocalStart(c.date, c.time).getTime()
    );

    past.sort(
      (a, c) =>
        toLocalStart(c.date, c.time).getTime() -
        toLocalStart(a.date, a.time).getTime()
    );

    return { upcoming, past };
  }, [items]);

  async function onCancel(id: string) {
    if (!confirm("Cancel this booking?")) return;

    try {
      await updateBookingStatusInSupabase(id, "cancelled");

      if (userEmail) {
        await loadBookings(userEmail);
      }
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      alert("Could not cancel booking.");
    }
  }

  function addToCalendar(b: Booking) {
    const start = toLocalStart(b.date, b.time);
    const end = new Date(start.getTime() + Number(b.durationMin || 0) * 60_000);

    const barber = byId.get(b.barberId);
    const location = barber?.address ?? "";

    const eur = normalizeMoney(b);
    const pay = paymentLabel(b.paymentMethod);

    downloadICS({
      filename: `cutato-${b.barberName}-${b.date}-${b.time}.ics`,
      title: `CUTATO — ${b.serviceName} @ ${b.barberName}`,
      description: [
        `Booking created via CUTATO.`,
        `Service: ${b.serviceName}`,
        `Payment: ${pay}`,
        `Status: ${statusLabel(b.status)}`,
        `Service price: ${fmtMoney(eur.service, salon.currency)}`,
        `Tip: ${fmtMoney(eur.tip, salon.currency)}`,
        `Total: ${fmtMoney(eur.total, salon.currency)}`,
      ].join("\n"),
      location,
      startLocal: start,
      endLocal: end,
    });
  }

  if (!ready || loading) {
    return (
      <WebShell title="My bookings" subtitle="Manage your appointments">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
            <div className="font-black">Loading your bookings…</div>
          </div>
        </div>
      </WebShell>
    );
  }

  return (
    <>
      <WebShell title="My bookings" subtitle="Manage your appointments">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap justify-between gap-3">
            <Link
              href="/"
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50"
            >
              Back to discover
            </Link>

            <Link
              href="/"
              className="rounded-full bg-[#ff355d] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]"
            >
              New booking
            </Link>
          </div>

          <div className="h-5" />

          <Section
            title="Upcoming"
            items={grouped.upcoming}
            onCancel={onCancel}
            onCalendar={addToCalendar}
            currency={salon.currency}
          />

          <div className="h-6" />

          <Section
            title="Past"
            items={grouped.past}
            onCancel={onCancel}
            onCalendar={addToCalendar}
            currency={salon.currency}
          />
        </div>
      </WebShell>

      <ChatBot />
    </>
  );
}

function Section({
  title,
  items,
  onCancel,
  onCalendar,
  currency,
}: {
  title: string;
  items: Booking[];
  onCancel: (id: string) => void;
  onCalendar: (b: Booking) => void;
  currency: string;
}) {
  return (
    <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
            {title}
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            {items.length} booking{items.length === 1 ? "" : "s"}
          </h2>
        </div>
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <div className="rounded-[26px] bg-neutral-50 p-6 text-sm font-bold text-neutral-500">
            Nothing here yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((b) => {
              const eur = normalizeMoney(b);
              const pay = paymentLabel(b.paymentMethod);
              const status = (b.status ?? "pending") as BookingStatus;
              const canCancel = status === "pending" || status === "confirmed";

              return (
                <article
                  key={b.id}
                  className="rounded-[30px] border border-black/10 bg-neutral-50 p-5 transition hover:bg-white hover:shadow-lg"
                >
                  <div className="flex flex-wrap justify-between gap-5">
                    <div>
                      <h3 className="text-xl font-black">{b.barberName}</h3>

                      <p className="mt-1 text-sm font-bold text-neutral-500">
                        {b.serviceName} • {b.durationMin} min
                      </p>

                      <p className="mt-2 text-sm text-neutral-500">
                        {formatDate(b.date)} at {b.time}
                        {b.reservedTimes?.length ? (
                          <> • reserved: {b.reservedTimes.join(", ")}</>
                        ) : null}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span style={statusPillStyle(status)}>
                          {statusLabel(status)}
                        </span>
                        <Pill label={`Payment: ${pay}`} />
                        <Pill label={`Tip: ${fmtMoney(eur.tip, currency)}`} />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:justify-items-end">
                      <div className="text-2xl font-black text-[#ff355d]">
                        {fmtMoney(eur.total, currency)}
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        {canCancel ? (
                          <Link
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black transition hover:bg-neutral-50"
                            href={`/book?barberId=${encodeURIComponent(
                              b.barberId
                            )}&serviceId=${encodeURIComponent(
                              b.serviceId
                            )}&date=${encodeURIComponent(
                              b.date
                            )}&time=${encodeURIComponent(
                              b.time
                            )}&rescheduleFrom=${encodeURIComponent(b.id)}`}
                          >
                            Reschedule
                          </Link>
                        ) : null}

                        <button
                          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black transition hover:bg-neutral-50"
                          onClick={() => onCalendar(b)}
                        >
                          Add to calendar
                        </button>

                        {canCancel ? (
                          <button
                            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black transition hover:bg-neutral-50"
                            onClick={() => onCancel(b.id)}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="my-5 h-px bg-black/10" />

                  <div className="grid gap-2">
                    <Line label="Base price" value={fmtMoney(eur.base, currency)} />
                    <Line
                      label="Service price"
                      value={fmtMoney(eur.service, currency)}
                    />
                    <Line label="Tip" value={fmtMoney(eur.tip, currency)} />
                    <Line
                      label="Total"
                      value={fmtMoney(eur.total, currency)}
                      strong
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-black">
      {label}
    </span>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm font-bold text-neutral-500">{label}</span>
      <span className={`text-sm ${strong ? "font-black" : "font-bold"}`}>
        {value}
      </span>
    </div>
  );
}