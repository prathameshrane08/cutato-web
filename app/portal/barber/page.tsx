"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  CreditCard,
  Euro,
  ReceiptText,
  Scissors,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import PortalShell from "@/app/Components/portal/PortalShell";
import { getAuthUser } from "@/app/Components/auth";

import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";

import type { Booking } from "@/app/lib/bookingStore";
import { getBookingsForBarber } from "@/app/lib/bookingsSupabase";

import { supabase } from "@/app/lib/supabase";
import { subscribeToBookings } from "@/app/lib/realtime";

import MetricCard from "@/app/Components/analytics/MetricCard";
import RevenueTrendChart from "@/app/Components/analytics/RevenueTrendChart";
import BookingsTrendChart from "@/app/Components/analytics/BookingsTrendChart";
import BookingStatusChart from "@/app/Components/analytics/BookingStatusChart";
import ServicePerformanceChart from "@/app/Components/analytics/ServicePerformanceChart";
import AnalyticsRangePicker from "@/app/Components/analytics/AnalyticsRangePicker";
import PortalAssistant from "@/app/Components/PortalAssistant";
import DashboardSkeleton from "@/app/Components/portal/DashboardSkeleton";

import type {
  AnalyticsRange,
  RevenuePoint,
  ServicePoint,
  StatusPoint,
} from "@/app/lib/analytics/types";

//==================================================
// TYPES
//==================================================

type SalonInfo = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
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

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
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

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
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

function isActiveBooking(booking: Booking) {
  return booking.status !== "cancelled" && booking.status !== "no_show";
}

//==================================================
// PAGE
//==================================================

