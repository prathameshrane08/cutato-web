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
  TrendingUp,
  ReceiptText,
  Ban,
} from "lucide-react";

import PortalShell from "@/app/Components/portal/PortalShell";
import { getAuthUser } from "@/app/Components/auth";
import { supabase } from "@/app/lib/supabase";

import type { Booking } from "@/app/lib/bookingStore";
import { getSalonBookingsFromSupabase } from "@/app/lib/bookingsSupabase";

import MetricCard from "@/app/Components/analytics/MetricCard";
import RevenueTrendChart from "@/app/Components/analytics/RevenueTrendChart";
import BookingsTrendChart from "@/app/Components/analytics/BookingsTrendChart";
import BookingStatusChart from "@/app/Components/analytics/BookingStatusChart";
import ServicePerformanceChart from "@/app/Components/analytics/ServicePerformanceChart";
import BarberPerformanceChart from "@/app/Components/analytics/BarberPerformanceChart";
import AnalyticsRangePicker from "@/app/Components/analytics/AnalyticsRangePicker";
import PortalAssistant from "@/app/Components/PortalAssistant";
import DashboardSkeleton from "@/app/Components/portal/DashboardSkeleton";

import type {
  AnalyticsRange,
  RevenuePoint,
  StatusPoint,
  ServicePoint,
  BarberPoint,
} from "@/app/lib/analytics/types";

//==================================================
// TYPES
//==================================================

type Barber = {
  id: string;
  name: string;
  active?: boolean;
};

type Salon = {
  id: string;
  name: string;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
};

//==================================================
// HELPERS
//==================================================

function fmtEUR(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function todayKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function statusLabel(status?: Booking["status"]) {
  if (!status) return "Pending";
  if (status === "pending") return "Pending";
  if (status === "confirmed") return "Confirmed";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "No-show";
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unknown error");
  }

  return "Unknown error";
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function startDateForRange(range: AnalyticsRange) {
  const now = new Date();

  if (range === "7d") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return start;
  }

  if (range === "30d") {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    return start;
  }

  if (range === "90d") {
    const start = new Date(now);
    start.setDate(now.getDate() - 89);
    return start;
  }

  return new Date(now.getFullYear(), 0, 1);
}

function isActiveBooking(booking: Booking) {
  return booking.status !== "cancelled" && booking.status !== "no_show";
}

function emptyRevenuePoint(label: string): RevenuePoint {
  return {
    label,
    revenue: 0,
    bookings: 0,
  };
}

//==================================================
// PAGE
//==================================================

