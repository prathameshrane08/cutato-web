"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Euro,
  Scissors,
  Settings,
  Users,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import WebShell from "@/app/Components/WebShell";

import type { Booking } from "@/app/lib/bookingStore";
import { getAllBookingsFromSupabase } from "@/app/lib/bookingsSupabase";

import { readSalonSettings } from "@/app/lib/salonSettingsStore";
import { subscribeStoreUpdates } from "@/app/lib/storeEvents";

function fmtEUR(v: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(v);
}

function todayKey() {
  const d = new Date();

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function statusLabel(s?: Booking["status"]) {
  if (!s) return "Pending";
  if (s === "pending") return "Pending";
  if (s === "confirmed") return "Confirmed";
  if (s === "completed") return "Completed";
  if (s === "cancelled") return "Cancelled";

  return "No-show";
}

type Barber = {
  id: string;
  active?: boolean;
};

export default function SalonDashboardPage() {
  const router = useRouter();

  const supabase = createClient();

  const [tick, setTick] = useState(0);

  const [loading, setLoading] = useState(true);

  const [barbers, setBarbers] = useState<Barber[]>([]);

  const [all, setAll] = useState<Booking[]>([]);

  useEffect(() => {
    async function protectAndLoad() {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/portal/salon/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, salon_id")
          .eq("id", user.id)
          .single();

        if (
          !profile ||
          profile.role !== "salon" ||
          !profile.salon_id
        ) {
          await supabase.auth.signOut();

          router.replace("/portal/salon/login");

          return;
        }

        const { data: salonBarbers } = await supabase
          .from("barbers")
          .select("*")
          .eq("salon_id", profile.salon_id);

        setBarbers(salonBarbers || []);

        const bookings = await getAllBookingsFromSupabase();

        setAll(bookings || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    protectAndLoad();
  }, []);

  useEffect(() => {
    const unsub = subscribeStoreUpdates(() =>
      setTick((v) => v + 1)
    );

    return unsub;
  }, []);

  const today = todayKey();

  const salon = useMemo(() => readSalonSettings(), [tick]);

  const todays = useMemo(
    () =>
      all
        .filter((b) => b.date === today)
        .sort((a, c) =>
          (a.time + a.id).localeCompare(c.time + c.id)
        ),
    [all, today]
  );

  const upcoming = useMemo(
    () =>
      all
        .filter((b) => b.date >= today)
        .sort((a, c) =>
          (a.date + a.time).localeCompare(c.date + c.time)
        )
        .slice(0, 6),
    [all, today]
  );

  const revenueToday = useMemo(
    () =>
      todays
        .filter(
          (b) =>
            (b.status ?? "pending") !== "cancelled" &&
            (b.status ?? "pending") !== "no_show"
        )
        .reduce(
          (sum, b) => sum + (Number(b.totalEuro) || 0),
          0
        ),
    [todays]
  );

  const pendingCount = useMemo(
    () =>
      all.filter(
        (b) => (b.status ?? "pending") === "pending"
      ).length,
    [all]
  );

  const totalBarbers = useMemo(
    () =>
      barbers.filter((b) => b.active !== false).length,
    [barbers]
  );

  const occupancyToday = useMemo(() => {
    const totalSlots = 24;

    const used = todays.reduce(
      (sum, b) =>
        sum + (b.reservedTimes?.length || 1),
      0
    );

    return Math.min(
      100,
      Math.round((used / totalSlots) * 100)
    );
  }, [todays]);

  if (loading) {
    return (
      <WebShell
        title="Salon Dashboard"
        subtitle="Loading..."
      >
        <div className="rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
          Loading dashboard...
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell
      title="Salon Dashboard"
      subtitle="Owner portal — overview and quick actions"
    >
      <div className="mx-auto max-w-7xl">
        <section className="relative mb-6 overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff355d]">
                Owner dashboard
              </p>

              <h1 className="mt-3 max-w-2xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
                Manage your salon in one place.
              </h1>

              <p className="mt-4 max-w-xl text-white/60">
                Track bookings, revenue,
                occupancy, staff and daily
                operations.
              </p>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-bold text-white/50">
                Today
              </p>

              <p className="mt-1 text-xl font-black">
                {today}
              </p>
            </div>
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-3">
          <Action
            href="/portal/salon/bookings"
            primary
            icon={<CalendarDays size={16} />}
          >
            Manage bookings
          </Action>

          <Action
            href="/portal/salon/barbers"
            icon={<Users size={16} />}
          >
            Staff
          </Action>

          <Action
            href="/portal/salon/services"
            icon={<Scissors size={16} />}
          >
            Services
          </Action>

          <Action
            href="/portal/salon/availability"
            icon={<Clock size={16} />}
          >
            Availability
          </Action>

          <Action
            href="/portal/salon/settings"
            icon={<Settings size={16} />}
          >
            Settings
          </Action>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            icon={<Scissors />}
            title="Salon"
            value={salon.salonName || "Cutato"}
            sub="Current salon profile"
          />

          <KpiCard
            icon={<Euro />}
            title="Revenue today"
            value={fmtEUR(revenueToday)}
            sub="Today’s active bookings"
          />

          <KpiCard
            icon={<Clock />}
            title="Occupancy"
            value={`${occupancyToday}%`}
            sub="Reserved slot usage"
          />

          <KpiCard
            icon={<CalendarDays />}
            title="Pending"
            value={`${pendingCount}`}
            sub="Needs action"
          />

          <KpiCard
            icon={<Users />}
            title="Barbers"
            value={`${totalBarbers}`}
            sub="Active staff"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
                  Today’s bookings
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  {todays.length} appointment
                  {todays.length === 1 ? "" : "s"}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Live overview of today’s salon
                  activity.
                </p>
              </div>

              <Link
                href="/portal/salon/bookings"
                className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50"
              >
                Open all →
              </Link>
            </div>

            {todays.length === 0 ? (
              <Empty text="No bookings today yet." />
            ) : (
              <div className="grid gap-4">
                {todays
                  .slice(0, 8)
                  .map((b) => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                    />
                  ))}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8 lg:sticky lg:top-28">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
              Upcoming
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
              Next 6 bookings
            </h2>

            <div className="mt-6 grid gap-3">
              {upcoming.length === 0 ? (
                <Empty text="No upcoming bookings yet." />
              ) : (
                upcoming.map((b) => (
                  <MiniBooking
                    key={b.id}
                    booking={b}
                  />
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </WebShell>
  );
}

function Action({
  href,
  icon,
  children,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 ${
        primary
          ? "bg-[#ff355d] text-white shadow-[#ff355d]/25"
          : "border border-black/10 bg-white hover:bg-neutral-50"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function KpiCard({
  icon,
  title,
  value,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
      <div className="mb-5 inline-flex rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">
        {icon}
      </div>

      <p className="text-sm font-bold text-neutral-500">
        {title}
      </p>

      <p className="mt-2 truncate text-3xl font-black tracking-[-0.04em]">
        {value}
      </p>

      <p className="mt-2 text-xs font-bold text-neutral-400">
        {sub}
      </p>
    </div>
  );
}

function BookingRow({
  booking: b,
}: {
  booking: Booking;
}) {
  return (
    <article className="rounded-[28px] border border-black/10 bg-neutral-50 p-5 transition hover:bg-white hover:shadow-lg">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h3 className="text-lg font-black">
            {b.time} • {b.serviceName}
          </h3>

          <p className="mt-1 text-sm text-neutral-500">
            Customer: {b.userEmail} • Barber:{" "}
            {b.barberName}
          </p>

          <p className="mt-2 text-xs font-bold text-neutral-400">
            Reserved:{" "}
            {b.reservedTimes?.length
              ? b.reservedTimes.join(", ")
              : b.time}{" "}
            • Payment:{" "}
            {b.paymentMethod === "online"
              ? "Online"
              : "At salon"}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <StatusPill status={b.status} />

          <p className="mt-3 text-xl font-black text-[#ff355d]">
            {fmtEUR(Number(b.totalEuro) || 0)}
          </p>
        </div>
      </div>
    </article>
  );
}

function MiniBooking({
  booking: b,
}: {
  booking: Booking;
}) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-neutral-50 p-4">
      <div className="flex justify-between gap-3">
        <p className="font-black">
          {b.date} • {b.time}
        </p>

        <StatusPill status={b.status} />
      </div>

      <p className="mt-2 text-sm text-neutral-500">
        {b.serviceName} • {b.barberName}
      </p>

      <p className="mt-2 text-sm font-black text-[#ff355d]">
        {fmtEUR(Number(b.totalEuro) || 0)}
      </p>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status?: Booking["status"];
}) {
  const isGood =
    status === "confirmed" ||
    status === "completed";

  const isBad =
    status === "cancelled" ||
    status === "no_show";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${
        isGood
          ? "bg-emerald-100 text-emerald-700"
          : isBad
          ? "bg-red-100 text-red-700"
          : "bg-[#ff355d]/10 text-[#ff355d]"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-[26px] bg-neutral-50 p-6 text-sm font-bold text-neutral-500">
      {text}
    </div>
  );
}