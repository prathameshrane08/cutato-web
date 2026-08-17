"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";

import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";

import type { Booking } from "@/app/lib/bookingStore";
import { getBookingsForBarber } from "@/app/lib/bookingsSupabase";

import {
  fmtMoney,
  statusLabel,
  statusPillStyle,
} from "@/app/lib/formatters";

import { supabase } from "@/app/lib/supabase";
import { subscribeToBookings } from "@/app/lib/realtime";

type SalonInfo = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
};

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(base: Date, amount: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + amount);
  return date;
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function shortDay(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(undefined, {
    weekday: "short",
  });
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

export default function BarberPortalPage() {
  //------------------------------------------------
  // Stable CUTATO auth
  //------------------------------------------------

  const authUser = useMemo(
    () => getAuthUser(),
    []
  );

  const barberId =
    authUser?.role === "barber"
      ? authUser.barberId ?? ""
      : "";

  //------------------------------------------------
  // State
  //------------------------------------------------

  const [barber, setBarber] =
    useState<CustomerBarber | null>(null);

  const [salon, setSalon] =
    useState<SalonInfo | null>(null);

  const [allBookings, setAllBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  //------------------------------------------------
  // Load barber + salon + bookings
  //------------------------------------------------

  const loadDashboard = useCallback(
    async (showLoader = false) => {
      if (!barberId) {
        setLoadError(
          "This barber account is not linked to a barber profile."
        );
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

        const barberRow =
          await getBarberByIdFromSupabase(
            barberId
          );

        if (!barberRow) {
          throw new Error(
            "The barber profile linked to this account does not exist."
          );
        }

        const mappedBarber: CustomerBarber = {
          id: barberRow.id,
          name: barberRow.name,
          area: barberRow.area,
          address: barberRow.address,
          distKm: Number(
            barberRow.dist_km ?? 0
          ),
          rating: Number(
            barberRow.rating ?? 0
          ),
          reviews: Number(
            barberRow.reviews ?? 0
          ),
          tagline:
            barberRow.tagline ??
            undefined,
          about:
            barberRow.about ??
            undefined,
          imageUrl:
            barberRow.image_url ??
            undefined,
          speciality:
            barberRow.speciality ??
            undefined,
          active:
            barberRow.active ?? true,
        };

        setBarber(mappedBarber);

        //------------------------------------------
        // 2. Real salon linked to this barber
        //------------------------------------------

        const {
          data: barberLink,
          error: barberLinkError,
        } = await supabase
          .from("barbers")
          .select("salon_id")
          .eq("id", barberId)
          .maybeSingle();

        if (barberLinkError) {
          throw new Error(
            `Barber salon link could not be loaded: ${barberLinkError.message}`
          );
        }

        if (barberLink?.salon_id) {
          const {
            data: salonRow,
            error: salonError,
          } = await supabase
            .from("salons")
            .select(
              "id, name, address, city"
            )
            .eq(
              "id",
              barberLink.salon_id
            )
            .maybeSingle();

          if (salonError) {
            throw new Error(
              `Salon could not be loaded: ${salonError.message}`
            );
          }

          setSalon(
            (salonRow as SalonInfo | null) ??
              null
          );
        } else {
          setSalon(null);
        }

        //------------------------------------------
        // 3. This barber's bookings ONLY
        //------------------------------------------

        const bookings =
          await getBookingsForBarber(
            barberId
          );

        setAllBookings(
          bookings ?? []
        );
      } catch (error) {
        const message =
          errorMessage(error);

        console.error(
          "BARBER DASHBOARD LOAD ERROR:",
          message
        );

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

    const unsubscribe =
      subscribeToBookings(() => {
        void loadDashboard(false);
      });

    return unsubscribe;
  }, [loadDashboard]);

  //------------------------------------------------
  // Dashboard calculations
  //------------------------------------------------

  const today =
    dayKey(new Date());

  const todayBookings =
    useMemo(
      () =>
        allBookings
          .filter(
            (booking) =>
              booking.date === today
          )
          .sort(
            (first, second) =>
              first.time.localeCompare(
                second.time
              )
          ),
      [allBookings, today]
    );

  const upcomingBookings =
    useMemo(
      () =>
        allBookings
          .filter(
            (booking) => {
              const status =
                booking.status ??
                "pending";

              return (
                booking.date >=
                  today &&
                status !==
                  "completed" &&
                status !==
                  "cancelled" &&
                status !==
                  "no_show"
              );
            }
          )
          .sort(
            (first, second) =>
              `${first.date}${first.time}`.localeCompare(
                `${second.date}${second.time}`
              )
          )
          .slice(0, 6),
      [allBookings, today]
    );

  const completedRevenue =
    useMemo(
      () =>
        allBookings
          .filter(
            (booking) =>
              booking.status ===
              "completed"
          )
          .reduce(
            (sum, booking) =>
              sum +
              (Number(
                booking.totalEuro
              ) || 0),
            0
          ),
      [allBookings]
    );

  const todayRevenue =
    useMemo(
      () =>
        todayBookings
          .filter(
            (booking) => {
              const status =
                booking.status ??
                "pending";

              return (
                status !==
                  "cancelled" &&
                status !==
                  "no_show"
              );
            }
          )
          .reduce(
            (sum, booking) =>
              sum +
              (Number(
                booking.totalEuro
              ) || 0),
            0
          ),
      [todayBookings]
    );

  const openCount =
    useMemo(
      () =>
        allBookings.filter(
          (booking) => {
            const status =
              booking.status ??
              "pending";

            return (
              status ===
                "pending" ||
              status ===
                "confirmed"
            );
          }
        ).length,
      [allBookings]
    );

  const completedCount =
    useMemo(
      () =>
        allBookings.filter(
          (booking) =>
            booking.status ===
            "completed"
        ).length,
      [allBookings]
    );

  const onlineRevenue =
    useMemo(
      () =>
        allBookings
          .filter(
            (booking) =>
              booking.paymentMethod ===
                "online" &&
              booking.status !==
                "cancelled" &&
              booking.status !==
                "no_show"
          )
          .reduce(
            (sum, booking) =>
              sum +
              (Number(
                booking.totalEuro
              ) || 0),
            0
          ),
      [allBookings]
    );

  const salonRevenue =
    useMemo(
      () =>
        allBookings
          .filter(
            (booking) =>
              booking.paymentMethod ===
                "salon" &&
              booking.status !==
                "cancelled" &&
              booking.status !==
                "no_show"
          )
          .reduce(
            (sum, booking) =>
              sum +
              (Number(
                booking.totalEuro
              ) || 0),
            0
          ),
      [allBookings]
    );

  const statusBreakdown =
    useMemo(() => {
      const counts = {
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      };

      for (const booking of allBookings) {
        const status =
          (booking.status ??
            "pending") as keyof typeof counts;

        if (status in counts) {
          counts[status] += 1;
        }
      }

      return counts;
    }, [allBookings]);

  const weekData =
    useMemo(() => {
      const days =
        Array.from({
          length: 7,
        }).map((_, index) => {
          const date =
            dayKey(
              addDays(
                new Date(),
                index - 6
              )
            );

          const bookings =
            allBookings.filter(
              (booking) =>
                booking.date ===
                date
            );

          const count =
            bookings.length;

          const revenue =
            bookings
              .filter(
                (booking) => {
                  const status =
                    booking.status ??
                    "pending";

                  return (
                    status !==
                      "cancelled" &&
                    status !==
                      "no_show"
                  );
                }
              )
              .reduce(
                (
                  sum,
                  booking
                ) =>
                  sum +
                  (Number(
                    booking.totalEuro
                  ) || 0),
                0
              );

          return {
            date,
            count,
            revenue,
          };
        });

      const maxCount =
        Math.max(
          1,
          ...days.map(
            (day) =>
              day.count
          )
        );

      return {
        days,
        maxCount,
      };
    }, [allBookings]);

  //------------------------------------------------
  // Access
  //------------------------------------------------

  if (
    !authUser ||
    authUser.role !== "barber"
  ) {
    return (
      <WebShell
        title="Access denied"
        subtitle="Barber account required."
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black">
              Barber login required
            </h2>

            <p className="mt-2 text-neutral-500">
              Sign in using a barber
              account to open this
              portal.
            </p>

            <Link
              href="/login"
              className="mt-5 inline-flex rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white"
            >
              Login
            </Link>
          </div>
        </div>
      </WebShell>
    );
  }

  //------------------------------------------------
  // Loading
  //------------------------------------------------

  if (loading) {
    return (
      <WebShell
        title="Barber Dashboard"
        subtitle="Loading your barber profile..."
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
            <p className="font-black">
              Loading dashboard...
            </p>
          </div>
        </div>
      </WebShell>
    );
  }

  //------------------------------------------------
  // Error
  //------------------------------------------------

  if (loadError) {
    return (
      <WebShell
        title="Barber Dashboard"
        subtitle="We could not load your barber profile."
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Dashboard error
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Barber data could not
              be loaded
            </h2>

            <p className="mt-3 break-words text-sm text-neutral-500">
              {loadError}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadDashboard(
                  true
                )
              }
              className="mt-5 rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </WebShell>
    );
  }

  //------------------------------------------------
  // Missing barber
  //------------------------------------------------

  if (!barberId || !barber) {
    return (
      <WebShell
        title="Barber Dashboard"
        subtitle="Your barber account is not linked to a staff profile yet."
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black">
              Barber profile not
              linked
            </h2>

            <p className="mt-2 text-neutral-500">
              Your account needs a
              valid barber ID before
              the portal can be used.
            </p>
          </div>
        </div>
      </WebShell>
    );
  }

  //------------------------------------------------
  // Dashboard
  //------------------------------------------------

  return (
    <WebShell
      title="Barber Dashboard"
      subtitle={`Welcome back, ${barber.name}.`}
    >
      <div className="mx-auto grid max-w-6xl gap-6">
        {/* HERO */}

        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
                Barber portal
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] md:text-5xl">
                {barber.name}
              </h1>

              <p className="mt-4 text-sm text-white/60">
                ⭐{" "}
                {Number(
                  barber.rating ?? 0
                ).toFixed(1)}
                {" • "}
                {barber.reviews ?? 0}{" "}
                reviews
                {barber.area
                  ? ` • ${barber.area}`
                  : ""}
              </p>

              {barber.address ? (
                <p className="mt-2 text-sm text-white/40">
                  {barber.address}
                </p>
              ) : null}

              {barber.speciality ? (
                <p className="mt-4 font-bold text-white/80">
                  {barber.speciality}
                </p>
              ) : null}

              {barber.tagline ? (
                <p className="mt-2 text-sm text-white/60">
                  {barber.tagline}
                </p>
              ) : null}
            </div>

            <div className="grid min-w-[240px] gap-3">
              <QuickCard
                label="Salon"
                value={
                  salon?.name ??
                  "Independent barber"
                }
                sub={
                  salon?.address ||
                  salon?.city ||
                  "No salon linked"
                }
              />

              <QuickCard
                label="Barber ID"
                value={barberId}
                sub="CUTATO staff identity"
              />
            </div>
          </div>

          <div className="relative mt-7 flex flex-wrap gap-3">
            <PortalButton
              href="/portal/barber/bookings"
              primary
            >
              My bookings
            </PortalButton>

            <PortalButton href="/portal/barber/schedule">
              Schedule
            </PortalButton>

            <PortalButton href="/portal/barber/availability">
              Availability
            </PortalButton>

            <PortalButton href="/portal/barber/earnings">
              Earnings
            </PortalButton>
          </div>
        </section>

        {/* STATS */}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Today's bookings"
            value={String(
              todayBookings.length
            )}
            sub={today}
          />

          <StatCard
            label="Today's revenue"
            value={fmtMoney(
              todayRevenue,
              "EUR"
            )}
            sub="Non-cancelled"
          />

          <StatCard
            label="Open bookings"
            value={String(
              openCount
            )}
            sub="Pending + confirmed"
          />

          <StatCard
            label="Completed"
            value={String(
              completedCount
            )}
            sub="Finished appointments"
          />

          <StatCard
            label="Completed revenue"
            value={fmtMoney(
              completedRevenue,
              "EUR"
            )}
            sub="All time"
          />
        </section>

        {/* ACTIVITY + SPLIT */}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm lg:col-span-2">
            <SectionTitle
              title="7-day activity"
              subtitle="Bookings over the last seven days."
            />

            <div className="mt-6 grid min-h-[200px] grid-cols-7 items-end gap-3">
              {weekData.days.map(
                (day) => {
                  const height =
                    `${Math.max(
                      10,
                      Math.round(
                        (day.count /
                          weekData.maxCount) *
                          140
                      )
                    )}px`;

                  return (
                    <div
                      key={
                        day.date
                      }
                      className="grid justify-items-center gap-2"
                    >
                      <div
                        title={`${day.count} bookings • ${fmtMoney(
                          day.revenue,
                          "EUR"
                        )}`}
                        className="w-full max-w-14 rounded-2xl border border-black/10 bg-neutral-200"
                        style={{
                          height,
                        }}
                      />

                      <p className="text-xs font-black">
                        {day.count}
                      </p>

                      <p className="text-xs text-neutral-400">
                        {shortDay(
                          day.date
                        )}
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="h-fit rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
            <SectionTitle
              title="Payment split"
              subtitle="How customers are paying."
            />

            <div className="mt-5">
              <SplitRow
                label="Online"
                value={fmtMoney(
                  onlineRevenue,
                  "EUR"
                )}
              />

              <SplitRow
                label="At salon"
                value={fmtMoney(
                  salonRevenue,
                  "EUR"
                )}
              />
            </div>

            <div className="my-5 border-t border-black/10" />

            <SectionTitle
              title="Status breakdown"
              subtitle="Current booking mix."
            />

            <div className="mt-5">
              <StatusRow
                label="Pending"
                value={
                  statusBreakdown.pending
                }
              />

              <StatusRow
                label="Confirmed"
                value={
                  statusBreakdown.confirmed
                }
              />

              <StatusRow
                label="Completed"
                value={
                  statusBreakdown.completed
                }
              />

              <StatusRow
                label="Cancelled"
                value={
                  statusBreakdown.cancelled
                }
              />

              <StatusRow
                label="No-show"
                value={
                  statusBreakdown.no_show
                }
              />
            </div>
          </div>
        </div>

        {/* TODAY + UPCOMING */}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionTitle
                title="Today's schedule"
                subtitle={`${todayBookings.length} booking(s) scheduled today.`}
              />

              <Link
                href="/portal/barber/schedule"
                className="text-sm font-black text-[#ff355d]"
              >
                Open full schedule →
              </Link>
            </div>

            <div className="mt-5">
              {todayBookings.length ===
              0 ? (
                <EmptyState text="No bookings today yet." />
              ) : (
                <div className="grid gap-3">
                  {todayBookings.map(
                    (booking) => (
                      <BookingCard
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
            </div>
          </div>

          <div className="h-fit rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <SectionTitle
                title="Next appointments"
                subtitle="Your next 6 upcoming bookings."
              />

              <Link
                href="/portal/barber/bookings"
                className="text-sm font-black text-[#ff355d]"
              >
                All →
              </Link>
            </div>

            <div className="mt-5 grid gap-3">
              {upcomingBookings.length ===
              0 ? (
                <EmptyState text="No upcoming bookings yet." />
              ) : (
                upcomingBookings.map(
                  (booking) => (
                    <div
                      key={
                        booking.id
                      }
                      className="rounded-[20px] border border-black/10 bg-neutral-50 p-4"
                    >
                      <div className="flex justify-between gap-3">
                        <p className="font-black">
                          {formatDate(
                            booking.date
                          )}
                          {" • "}
                          {
                            booking.time
                          }
                        </p>

                        <span
                          style={statusPillStyle(
                            booking.status
                          )}
                        >
                          {statusLabel(
                            booking.status
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-neutral-500">
                        {
                          booking.serviceName
                        }
                      </p>

                      <p className="mt-1 text-xs text-neutral-400">
                        {
                          booking.userEmail
                        }
                      </p>
                    </div>
                  )
                )
              )}
            </div>

            <div className="mt-5 grid gap-2 border-t border-black/10 pt-5">
              <PortalButton
                href="/portal/barber/bookings"
                primary
                full
              >
                Open bookings
              </PortalButton>

              <PortalButton
                href="/portal/barber/schedule"
                full
              >
                Open schedule
              </PortalButton>

              <PortalButton
                href="/portal/barber/availability"
                full
              >
                Edit availability
              </PortalButton>

              <PortalButton
                href="/portal/barber/earnings"
                full
              >
                View earnings
              </PortalButton>
            </div>
          </div>
        </div>
      </div>
    </WebShell>
  );
}

function PortalButton({
  href,
  children,
  primary,
  full,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
  full?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-black transition ${
        full ? "w-full" : ""
      } ${
        primary
          ? "bg-[#ff355d] text-white shadow-lg shadow-[#ff355d]/20"
          : "border border-black/10 bg-white text-neutral-900 hover:bg-neutral-50"
      }`}
    >
      {children}
    </Link>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-black">
        {title}
      </h2>

      <p className="mt-1 text-sm text-neutral-500">
        {subtitle}
      </p>
    </div>
  );
}

function QuickCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-black uppercase tracking-wide text-white/40">
        {label}
      </p>

      <p className="mt-2 break-all text-lg font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/40">
        {sub}
      </p>
    </div>
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
    <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm">
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

function SplitRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-3 flex justify-between gap-3 text-sm">
      <span className="font-bold text-neutral-500">
        {label}
      </span>

      <span className="font-black">
        {value}
      </span>
    </div>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="mb-3 flex justify-between gap-3 text-sm">
      <span className="font-bold text-neutral-500">
        {label}
      </span>

      <span className="font-black">
        {value}
      </span>
    </div>
  );
}

function BookingCard({
  booking,
}: {
  booking: Booking;
}) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-neutral-50 p-5">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="font-black">
            {booking.time}
            {" • "}
            {
              booking.serviceName
            }
          </p>

          <p className="mt-1 text-sm text-neutral-500">
            Customer:{" "}
            {
              booking.userEmail
            }
          </p>
        </div>

        <div className="text-right">
          <span
            style={statusPillStyle(
              booking.status
            )}
          >
            {statusLabel(
              booking.status
            )}
          </span>

          <p className="mt-2 font-black">
            {fmtMoney(
              Number(
                booking.totalEuro
              ) || 0,
              "EUR"
            )}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        Duration:{" "}
        {booking.durationMin} min
        {" • "}Reserved:{" "}
        {booking.reservedTimes
          ?.length
          ? booking.reservedTimes.join(
              ", "
            )
          : booking.time}
      </p>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-[20px] bg-neutral-50 p-5 text-sm font-bold text-neutral-500">
      {text}
    </div>
  );
}