export default function SalonDashboardPage() {
  //------------------------------------------------
  // IMPORTANT:
  //
  // Do NOT call supabase.auth.getUser() here.
  // We use CUTATO local auth and repair salonId
  // from profiles only when necessary.
  //------------------------------------------------

  const localUser = useMemo(() => getAuthUser(), []);

  const [resolvedSalonId, setResolvedSalonId] = useState(
    localUser?.role === "salon" ? (localUser.salonId ?? "") : ""
  );

  const [loading, setLoading] = useState(true);

  const [salon, setSalon] = useState<Salon | null>(null);

  const [barbers, setBarbers] = useState<Barber[]>([]);

  const [all, setAll] = useState<Booking[]>([]);

  const [loadError, setLoadError] = useState("");

  const [range, setRange] = useState<AnalyticsRange>("30d");

  //------------------------------------------------
  // LOAD DASHBOARD
  //------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);

        setLoadError("");

        if (!localUser || localUser.role !== "salon") {
          setLoadError("No salon login was found. Please log in again.");

          return;
        }

        let currentSalonId = resolvedSalonId;

        //------------------------------------------
        // Recover salon_id if local auth is stale
        //------------------------------------------

        if (!currentSalonId && localUser.supabaseUserId) {
          const { data: profileRow, error: profileError } = await supabase
            .from("profiles")
            .select("role, salon_id")
            .eq("id", localUser.supabaseUserId)
            .maybeSingle();

          if (profileError) {
            throw new Error(`Salon profile could not be loaded: ${profileError.message}`);
          }

          if (profileRow?.role === "salon" && profileRow.salon_id) {
            currentSalonId = profileRow.salon_id;

            setResolvedSalonId(profileRow.salon_id);
          }
        }

        if (!currentSalonId) {
          setLoadError("Your salon account is not linked to a salon ID.");

          return;
        }

        //------------------------------------------
        // 1. Salon
        //------------------------------------------

        const { data: salonRow, error: salonError } = await supabase
          .from("salons")
          .select(
            `
            id,
            name,
            owner_name,
            email,
            phone,
            city,
            address
            `
          )
          .eq("id", currentSalonId)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (salonError) {
          throw new Error(`Salon could not be loaded: ${salonError.message}`);
        }

        if (!salonRow) {
          throw new Error("The salon linked to this account does not exist.");
        }

        setSalon(salonRow as Salon);

        //------------------------------------------
        // 2. This salon's barbers ONLY
        //------------------------------------------

        const { data: salonBarbers, error: barbersError } = await supabase
          .from("barbers")
          .select("id, name, active")
          .eq("salon_id", currentSalonId);

        if (cancelled) {
          return;
        }

        if (barbersError) {
          throw new Error(`Salon staff could not be loaded: ${barbersError.message}`);
        }

        setBarbers((salonBarbers ?? []) as Barber[]);

        //------------------------------------------
        // 3. This salon's bookings ONLY
        //------------------------------------------

        const bookings = await getSalonBookingsFromSupabase(currentSalonId);

        if (cancelled) {
          return;
        }

        setAll(bookings ?? []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = errorMessage(error);

        console.error("SALON DASHBOARD LOAD ERROR:", message);

        setSalon(null);

        setBarbers([]);

        setAll([]);

        setLoadError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [localUser, resolvedSalonId]);

  //------------------------------------------------
  // BASIC DATA
  //------------------------------------------------

  const today = todayKey();

  const todays = useMemo(
    () =>
      all
        .filter((booking) => booking.date === today)
        .sort((first, second) => (first.time + first.id).localeCompare(second.time + second.id)),
    [all, today]
  );

  const upcoming = useMemo(
    () =>
      all
        .filter(
          (booking) =>
            booking.date >= today && booking.status !== "cancelled" && booking.status !== "no_show"
        )
        .sort((first, second) => (first.date + first.time).localeCompare(second.date + second.time))
        .slice(0, 6),
    [all, today]
  );

  const totalBarbers = useMemo(
    () => barbers.filter((barber) => barber.active !== false).length,
    [barbers]
  );

  //------------------------------------------------
  // RANGE DATA
  //------------------------------------------------

  const rangeStart = useMemo(() => startDateForRange(range), [range]);

  const rangeStartKey = useMemo(() => dateKey(rangeStart), [rangeStart]);

  const rangeBookings = useMemo(
    () => all.filter((booking) => booking.date >= rangeStartKey && booking.date <= today),
    [all, rangeStartKey, today]
  );

  const activeRangeBookings = useMemo(() => rangeBookings.filter(isActiveBooking), [rangeBookings]);

  //------------------------------------------------
  // KPI CALCULATIONS
  //------------------------------------------------

  const totalRevenue = useMemo(
    () => activeRangeBookings.reduce((sum, booking) => sum + (Number(booking.totalEuro) || 0), 0),
    [activeRangeBookings]
  );

  const bookingCount = activeRangeBookings.length;

  const averageBookingValue = bookingCount > 0 ? totalRevenue / bookingCount : 0;

  const cancelledCount = rangeBookings.filter(
    (booking) => booking.status === "cancelled" || booking.status === "no_show"
  ).length;

  const cancellationRate =
    rangeBookings.length > 0 ? Math.round((cancelledCount / rangeBookings.length) * 100) : 0;

  const completedCount = rangeBookings.filter((booking) => booking.status === "completed").length;

  const completionRate =
    rangeBookings.length > 0 ? Math.round((completedCount / rangeBookings.length) * 100) : 0;

  //------------------------------------------------
  // OCCUPANCY
  //------------------------------------------------

  const occupancy = useMemo(() => {
    if (totalBarbers === 0) {
      return 0;
    }

    const start = parseDateKey(rangeStartKey);

    const end = parseDateKey(today);

    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    const estimatedSlots = totalBarbers * days * 16;

    const used = activeRangeBookings.reduce(
      (sum, booking) => sum + (booking.reservedTimes?.length || 1),
      0
    );

    return Math.min(100, Math.round((used / Math.max(1, estimatedSlots)) * 100));
  }, [activeRangeBookings, totalBarbers, rangeStartKey, today]);

  //------------------------------------------------
  // TREND DATA
  //------------------------------------------------

  const trendData = useMemo<RevenuePoint[]>(() => {
    const start = parseDateKey(rangeStartKey);

    const end = parseDateKey(today);

    const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    const raw: RevenuePoint[] = [];

    for (let index = 0; index < dayCount; index++) {
      const date = new Date(start);

      date.setDate(start.getDate() + index);

      const key = dateKey(date);

      const dayBookings = activeRangeBookings.filter((booking) => booking.date === key);

      raw.push({
        label: date.toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
        }),
        revenue: dayBookings.reduce((sum, booking) => sum + (Number(booking.totalEuro) || 0), 0),
        bookings: dayBookings.length,
      });
    }

    if (range === "7d" || range === "30d") {
      return raw;
    }

    const bucketSize = range === "90d" ? 7 : 30;

    const bucketed: RevenuePoint[] = [];

    for (let index = 0; index < raw.length; index += bucketSize) {
      const chunk = raw.slice(index, index + bucketSize);

      if (chunk.length === 0) {
        continue;
      }

      bucketed.push({
        label: chunk[0]?.label ?? "",
        revenue: chunk.reduce((sum, item) => sum + item.revenue, 0),
        bookings: chunk.reduce((sum, item) => sum + item.bookings, 0),
      });
    }

    return bucketed;
  }, [activeRangeBookings, rangeStartKey, today, range]);

  const safeTrendData = trendData.length > 0 ? trendData : [emptyRevenuePoint("No data")];

  //------------------------------------------------
  // STATUS DATA
  //------------------------------------------------

  const statusData = useMemo<StatusPoint[]>(
    () => [
      {
        name: "Pending",
        value: rangeBookings.filter((booking) => (booking.status ?? "pending") === "pending")
          .length,
      },
      {
        name: "Confirmed",
        value: rangeBookings.filter((booking) => booking.status === "confirmed").length,
      },
      {
        name: "Completed",
        value: rangeBookings.filter((booking) => booking.status === "completed").length,
      },
      {
        name: "Cancelled",
        value: rangeBookings.filter((booking) => booking.status === "cancelled").length,
      },
      {
        name: "No-show",
        value: rangeBookings.filter((booking) => booking.status === "no_show").length,
      },
    ],
    [rangeBookings]
  );

  //------------------------------------------------
  // SERVICE DATA
  //------------------------------------------------

  const serviceData = useMemo<ServicePoint[]>(() => {
    const map = new Map<string, ServicePoint>();

    for (const booking of activeRangeBookings) {
      const name = booking.serviceName || "Unknown service";

      const current = map.get(name) ?? {
        name,
        bookings: 0,
        revenue: 0,
      };

      current.bookings += 1;

      current.revenue += Number(booking.totalEuro) || 0;

      map.set(name, current);
    }

    return Array.from(map.values())
      .sort((first, second) => second.bookings - first.bookings)
      .slice(0, 6);
  }, [activeRangeBookings]);

  //------------------------------------------------
  // BARBER PERFORMANCE
  //------------------------------------------------

  const barberData = useMemo<BarberPoint[]>(() => {
    const byId = new Map(barbers.map((barber) => [barber.id, barber.name]));

    const map = new Map<string, BarberPoint>();

    for (const booking of activeRangeBookings) {
      const id = booking.assignedBarberId ?? booking.barberId;

      const name = byId.get(id) ?? booking.barberName ?? "Unknown barber";

      const current = map.get(name) ?? {
        name,
        bookings: 0,
        revenue: 0,
      };

      current.bookings += 1;

      current.revenue += Number(booking.totalEuro) || 0;

      map.set(name, current);
    }

    return Array.from(map.values())
      .sort((first, second) => second.revenue - first.revenue)
      .slice(0, 8);
  }, [activeRangeBookings, barbers]);

  //------------------------------------------------
  // SIMPLE BUSINESS INSIGHTS
  //------------------------------------------------

  const insights = useMemo(() => {
    if (rangeBookings.length === 0) {
      return [
        "No bookings exist in the selected period yet.",
        "Once customers start booking, CUTATO will surface service, staff and revenue insights here.",
        "Add barbers, services and availability to prepare the salon for live bookings.",
      ];
    }

    const result: string[] = [];

    if (serviceData[0]) {
      result.push(
        `${serviceData[0].name} is your most-booked service with ${serviceData[0].bookings} booking${
          serviceData[0].bookings === 1 ? "" : "s"
        }.`
      );
    }

    if (barberData[0]) {
      result.push(
        `${barberData[0].name} generated the highest revenue in this period at ${fmtEUR(
          barberData[0].revenue
        )}.`
      );
    }

    result.push(`${completionRate}% of bookings in this period are completed.`);

    if (cancellationRate > 0) {
      result.push(`Cancellation / no-show rate is ${cancellationRate}%.`);
    }

    return result.slice(0, 4);
  }, [rangeBookings, serviceData, barberData, completionRate, cancellationRate]);

  //------------------------------------------------
  // LOADING
  //------------------------------------------------

  if (loading) {
    return (
      <PortalShell role="salon" title="Salon Dashboard" subtitle="Loading your salon...">
        <DashboardSkeleton />
      </PortalShell>
    );
  }

  //------------------------------------------------
  // ERROR
  //------------------------------------------------

  if (loadError) {
    return (
      <PortalShell role="salon" title="Salon Dashboard" subtitle="We could not load your salon.">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[32px] border border-red-200 bg-white p-8 shadow-sm">
            <div className="inline-flex rounded-full bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-600">
              Dashboard error
            </div>

            <h2 className="mt-5 text-2xl font-black">Salon data could not be loaded</h2>

            <p className="mt-3 break-words text-sm leading-6 text-neutral-500">{loadError}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white"
              >
                Try again
              </button>

              <Link
                href="/login"
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-black"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </PortalShell>
    );
  }

  //------------------------------------------------
  // MISSING SALON
  //------------------------------------------------

  if (!salon) {
    return (
      <PortalShell role="salon" title="Salon Dashboard" subtitle="Salon profile not found.">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">Salon profile not found</h2>

          <p className="mt-3 text-neutral-500">
            Your login exists, but no matching salon profile was found.
          </p>
        </div>
      </PortalShell>
    );
  }

  //------------------------------------------------
  // DASHBOARD
  //------------------------------------------------

  return (
    <PortalShell role="salon" title="Salon Dashboard" subtitle={`Manage ${salon.name}`}>
      <div className="mx-auto max-w-7xl">
        {/* ========================================
            HERO
        ======================================== */}

        <section className="relative mb-6 overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff355d]">
                Owner analytics
              </p>

              <h1 className="mt-3 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
                {salon.name}
              </h1>

              <p className="mt-4 max-w-xl text-white/60">
                Revenue, demand, staff performance and salon operations in one place.
              </p>

              {salon.address ? (
                <p className="mt-4 text-sm font-bold text-white/40">{salon.address}</p>
              ) : null}
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-bold text-white/50">Today</p>

              <p className="mt-1 text-xl font-black">{today}</p>
            </div>
          </div>
        </section>

        {/* ========================================
            ACTIONS + RANGE
        ======================================== */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <Action href="/portal/salon/bookings" primary icon={<CalendarDays size={16} />}>
              Manage bookings
            </Action>

            <Action href="/portal/salon/staff" icon={<Users size={16} />}>
              Staff
            </Action>

            <Action href="/portal/salon/services" icon={<Scissors size={16} />}>
              Services
            </Action>

            <Action href="/portal/salon/availability" icon={<Clock size={16} />}>
              Availability
            </Action>

            <Action href="/portal/salon/settings" icon={<Settings size={16} />}>
              Settings
            </Action>
          </div>

          <AnalyticsRangePicker value={range} onChange={setRange} />
        </div>

        {/* ========================================
            KPI CARDS
        ======================================== */}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={<Euro size={20} />}
            label="Revenue"
            value={fmtEUR(totalRevenue)}
            helper="Selected period"
          />

          <MetricCard
            icon={<CalendarDays size={20} />}
            label="Bookings"
            value={`${bookingCount}`}
            helper="Non-cancelled"
          />

          <MetricCard
            icon={<ReceiptText size={20} />}
            label="Avg. booking"
            value={fmtEUR(averageBookingValue)}
            helper="Average order value"
          />

          <MetricCard
            icon={<TrendingUp size={20} />}
            label="Occupancy"
            value={`${occupancy}%`}
            helper="Estimated utilization"
          />

          <MetricCard
            icon={<Ban size={20} />}
            label="Cancel / no-show"
            value={`${cancellationRate}%`}
            helper={`${cancelledCount} affected booking${cancelledCount === 1 ? "" : "s"}`}
          />
        </div>

        {/* ========================================
            PRIMARY ANALYTICS
        ======================================== */}

        <div className="grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
          {rangeBookings.length > 0 ? (
            <RevenueTrendChart data={safeTrendData} />
          ) : (
            <EmptyAnalyticsCard
              eyebrow="Performance"
              title="Revenue trend"
              text="No booking data exists for this period yet."
            />
          )}

          {rangeBookings.length > 0 ? (
            <BookingStatusChart data={statusData} />
          ) : (
            <EmptyAnalyticsCard
              eyebrow="Operations"
              title="Booking status"
              text="Booking statuses will appear here once appointments are created."
            />
          )}
        </div>

        {/* ========================================
            SECONDARY ANALYTICS
        ======================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {rangeBookings.length > 0 ? (
            <BookingsTrendChart data={safeTrendData} />
          ) : (
            <EmptyAnalyticsCard
              eyebrow="Demand"
              title="Booking volume"
              text="Booking volume will populate automatically as customers book."
            />
          )}

          {serviceData.length > 0 ? (
            <ServicePerformanceChart data={serviceData} />
          ) : (
            <EmptyAnalyticsCard
              eyebrow="Services"
              title="Top services"
              text="No service performance data is available yet."
            />
          )}
        </div>

        {/* ========================================
            TEAM + INSIGHTS
        ======================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
          {barberData.length > 0 ? (
            <BarberPerformanceChart data={barberData} />
          ) : (
            <EmptyAnalyticsCard
              eyebrow="Team"
              title="Revenue by barber"
              text="Add staff and receive bookings to compare barber performance."
            />
          )}

          <section className="rounded-[30px] border border-black/10 bg-neutral-950 p-6 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
              Business insights
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">What to know</h2>

            <p className="mt-2 text-sm text-white/50">Calculated directly from your salon data.</p>

            <div className="mt-6 grid gap-3">
              {insights.map((insight, index) => (
                <div
                  key={`${insight}-${index}`}
                  className="rounded-[20px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff355d] text-xs font-black">
                      {index + 1}
                    </span>

                    <p className="text-sm font-bold leading-6 text-white/80">{insight}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
              <InsightStat label="Completion" value={`${completionRate}%`} />

              <InsightStat label="Active staff" value={`${totalBarbers}`} />
            </div>
          </section>
        </div>

        {/* ========================================
            BOOKINGS
        ======================================== */}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
                  Today&apos;s bookings
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  {todays.length} appointment
                  {todays.length === 1 ? "" : "s"}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Only bookings belonging to this salon are shown.
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
                {todays.slice(0, 8).map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8 lg:sticky lg:top-28">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">Upcoming</p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Next 6 bookings</h2>

            <div className="mt-6 grid gap-3">
              {upcoming.length === 0 ? (
                <Empty text="No upcoming bookings yet." />
              ) : (
                upcoming.map((booking) => <MiniBooking key={booking.id} booking={booking} />)
              )}
            </div>
          </aside>
        </div>

        <PortalAssistant
          context={{
            role: "salon",
            name: salon.name,
            revenue: totalRevenue,
            bookings: bookingCount,
            averageBookingValue,
            completionRate,
            cancellationRate,
            occupancyOrUtilization: occupancy,
            topService: serviceData[0]
              ? {
                  name: serviceData[0].name,
                  bookings: serviceData[0].bookings,
                }
              : null,
            topBarber: barberData[0]
              ? {
                  name: barberData[0].name,
                  revenue: barberData[0].revenue,
                }
              : null,
            todayBookings: todays.length,
            upcomingBookings: upcoming.length,
            activeBarbers: totalBarbers,
          }}
        />
      </div>
    </PortalShell>
  );
}

//==================================================
// COMPONENTS
//==================================================

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

function BookingRow({ booking }: { booking: Booking }) {
  return (
    <article className="rounded-[28px] border border-black/10 bg-neutral-50 p-5 transition hover:bg-white hover:shadow-lg">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h3 className="text-lg font-black">
            {booking.time} • {booking.serviceName}
          </h3>

          <p className="mt-1 text-sm text-neutral-500">
            Customer: {booking.userEmail} • Barber: {booking.barberName}
          </p>

          <p className="mt-2 text-xs font-bold text-neutral-400">
            Reserved:{" "}
            {booking.reservedTimes?.length ? booking.reservedTimes.join(", ") : booking.time} •
            Payment: {booking.paymentMethod === "online" ? "Online" : "At salon"}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <StatusPill status={booking.status} />

          <p className="mt-3 text-xl font-black text-[#ff355d]">
            {fmtEUR(Number(booking.totalEuro) || 0)}
          </p>
        </div>
      </div>
    </article>
  );
}

function MiniBooking({ booking }: { booking: Booking }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-neutral-50 p-4">
      <div className="flex justify-between gap-3">
        <p className="font-black">
          {booking.date} • {booking.time}
        </p>

        <StatusPill status={booking.status} />
      </div>

      <p className="mt-2 text-sm text-neutral-500">
        {booking.serviceName} • {booking.barberName}
      </p>

      <p className="mt-2 text-sm font-black text-[#ff355d]">
        {fmtEUR(Number(booking.totalEuro) || 0)}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status?: Booking["status"] }) {
  const isGood = status === "confirmed" || status === "completed";

  const isBad = status === "cancelled" || status === "no_show";

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

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[26px] bg-neutral-50 p-6 text-sm font-bold text-neutral-500">
      {text}
    </div>
  );
}

function EmptyAnalyticsCard({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="flex min-h-[360px] flex-col rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff355d]">{eyebrow}</p>

      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">{title}</h2>

      <div className="flex flex-1 items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-neutral-100">
            <TrendingUp size={24} className="text-neutral-400" />
          </div>

          <p className="mt-4 text-sm font-bold leading-6 text-neutral-400">{text}</p>
        </div>
      </div>
    </section>
  );
}

function InsightStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-white/40">{label}</p>

      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
