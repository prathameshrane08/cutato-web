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

import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";
import { supabase } from "@/app/lib/supabase";

import type { Booking } from "@/app/lib/bookingStore";
import { getSalonBookingsFromSupabase } from "@/app/lib/bookingsSupabase";

//==================================================
// TYPES
//==================================================

type Barber = {
  id: string;
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

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message ?? "Unknown error"
    );
  }

  return "Unknown error";
}

//==================================================
// PAGE
//==================================================

export default function SalonDashboardPage() {
  //------------------------------------------------
  // IMPORTANT:
  //
  // Do NOT call supabase.auth.getUser() here.
  //
  // Salon login already stored salonId in Cutato's
  // local auth object. Reading that avoids multiple
  // simultaneous Supabase auth/session requests,
  // which caused:
  //
  // "Lock was stolen by another request"
  //------------------------------------------------

  const localUser = useMemo(
    () => getAuthUser(),
    []
  );

  const [resolvedSalonId, setResolvedSalonId] =
    useState(
      localUser?.role === "salon"
        ? localUser.salonId ?? ""
        : ""
    );

  const [loading, setLoading] =
    useState(true);

  const [salon, setSalon] =
    useState<Salon | null>(null);

  const [barbers, setBarbers] =
    useState<Barber[]>([]);

  const [all, setAll] =
    useState<Booking[]>([]);

  const [loadError, setLoadError] =
    useState("");

  //------------------------------------------------
  // Load dashboard ONCE
  //------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setLoadError("");

        //------------------------------------------
        // Check local portal auth
        //------------------------------------------

        if (
          !localUser ||
          localUser.role !== "salon"
        ) {
          setLoadError(
            "No salon login was found. Please log in again."
          );

          return;
        }

        let currentSalonId = resolvedSalonId;

        //------------------------------------------
        // Recover salon_id if local auth is stale
        //------------------------------------------

        if (
          !currentSalonId &&
          localUser.supabaseUserId
        ) {
          const {
            data: profileRow,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select("role, salon_id")
            .eq(
              "id",
              localUser.supabaseUserId
            )
            .maybeSingle();

          if (profileError) {
            throw new Error(
              `Salon profile could not be loaded: ${profileError.message}`
            );
          }

          if (
            profileRow?.role === "salon" &&
            profileRow.salon_id
          ) {
            currentSalonId =
              profileRow.salon_id;

            setResolvedSalonId(
              profileRow.salon_id
            );
          }
        }

        if (!currentSalonId) {
          setLoadError(
            "Your salon account is not linked to a salon ID."
          );

          return;
        }

        //------------------------------------------
        // 1. Load salon
        //
        // Run requests SEQUENTIALLY.
        // Do not use Promise.all here.
        //------------------------------------------

        const {
          data: salonRow,
          error: salonError,
        } = await supabase
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
          throw new Error(
            `Salon could not be loaded: ${salonError.message}`
          );
        }

        if (!salonRow) {
          throw new Error(
            "The salon linked to this account does not exist."
          );
        }

        setSalon(salonRow as Salon);

        //------------------------------------------
        // 2. Load ONLY this salon's barbers
        //------------------------------------------

        const {
          data: salonBarbers,
          error: barbersError,
        } = await supabase
          .from("barbers")
          .select("id, active")
          .eq("salon_id", currentSalonId);

        if (cancelled) {
          return;
        }

        if (barbersError) {
          throw new Error(
            `Salon staff could not be loaded: ${barbersError.message}`
          );
        }

        setBarbers(
          (salonBarbers ?? []) as Barber[]
        );

        //------------------------------------------
        // 3. Load ONLY this salon's bookings
        //------------------------------------------

        const bookings =
          await getSalonBookingsFromSupabase(
            currentSalonId
          );

        if (cancelled) {
          return;
        }

        setAll(bookings ?? []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          errorMessage(error);

        console.error(
          "SALON DASHBOARD LOAD ERROR:",
          message
        );

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
  // Dashboard calculations
  //------------------------------------------------

  const today =
    todayKey();

  const todays =
    useMemo(
      () =>
        all
          .filter(
            (booking) =>
              booking.date === today
          )
          .sort(
            (first, second) =>
              (
                first.time +
                first.id
              ).localeCompare(
                second.time +
                  second.id
              )
          ),
      [all, today]
    );

  const upcoming =
    useMemo(
      () =>
        all
          .filter(
            (booking) =>
              booking.date >= today &&
              booking.status !== "cancelled" &&
              booking.status !== "no_show"
          )
          .sort(
            (first, second) =>
              (
                first.date +
                first.time
              ).localeCompare(
                second.date +
                  second.time
              )
          )
          .slice(0, 6),
      [all, today]
    );

  const revenueToday =
    useMemo(
      () =>
        todays
          .filter(
            (booking) =>
              (
                booking.status ??
                "pending"
              ) !== "cancelled" &&
              (
                booking.status ??
                "pending"
              ) !== "no_show"
          )
          .reduce(
            (sum, booking) =>
              sum +
              (Number(
                booking.totalEuro
              ) || 0),
            0
          ),
      [todays]
    );

  const pendingCount =
    useMemo(
      () =>
        all.filter(
          (booking) =>
            (
              booking.status ??
              "pending"
            ) === "pending"
        ).length,
      [all]
    );

  const totalBarbers =
    useMemo(
      () =>
        barbers.filter(
          (barber) =>
            barber.active !== false
        ).length,
      [barbers]
    );

  //------------------------------------------------
  // Simple occupancy estimate
  //------------------------------------------------

  const occupancyToday =
    useMemo(() => {
      if (totalBarbers === 0) {
        return 0;
      }

      const estimatedSlots =
        totalBarbers * 16;

      const used =
        todays
          .filter(
            (booking) =>
              booking.status !== "cancelled" &&
              booking.status !== "no_show"
          )
          .reduce(
            (sum, booking) =>
              sum +
              (
                booking
                  .reservedTimes
                  ?.length || 1
              ),
            0
          );

      return Math.min(
        100,
        Math.round(
          (used /
            Math.max(
              1,
              estimatedSlots
            )) *
            100
        )
      );
    }, [
      todays,
      totalBarbers,
    ]);

  //------------------------------------------------
  // Loading state
  //------------------------------------------------

  if (loading) {
    return (
      <WebShell
        title="Salon Dashboard"
        subtitle="Loading your salon..."
      >
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
            <p className="font-black">
              Loading dashboard...
            </p>
          </div>
        </div>
      </WebShell>
    );
  }

  //------------------------------------------------
  // Auth/database error
  //------------------------------------------------

  if (loadError) {
    return (
      <WebShell
        title="Salon Dashboard"
        subtitle="We could not load your salon."
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[32px] border border-red-200 bg-white p-8 shadow-sm">
            <div className="inline-flex rounded-full bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-600">
              Dashboard error
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Salon data could not be loaded
            </h2>

            <p className="mt-3 break-words text-sm leading-6 text-neutral-500">
              {loadError}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white"
              >
                Try again
              </button>

              <Link
                href="/portal/salon/login"
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-black"
              >
                Salon login
              </Link>
            </div>
          </div>
        </div>
      </WebShell>
    );
  }

  //------------------------------------------------
  // Missing salon
  //------------------------------------------------

  if (!salon) {
    return (
      <WebShell
        title="Salon Dashboard"
        subtitle="Salon profile not found."
      >
        <div className="mx-auto max-w-4xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">
            Salon profile not found
          </h2>

          <p className="mt-3 text-neutral-500">
            Your login exists, but no matching salon profile was found.
          </p>
        </div>
      </WebShell>
    );
  }

  //------------------------------------------------
  // Dashboard
  //------------------------------------------------

  return (
    <WebShell
      title="Salon Dashboard"
      subtitle={`Manage ${salon.name}`}
    >
      <div className="mx-auto max-w-7xl">
        {/* ========================================
            HERO
        ======================================== */}

        <section className="relative mb-6 overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff355d]">
                Owner dashboard
              </p>

              <h1 className="mt-3 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
                {salon.name}
              </h1>

              <p className="mt-4 max-w-xl text-white/60">
                Track this salon&apos;s
                bookings, revenue,
                occupancy, staff and daily
                operations.
              </p>

              {salon.address ? (
                <p className="mt-4 text-sm font-bold text-white/40">
                  {salon.address}
                </p>
              ) : null}
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

        {/* ========================================
            ACTIONS
        ======================================== */}

        <div className="mb-6 flex flex-wrap gap-3">
          <Action
            href="/portal/salon/bookings"
            primary
            icon={
              <CalendarDays
                size={16}
              />
            }
          >
            Manage bookings
          </Action>

          <Action
            href="/portal/salon/staff"
            icon={
              <Users
                size={16}
              />
            }
          >
            Staff
          </Action>

          <Action
            href="/portal/salon/services"
            icon={
              <Scissors
                size={16}
              />
            }
          >
            Services
          </Action>

          <Action
            href="/portal/salon/availability"
            icon={
              <Clock
                size={16}
              />
            }
          >
            Availability
          </Action>

          <Action
            href="/portal/salon/settings"
            icon={
              <Settings
                size={16}
              />
            }
          >
            Settings
          </Action>
        </div>

        {/* ========================================
            KPI CARDS
        ======================================== */}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            icon={<Scissors />}
            title="Salon"
            value={salon.name}
            sub="Current salon"
          />

          <KpiCard
            icon={<Euro />}
            title="Revenue today"
            value={fmtEUR(
              revenueToday
            )}
            sub="Active bookings today"
          />

          <KpiCard
            icon={<Clock />}
            title="Occupancy"
            value={`${occupancyToday}%`}
            sub="Estimated slot usage"
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
            sub="Active salon staff"
          />
        </div>

        {/* ========================================
            BOOKINGS
        ======================================== */}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
                  Today&apos;s bookings
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  {todays.length}{" "}
                  appointment
                  {todays.length === 1
                    ? ""
                    : "s"}
                </h2>

                <p className="mt-2 text-sm text-neutral-500">
                  Only bookings belonging
                  to this salon are shown.
                </p>
              </div>

              <Link
                href="/portal/salon/bookings"
                className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50"
              >
                Open all →
              </Link>
            </div>

            {todays.length ===
            0 ? (
              <Empty text="No bookings today yet." />
            ) : (
              <div className="grid gap-4">
                {todays
                  .slice(0, 8)
                  .map(
                    (booking) => (
                      <BookingRow
                        key={
                          booking.id
                        }
                        booking={
                          booking
                        }
                      />
                    )
                  )}
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
              {upcoming.length ===
              0 ? (
                <Empty text="No upcoming bookings yet." />
              ) : (
                upcoming.map(
                  (booking) => (
                    <MiniBooking
                      key={
                        booking.id
                      }
                      booking={
                        booking
                      }
                    />
                  )
                )
              )}
            </div>
          </aside>
        </div>
      </div>
    </WebShell>
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
  booking,
}: {
  booking: Booking;
}) {
  return (
    <article className="rounded-[28px] border border-black/10 bg-neutral-50 p-5 transition hover:bg-white hover:shadow-lg">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h3 className="text-lg font-black">
            {booking.time} •{" "}
            {booking.serviceName}
          </h3>

          <p className="mt-1 text-sm text-neutral-500">
            Customer:{" "}
            {booking.userEmail}{" "}
            • Barber:{" "}
            {booking.barberName}
          </p>

          <p className="mt-2 text-xs font-bold text-neutral-400">
            Reserved:{" "}
            {booking
              .reservedTimes
              ?.length
              ? booking.reservedTimes.join(
                  ", "
                )
              : booking.time}{" "}
            • Payment:{" "}
            {booking.paymentMethod ===
            "online"
              ? "Online"
              : "At salon"}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <StatusPill
            status={booking.status}
          />

          <p className="mt-3 text-xl font-black text-[#ff355d]">
            {fmtEUR(
              Number(
                booking.totalEuro
              ) || 0
            )}
          </p>
        </div>
      </div>
    </article>
  );
}

function MiniBooking({
  booking,
}: {
  booking: Booking;
}) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-neutral-50 p-4">
      <div className="flex justify-between gap-3">
        <p className="font-black">
          {booking.date} •{" "}
          {booking.time}
        </p>

        <StatusPill
          status={booking.status}
        />
      </div>

      <p className="mt-2 text-sm text-neutral-500">
        {booking.serviceName}{" "}
        • {booking.barberName}
      </p>

      <p className="mt-2 text-sm font-black text-[#ff355d]">
        {fmtEUR(
          Number(
            booking.totalEuro
          ) || 0
        )}
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