export default function BarberPortalPage() {
  //------------------------------------------------
  // Stable CUTATO auth
  //------------------------------------------------

  const authUser = useMemo(() => getAuthUser(), []);

  const barberId = authUser?.role === "barber" ? (authUser.barberId ?? "") : "";

  //------------------------------------------------
  // State
  //------------------------------------------------

  const [barber, setBarber] = useState<CustomerBarber | null>(null);

  const [salon, setSalon] = useState<SalonInfo | null>(null);

  const [allBookings, setAllBookings] = useState<Booking[]>([]);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  const [range, setRange] = useState<AnalyticsRange>("30d");

  //------------------------------------------------
  // Load barber + salon + bookings
  //------------------------------------------------

  const loadDashboard = useCallback(
    async (showLoader = false) => {
      if (!barberId) {
        setLoadError("This barber account is not linked to a barber profile.");

        setLoading(false);

        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        setLoadError("");

        //------------------------------------------
        // 1. Barber
        //------------------------------------------

        const barberRow = await getBarberByIdFromSupabase(barberId);

        if (!barberRow) {
          throw new Error("The barber profile linked to this account does not exist.");
        }

        const mappedBarber: CustomerBarber = {
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
        };

        setBarber(mappedBarber);

        //------------------------------------------
        // 2. Real salon linked to barber
        //------------------------------------------

        const { data: barberLink, error: barberLinkError } = await supabase
          .from("barbers")
          .select("salon_id")
          .eq("id", barberId)
          .maybeSingle();

        if (barberLinkError) {
          throw new Error(`Barber salon link could not be loaded: ${barberLinkError.message}`);
        }

        if (barberLink?.salon_id) {
          const { data: salonRow, error: salonError } = await supabase
            .from("salons")
            .select("id, name, address, city")
            .eq("id", barberLink.salon_id)
            .maybeSingle();

          if (salonError) {
            throw new Error(`Salon could not be loaded: ${salonError.message}`);
          }

          setSalon((salonRow as SalonInfo | null) ?? null);
        } else {
          setSalon(null);
        }

        //------------------------------------------
        // 3. This barber's bookings ONLY
        //------------------------------------------

        const bookings = await getBookingsForBarber(barberId);

        setAllBookings(bookings ?? []);
      } catch (error) {
        const message = errorMessage(error);

        console.error("BARBER DASHBOARD LOAD ERROR:", message);

        setBarber(null);

        setSalon(null);

        setAllBookings([]);

        setLoadError(message);
      } finally {
        setLoading(false);
      }
    },
    [barberId]
  );

  //------------------------------------------------
  // Initial load + realtime refresh
  //------------------------------------------------

  useEffect(() => {
    void loadDashboard(true);

    if (!barberId) {
      return;
    }

    const unsubscribe = subscribeToBookings(() => {
      void loadDashboard(false);
    }, `barber_id=eq.${barberId}`);

    return unsubscribe;
  }, [barberId, loadDashboard]);

  //------------------------------------------------
  // Basic booking sets
  //------------------------------------------------

  const today = dayKey(new Date());

  const todayBookings = useMemo(
    () =>
      allBookings
        .filter((booking) => booking.date === today)
        .sort((first, second) => first.time.localeCompare(second.time)),
    [allBookings, today]
  );

  const upcomingBookings = useMemo(
    () =>
      allBookings
        .filter((booking) => {
          const status = booking.status ?? "pending";

          return (
            booking.date >= today &&
            status !== "completed" &&
            status !== "cancelled" &&
            status !== "no_show"
          );
        })
        .sort((first, second) =>
          `${first.date}${first.time}`.localeCompare(`${second.date}${second.time}`)
        )
        .slice(0, 6),
    [allBookings, today]
  );

  //------------------------------------------------
  // Range data
  //------------------------------------------------

  const rangeStart = useMemo(() => startDateForRange(range), [range]);

  const rangeStartKey = useMemo(() => dayKey(rangeStart), [rangeStart]);

  const rangeBookings = useMemo(
    () => allBookings.filter((booking) => booking.date >= rangeStartKey && booking.date <= today),
    [allBookings, rangeStartKey, today]
  );

  const activeRangeBookings = useMemo(() => rangeBookings.filter(isActiveBooking), [rangeBookings]);

  //------------------------------------------------
  // KPIs
  //------------------------------------------------

  const totalRevenue = useMemo(
    () => activeRangeBookings.reduce((sum, booking) => sum + (Number(booking.totalEuro) || 0), 0),
    [activeRangeBookings]
  );

  const tips = useMemo(
    () => activeRangeBookings.reduce((sum, booking) => sum + (Number(booking.tipEuro) || 0), 0),
    [activeRangeBookings]
  );

  const averageBookingValue =
    activeRangeBookings.length > 0 ? totalRevenue / activeRangeBookings.length : 0;

  const completedCount = rangeBookings.filter((booking) => booking.status === "completed").length;

  const completionRate =
    rangeBookings.length > 0 ? Math.round((completedCount / rangeBookings.length) * 100) : 0;

  const failedCount = rangeBookings.filter(
    (booking) => booking.status === "cancelled" || booking.status === "no_show"
  ).length;

  const cancellationRate =
    rangeBookings.length > 0 ? Math.round((failedCount / rangeBookings.length) * 100) : 0;

  //------------------------------------------------
  // Approximate personal utilization
  //------------------------------------------------

  const utilization = useMemo(() => {
    const start = parseDateKey(rangeStartKey);

    const end = parseDateKey(today);

    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    const estimatedSlots = days * 16;

    const used = activeRangeBookings.reduce(
      (sum, booking) => sum + (booking.reservedTimes?.length || 1),
      0
    );

    return Math.min(100, Math.round((used / Math.max(1, estimatedSlots)) * 100));
  }, [activeRangeBookings, rangeStartKey, today]);

  //------------------------------------------------
  // Revenue / booking trend
  //------------------------------------------------

  const trendData = useMemo<RevenuePoint[]>(() => {
    const start = parseDateKey(rangeStartKey);

    const end = parseDateKey(today);

    const dayCount = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    const raw: RevenuePoint[] = [];

    for (let index = 0; index < dayCount; index++) {
      const date = new Date(start);

      date.setDate(start.getDate() + index);

      const key = dayKey(date);

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

  //------------------------------------------------
  // Status
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
  // Services
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
  // Payment split
  //------------------------------------------------

  const onlineRevenue = useMemo(
    () =>
      activeRangeBookings
        .filter((booking) => booking.paymentMethod === "online")
        .reduce((sum, booking) => sum + (Number(booking.totalEuro) || 0), 0),
    [activeRangeBookings]
  );

  const salonRevenue = useMemo(
    () =>
      activeRangeBookings
        .filter((booking) => booking.paymentMethod === "salon")
        .reduce((sum, booking) => sum + (Number(booking.totalEuro) || 0), 0),
    [activeRangeBookings]
  );

  //------------------------------------------------
  // Deterministic personal insights
  //------------------------------------------------

  const insights = useMemo(() => {
    if (rangeBookings.length === 0) {
      return [
        "No bookings exist in the selected period yet.",
        "Once appointments arrive, CUTATO will highlight your best-performing services and earnings patterns.",
        "Keep your availability current so customers can book accurate time slots.",
      ];
    }

    const result: string[] = [];

    if (serviceData[0]) {
      result.push(
        `${serviceData[0].name} is your most-booked service with ${serviceData[0].bookings} appointment${
          serviceData[0].bookings === 1 ? "" : "s"
        }.`
      );
    }

    result.push(`Your completion rate is ${completionRate}% for the selected period.`);

    if (tips > 0) {
      result.push(`You received ${fmtEUR(tips)} in tips during this period.`);
    }

    if (cancellationRate > 0) {
      result.push(`${cancellationRate}% of bookings were cancelled or marked no-show.`);
    }

    return result.slice(0, 4);
  }, [rangeBookings, serviceData, completionRate, tips, cancellationRate]);

  //------------------------------------------------
  // Access
  //------------------------------------------------

  if (!authUser || authUser.role !== "barber") {
    return (
      <PortalShell role="barber" title="Access denied" subtitle="Barber account required.">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black">Barber login required</h2>

            <p className="mt-2 text-neutral-500">
              Sign in using a barber account to open this portal.
            </p>

            <Link
              href="/login"
              className="mt-5 inline-flex rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white"
            >
              Login
            </Link>
          </div>
        </div>
      </PortalShell>
    );
  }

  //------------------------------------------------
  // Loading
  //------------------------------------------------

  if (loading) {
    return (
      <PortalShell role="barber" title="Barber Dashboard" subtitle="Loading your barber profile...">
        <DashboardSkeleton />
      </PortalShell>
    );
  }

  //------------------------------------------------
  // Error
  //------------------------------------------------

  if (loadError) {
    return (
      <PortalShell
        role="barber"
        title="Barber Dashboard"
        subtitle="We could not load your barber profile."
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Dashboard error
            </p>

            <h2 className="mt-3 text-2xl font-black">Barber data could not be loaded</h2>

            <p className="mt-3 break-words text-sm text-neutral-500">{loadError}</p>

            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              className="mt-5 rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </PortalShell>
    );
  }

  //------------------------------------------------
  // Missing barber
  //------------------------------------------------

  if (!barberId || !barber) {
    return (
      <PortalShell
        role="barber"
        title="Barber Dashboard"
        subtitle="Your barber account is not linked to a staff profile yet."
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black">Barber profile not linked</h2>

            <p className="mt-2 text-neutral-500">
              Your account needs a valid barber ID before the portal can be used.
            </p>
          </div>
        </div>
      </PortalShell>
    );
  }

  //------------------------------------------------
  // Dashboard
  //------------------------------------------------

  return (
    <PortalShell role="barber" title="Barber Dashboard" subtitle={`Welcome back, ${barber.name}.`}>
      <div className="mx-auto max-w-7xl">
        {/* ========================================
            HERO
        ======================================== */}

        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff355d]">
                Barber analytics
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] md:text-6xl">
                {barber.name}
              </h1>

              <p className="mt-4 max-w-xl text-white/60">
                Track appointments, revenue, tips, service demand and your personal performance.
              </p>

              <p className="mt-4 text-sm text-white/50">
                ⭐ {Number(barber.rating ?? 0).toFixed(1)}
                {" • "}
                {barber.reviews ?? 0} reviews
                {barber.area ? ` • ${barber.area}` : ""}
              </p>

              {barber.speciality ? (
                <p className="mt-2 font-bold text-white/80">{barber.speciality}</p>
              ) : null}
            </div>

            <div className="grid min-w-[250px] gap-3">
              <HeroInfo
                label="Salon"
                value={salon?.name ?? "Independent barber"}
                sub={salon?.address || salon?.city || "No salon linked"}
              />

              <HeroInfo label="Barber ID" value={barberId} sub="CUTATO staff identity" />
            </div>
          </div>
        </section>

        {/* ========================================
            ACTIONS + RANGE
        ======================================== */}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <PortalButton href="/portal/barber/bookings" primary>
              My bookings
            </PortalButton>

            <PortalButton href="/portal/barber/schedule">Schedule</PortalButton>

            <PortalButton href="/portal/barber/availability">Availability</PortalButton>

            <PortalButton href="/portal/barber/services">Services</PortalButton>

            <PortalButton href="/portal/barber/earnings">Earnings</PortalButton>
          </div>

          <AnalyticsRangePicker value={range} onChange={setRange} />
        </div>

        {/* ========================================
            KPI CARDS
        ======================================== */}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={<Euro size={20} />}
            label="Revenue"
            value={fmtEUR(totalRevenue)}
            helper="Selected period"
          />

          <MetricCard
            icon={<CalendarDays size={20} />}
            label="Bookings"
            value={`${activeRangeBookings.length}`}
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
            label="Utilization"
            value={`${utilization}%`}
            helper="Estimated slot usage"
          />

          <MetricCard
            icon={<WalletCards size={20} />}
            label="Tips"
            value={fmtEUR(tips)}
            helper={`${completionRate}% completion`}
          />
        </div>

        {/* ========================================
            PRIMARY ANALYTICS
        ======================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
          {rangeBookings.length > 0 ? (
            <RevenueTrendChart data={trendData} />
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
            <BookingsTrendChart data={trendData} />
          ) : (
            <EmptyAnalyticsCard
              eyebrow="Demand"
              title="Booking volume"
              text="Your booking trend will appear once customers start booking."
            />
          )}

          {serviceData.length > 0 ? (
            <ServicePerformanceChart data={serviceData} />
          ) : (
            <EmptyAnalyticsCard
              eyebrow="Services"
              title="Top services"
              text="Service performance will appear when bookings exist."
            />
          )}
        </div>

        {/* ========================================
            INSIGHTS + PAYMENT
        ======================================== */}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-[30px] border border-black/10 bg-neutral-950 p-6 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
              Personal insights
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
              Your performance summary
            </h2>

            <p className="mt-2 text-sm text-white/50">
              Calculated directly from your own booking data.
            </p>

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

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
              <InsightStat label="Completion" value={`${completionRate}%`} />

              <InsightStat label="Cancel/no-show" value={`${cancellationRate}%`} />

              <InsightStat label="Completed" value={`${completedCount}`} />
            </div>
          </section>

          <section className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
              Payments
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Revenue split</h2>

            <p className="mt-2 text-sm text-neutral-500">
              How customers paid in the selected period.
            </p>

            <div className="mt-6 grid gap-4">
              <PaymentRow
                icon={<CreditCard size={18} />}
                label="Online"
                value={fmtEUR(onlineRevenue)}
              />

              <PaymentRow
                icon={<Scissors size={18} />}
                label="At salon"
                value={fmtEUR(salonRevenue)}
              />
            </div>

            <div className="mt-6 rounded-[22px] bg-neutral-50 p-5">
              <p className="text-xs font-black uppercase tracking-wide text-neutral-400">
                Net tracked revenue
              </p>

              <p className="mt-2 text-3xl font-black">{fmtEUR(totalRevenue)}</p>
            </div>
          </section>
        </div>

        {/* ========================================
            TODAY + UPCOMING
        ======================================== */}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
                  Today&apos;s schedule
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  {todayBookings.length} appointment
                  {todayBookings.length === 1 ? "" : "s"}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Only appointments assigned to you are shown.
                </p>
              </div>

              <Link
                href="/portal/barber/schedule"
                className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50"
              >
                Open schedule →
              </Link>
            </div>

            {todayBookings.length === 0 ? (
              <Empty text="No bookings today yet." />
            ) : (
              <div className="grid gap-4">
                {todayBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8 lg:sticky lg:top-28">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">Upcoming</p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Next 6 appointments</h2>

            <div className="mt-6 grid gap-3">
              {upcomingBookings.length === 0 ? (
                <Empty text="No upcoming bookings yet." />
              ) : (
                upcomingBookings.map((booking) => (
                  <MiniBooking key={booking.id} booking={booking} />
                ))
              )}
            </div>
          </aside>
        </div>

        <PortalAssistant
          context={{
            role: "barber",
            name: barber.name,
            revenue: totalRevenue,
            bookings: activeRangeBookings.length,
            averageBookingValue,
            completionRate,
            cancellationRate,
            occupancyOrUtilization: utilization,
            tips,
            topService: serviceData[0]
              ? {
                  name: serviceData[0].name,
                  bookings: serviceData[0].bookings,
                }
              : null,
            todayBookings: todayBookings.length,
            upcomingBookings: upcomingBookings.length,
          }}
        />
      </div>
    </PortalShell>
  );
}

//==================================================
// COMPONENTS
//==================================================

function PortalButton({
  href,
  children,
  primary,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 ${
        primary
          ? "bg-[#ff355d] text-white shadow-lg shadow-[#ff355d]/20"
          : "border border-black/10 bg-white text-neutral-900 hover:bg-neutral-50"
      }`}
    >
      {children}
    </Link>
  );
}

function HeroInfo({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-black uppercase tracking-wide text-white/40">{label}</p>

      <p className="mt-2 break-all text-lg font-black text-white">{value}</p>

      <p className="mt-1 text-xs text-white/40">{sub}</p>
    </div>
  );
}

function PaymentRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-black/10 bg-neutral-50 p-4">
      <div className="flex items-center gap-3">
        <div className="inline-flex rounded-xl bg-[#ff355d]/10 p-2.5 text-[#ff355d]">{icon}</div>

        <span className="font-black">{label}</span>
      </div>

      <span className="text-lg font-black">{value}</span>
    </div>
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

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <article className="rounded-[26px] border border-black/10 bg-neutral-50 p-5">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h3 className="text-lg font-black">
            {booking.time} • {booking.serviceName}
          </h3>

          <p className="mt-1 text-sm text-neutral-500">Customer: {booking.userEmail}</p>

          <p className="mt-2 text-xs font-bold text-neutral-400">
            {booking.durationMin} min • Reserved:{" "}
            {booking.reservedTimes?.length ? booking.reservedTimes.join(", ") : booking.time}
          </p>
        </div>

        <div className="text-right">
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
    <div className="rounded-[22px] border border-black/10 bg-neutral-50 p-4">
      <div className="flex justify-between gap-3">
        <p className="font-black">
          {formatDate(booking.date)}
          {" • "}
          {booking.time}
        </p>

        <StatusPill status={booking.status} />
      </div>

      <p className="mt-2 text-sm text-neutral-500">{booking.serviceName}</p>

      <p className="mt-1 text-xs text-neutral-400">{booking.userEmail}</p>
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

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] bg-neutral-50 p-6 text-sm font-bold text-neutral-500">
      {text}
    </div>
  );
}
