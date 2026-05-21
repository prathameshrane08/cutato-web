"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  RotateCcw,
  Scissors,
  ShieldCheck,
} from "lucide-react";

import WebShell from "@/app/Components/WebShell";
import { downloadICS } from "@/app/lib/ics";
import type { Booking } from "@/app/lib/bookingStore";
import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBookingByIdFromSupabase } from "@/app/lib/bookingsSupabase";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";
import { readSalonSettings } from "@/app/lib/salonSettingsStore";
import { fmtMoney, statusLabel } from "@/app/lib/formatters";

function toLocalStart(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function paymentLabel(p?: string) {
  if (p === "online") return "Paid online";
  if (p === "salon") return "Pay at salon";
  return "—";
}

function normalizeMoney(b: Booking) {
  const base = Number(b.basePriceEuro || 0);
  const service = Number(b.servicePriceEuro || 0);
  const tip = Number(b.tipEuro || 0);
  const total = Number(b.totalEuro || service + tip || 0);

  return { base, service, tip, total };
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<BookingSuccessLoading />}>
      <BookingSuccessInner />
    </Suspense>
  );
}

function BookingSuccessInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const salon = useMemo(() => readSalonSettings(), []);

  const bookingId = sp.get("bookingId") ?? "";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [barber, setBarber] = useState<CustomerBarber | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBooking() {
      try {
        if (!bookingId) {
          setBooking(null);
          return;
        }

        const found = await getBookingByIdFromSupabase(bookingId);
        setBooking(found);
      } catch (err) {
        console.error("Failed to load booking:", err);
        setBooking(null);
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId]);

  useEffect(() => {
    async function loadBarber() {
      try {
        if (!booking?.barberId) {
          setBarber(null);
          return;
        }

        const b = await getBarberByIdFromSupabase(booking.barberId);

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
        console.error("Failed to load booking barber:", err);
        setBarber(null);
      }
    }

    loadBarber();
  }, [booking?.barberId]);

  const money = useMemo(() => {
    if (!booking) return { base: 0, service: 0, tip: 0, total: 0 };
    return normalizeMoney(booking);
  }, [booking]);

  function addToCalendar() {
    if (!booking) return;

    const start = toLocalStart(booking.date, booking.time);
    const end = new Date(start.getTime() + Number(booking.durationMin || 0) * 60_000);

    downloadICS({
      filename: `cutato-${booking.barberName}-${booking.date}-${booking.time}.ics`,
      title: `CUTATO — ${booking.serviceName} @ ${booking.barberName}`,
      description: [
        `Booking created via CUTATO.`,
        `Service: ${booking.serviceName}`,
        `Status: ${statusLabel(booking.status)}`,
        `Payment: ${paymentLabel(booking.paymentMethod)}`,
        `Service price: ${fmtMoney(money.service, salon.currency)}`,
        `Tip: ${fmtMoney(money.tip, salon.currency)}`,
        `Total: ${fmtMoney(money.total, salon.currency)}`,
      ].join("\n"),
      location: barber?.address ?? "",
      startLocal: start,
      endLocal: end,
    });
  }

  if (loading) {
    return <BookingSuccessLoading />;
  }

  if (!bookingId || !booking) {
    return (
      <WebShell
        title="Booking status"
        subtitle={!bookingId ? "Missing booking ID." : "This booking may have been removed."}
      >
        <div className="mx-auto max-w-3xl rounded-[34px] border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">
            {!bookingId ? "Missing bookingId" : "Booking not found"}
          </h2>

          <p className="mt-2 text-neutral-500">
            Go to your bookings page to check your appointment history.
          </p>

          <Link
            href="/bookings"
            className="mt-6 inline-flex rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25"
          >
            Go to my bookings
          </Link>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell title="Booking confirmed" subtitle="You’re all set. See you soon!">
      <div className="mx-auto max-w-7xl">
        <section className="relative mb-6 overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-12">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />
          <div className="absolute bottom-[-120px] left-[-120px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/80">
                <CheckCircle2 size={16} className="text-[#ff355d]" />
                Appointment confirmed
              </div>

              <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-7xl">
                You’re booked.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
                Your appointment with{" "}
                <span className="font-black text-white">{booking.barberName}</span>{" "}
                has been created successfully.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={addToCalendar}
                  className="inline-flex items-center gap-2 rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]"
                >
                  <CalendarPlus size={17} />
                  Add to calendar
                </button>

                <Link
                  href="/bookings"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-black text-neutral-950 transition hover:bg-neutral-100"
                >
                  View bookings
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/10 p-6 backdrop-blur">
              <p className="text-sm font-bold text-white/50">Booking ID</p>
              <p className="mt-2 break-all text-sm font-black">{booking.id}</p>

              <div className="my-5 h-px bg-white/10" />

              <HeroRow icon={<Scissors />} label="Service" value={booking.serviceName} />
              <HeroRow icon={<Clock />} label="Time" value={`${booking.date} • ${booking.time}`} />
              <HeroRow icon={<CreditCard />} label="Payment" value={paymentLabel(booking.paymentMethod)} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
                  Appointment details
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
                  {booking.barberName}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Manage, cancel or book again from your dashboard.
                </p>
              </div>

              <div className="rounded-full bg-[#ff355d]/10 px-4 py-2 text-sm font-black text-[#ff355d]">
                {statusLabel(booking.status)}
              </div>
            </div>

            <div className="my-7 h-px bg-black/10" />

            <div className="grid gap-4">
              <Row label="Service" value={`${booking.serviceName} (${booking.durationMin} min)`} />
              <Row label="Date" value={booking.date} />
              <Row label="Time" value={booking.time} />
              <Row
                label="Reserved"
                value={booking.reservedTimes?.length ? booking.reservedTimes.join(", ") : booking.time}
              />
              <Row label="Payment" value={paymentLabel(booking.paymentMethod)} />
            </div>

            <div className="my-7 h-px bg-black/10" />

            <div className="rounded-[28px] bg-neutral-50 p-5">
              <h3 className="mb-4 font-black">Price breakdown</h3>

              <div className="grid gap-3">
                <Row label="Base price" value={fmtMoney(money.base, salon.currency)} />
                <Row label="Service price" value={fmtMoney(money.service, salon.currency)} />
                <Row label="Tip" value={fmtMoney(money.tip, salon.currency)} />
              </div>

              <div className="my-5 h-px bg-black/10" />

              <div className="flex items-center justify-between">
                <span className="font-black">Total</span>
                <span className="text-3xl font-black text-[#ff355d]">
                  {fmtMoney(money.total, salon.currency)}
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-black/10 bg-white px-6 py-4 text-sm font-black shadow-sm transition hover:bg-neutral-50"
              >
                Back to discover
              </Link>

              <button
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-4 text-sm font-black shadow-sm transition hover:bg-neutral-50"
                onClick={() =>
                  router.push(`/book?barberId=${encodeURIComponent(booking.barberId)}`)
                }
              >
                <RotateCcw size={16} />
                Book again
              </button>
            </div>
          </section>

          <aside className="grid h-fit gap-4">
            <MapCard title="Directions" name={booking.barberName} address={barber?.address ?? ""} />

            <InfoBox
              icon={<ShieldCheck />}
              title="Cancellation policy"
              text="Free cancellation up to 2 hours before your appointment."
            />

            <InfoBox
              icon={<MapPin />}
              title="Arrive on time"
              text="Please arrive 5 minutes before your appointment."
            />
          </aside>
        </div>
      </div>
    </WebShell>
  );
}

function BookingSuccessLoading() {
  return (
    <WebShell title="Booking confirmed" subtitle="Loading your booking...">
      <div className="mx-auto max-w-3xl">
        <div className="theme-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 900 }}>Loading booking...</div>
        </div>
      </div>
    </WebShell>
  );
}

function HeroRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="mt-0.5 text-[#ff355d]">{icon}</div>
      <div>
        <p className="text-xs font-bold text-white/50">{label}</p>
        <p className="mt-1 text-sm font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm font-bold text-neutral-500">{label}</span>
      <span className="max-w-[220px] text-right text-sm font-black">{value}</span>
    </div>
  );
}

function InfoBox({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">
          {icon}
        </div>

        <div>
          <h3 className="font-black">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-500">{text}</p>
        </div>
      </div>
    </div>
  );
}

function MapCard({
  title,
  name,
  address,
}: {
  title: string;
  name: string;
  address: string;
}) {
  const mapsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;

  return (
    <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">
          <MapPin />
        </div>

        <div>
          <h3 className="font-black">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            {address || "Open map directions to the barber."}
          </p>
        </div>
      </div>

      <a
        href={mapsHref}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex rounded-full bg-[#ff355d] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25"
      >
        Open directions
      </a>
    </div>
  );
}