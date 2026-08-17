"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";
import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";
import {
  getBookingsForBarber,
  updateBookingStatusInSupabase,
} from "@/app/lib/bookingsSupabase";
import type {
  Booking,
  BookingStatus,
} from "@/app/lib/bookingStore";
import { subscribeToBookings } from "@/app/lib/realtime";

function fmtEUR(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function addDays(
  base: Date,
  amount: number
) {
  const date =
    new Date(base);

  date.setDate(
    date.getDate() +
      amount
  );

  return date;
}

function dayKey(
  date: Date
) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(
  dateStr: string
) {
  const [
    year,
    month,
    day,
  ] =
    dateStr
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(
  status?: BookingStatus
) {
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "no_show") return "No-show";
  if (status === "confirmed") return "Confirmed";
  return "Pending";
}

function errorMessage(
  error: unknown
) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as {
        message?: unknown;
      }).message ??
        "Unknown error"
    );
  }

  return "Unknown error";
}

export default function BarberSchedulePage() {
  const authUser =
    useMemo(
      () => getAuthUser(),
      []
    );

  const barberId =
    authUser?.role ===
    "barber"
      ? authUser.barberId ??
        ""
      : "";

  const [barber, setBarber] =
    useState<CustomerBarber | null>(
      null
    );

  const [all, setAll] =
    useState<Booking[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState("");

  const [
    actionId,
    setActionId,
  ] =
    useState<
      string | null
    >(null);

  const [
    dayFilter,
    setDayFilter,
  ] =
    useState<
      "today" |
      "tomorrow" |
      "all"
    >("today");

  const loadData =
    useCallback(
      async (
        showLoader =
          false
      ) => {
        if (!barberId) {
          setLoadError(
            "This barber account is not linked to a barber profile."
          );

          setLoading(
            false
          );

          return;
        }

        try {
          if (
            showLoader
          ) {
            setLoading(
              true
            );
          }

          setLoadError(
            ""
          );

          const barberRow =
            await getBarberByIdFromSupabase(
              barberId
            );

          if (
            !barberRow
          ) {
            throw new Error(
              "The linked barber profile does not exist."
            );
          }

          setBarber({
            id:
              barberRow.id,
            name:
              barberRow.name,
            area:
              barberRow.area,
            address:
              barberRow.address,
            distKm:
              Number(
                barberRow.dist_km ??
                  0
              ),
            rating:
              Number(
                barberRow.rating ??
                  0
              ),
            reviews:
              Number(
                barberRow.reviews ??
                  0
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
              barberRow.active ??
              true,
          });

          const bookings =
            await getBookingsForBarber(
              barberId
            );

          setAll(
            bookings ??
              []
          );
        } catch (
          error
        ) {
          const message =
            errorMessage(
              error
            );

          console.error(
            "BARBER SCHEDULE LOAD ERROR:",
            message
          );

          setBarber(
            null
          );

          setAll(
            []
          );

          setLoadError(
            message
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [barberId]
    );

  useEffect(() => {
    void loadData(
      true
    );

    if (
      !barberId
    ) {
      return;
    }

    const unsubscribe =
      subscribeToBookings(
        () => {
          void loadData(
            false
          );
        },
        `barber_id=eq.${barberId}`
      );

    return unsubscribe;
  }, [
    barberId,
    loadData,
  ]);

  const today =
    dayKey(
      new Date()
    );

  const tomorrow =
    dayKey(
      addDays(
        new Date(),
        1
      )
    );

  const filtered =
    useMemo(
      () => {
        const active =
          all.filter(
            (
              booking
            ) =>
              booking.status !==
                "cancelled" &&
              booking.status !==
                "no_show"
          );

        if (
          dayFilter ===
          "today"
        ) {
          return active.filter(
            (
              booking
            ) =>
              booking.date ===
              today
          );
        }

        if (
          dayFilter ===
          "tomorrow"
        ) {
          return active.filter(
            (
              booking
            ) =>
              booking.date ===
              tomorrow
          );
        }

        return active;
      },
      [
        all,
        dayFilter,
        today,
        tomorrow,
      ]
    );

  const grouped =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            Booking[]
          >();

        filtered.forEach(
          (
            booking
          ) => {
            if (
              !map.has(
                booking.date
              )
            ) {
              map.set(
                booking.date,
                []
              );
            }

            map
              .get(
                booking.date
              )!
              .push(
                booking
              );
          }
        );

        return Array.from(
          map.entries()
        )
          .map(
            ([
              date,
              bookings,
            ]) => [
              date,
              bookings.sort(
                (
                  first,
                  second
                ) =>
                  first.time.localeCompare(
                    second.time
                  )
              ),
            ] as const
          )
          .sort(
            (
              first,
              second
            ) =>
              first[0].localeCompare(
                second[0]
              )
          );
      },
      [filtered]
    );

  async function patchStatus(
    bookingId: string,
    status: BookingStatus
  ) {
    try {
      setActionId(
        bookingId
      );

      await updateBookingStatusInSupabase(
        bookingId,
        status
      );

      await loadData(
        false
      );
    } catch (
      error
    ) {
      alert(
        errorMessage(
          error
        )
      );
    } finally {
      setActionId(
        null
      );
    }
  }

  if (
    !authUser ||
    authUser.role !==
      "barber"
  ) {
    return (
      <WebShell
        title="Access denied"
        subtitle="Barber account required."
      >
        <div className="mx-auto max-w-4xl rounded-[28px] border border-black/10 bg-white p-8">
          <Link
            href="/login"
            className="rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white"
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
        title="Barber Schedule"
        subtitle="Loading your schedule..."
      >
        <div className="mx-auto max-w-6xl rounded-[28px] border border-black/10 bg-white p-8">
          Loading schedule...
        </div>
      </WebShell>
    );
  }

  if (loadError) {
    return (
      <WebShell
        title="Barber Schedule"
        subtitle="Could not load your schedule."
      >
        <div className="mx-auto max-w-4xl rounded-[28px] border border-red-200 bg-white p-8">
          <h2 className="text-2xl font-black">
            Schedule could not be loaded
          </h2>

          <p className="mt-3 text-sm text-neutral-500">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadData(
                true
              )
            }
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
      title="Barber Schedule"
      subtitle={`Schedule for ${
        barber?.name ??
        "your barber account"
      }.`}
    >
      <div className="mx-auto max-w-6xl">
        <PortalNav />

        <section className="mt-6 rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
                Schedule
              </p>

              <h2 className="mt-2 text-3xl font-black">
                {barber?.name}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  "today",
                  "tomorrow",
                  "all",
                ] as const
              ).map(
                (
                  item
                ) => (
                  <button
                    key={
                      item
                    }
                    type="button"
                    onClick={() =>
                      setDayFilter(
                        item
                      )
                    }
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      dayFilter ===
                      item
                        ? "bg-neutral-950 text-white"
                        : "border border-black/10 bg-neutral-50"
                    }`}
                  >
                    {item[0].toUpperCase() +
                      item.slice(
                        1
                      )}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        {grouped.length ===
        0 ? (
          <div className="mt-5 rounded-[28px] border border-black/10 bg-white p-8 text-center shadow-sm">
            <h3 className="font-black">
              No schedule items
            </h3>

            <p className="mt-2 text-sm text-neutral-500">
              No active appointments match this day filter.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5">
            {grouped.map(
              ([
                date,
                dayBookings,
              ]) => (
                <section
                  key={
                    date
                  }
                  className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm"
                >
                  <div>
                    <h3 className="text-2xl font-black">
                      {formatDate(
                        date
                      )}
                    </h3>

                    <p className="mt-1 text-sm text-neutral-500">
                      {
                        dayBookings.length
                      }{" "}
                      appointment
                      {dayBookings.length ===
                      1
                        ? ""
                        : "s"}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {dayBookings.map(
                      (
                        booking
                      ) => {
                        const busy =
                          actionId ===
                          booking.id;

                        return (
                          <article
                            key={
                              booking.id
                            }
                            className="rounded-[22px] border border-black/10 bg-neutral-50 p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <h4 className="text-lg font-black">
                                  {
                                    booking.time
                                  }{" "}
                                  •{" "}
                                  {
                                    booking.serviceName
                                  }
                                </h4>

                                <p className="mt-2 text-sm text-neutral-500">
                                  Customer:{" "}
                                  {
                                    booking.userEmail
                                  }
                                </p>

                                <p className="mt-1 text-xs text-neutral-400">
                                  {
                                    booking.durationMin
                                  }{" "}
                                  min • Reserved:{" "}
                                  {booking
                                    .reservedTimes
                                    ?.length
                                    ? booking.reservedTimes.join(
                                        ", "
                                      )
                                    : booking.time}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-xs font-black uppercase tracking-wide text-neutral-400">
                                  {
                                    statusLabel(
                                      booking.status as BookingStatus
                                    )
                                  }
                                </p>

                                <p className="mt-2 text-lg font-black text-[#ff355d]">
                                  {fmtEUR(
                                    Number(
                                      booking.totalEuro
                                    ) || 0
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {(
                                [
                                  "confirmed",
                                  "completed",
                                  "no_show",
                                  "cancelled",
                                ] as BookingStatus[]
                              ).map(
                                (
                                  status
                                ) => (
                                  <button
                                    key={
                                      status
                                    }
                                    type="button"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      void patchStatus(
                                        booking.id,
                                        status
                                      )
                                    }
                                    className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-black disabled:opacity-40"
                                  >
                                    {
                                      statusLabel(
                                        status
                                      )
                                    }
                                  </button>
                                )
                              )}
                            </div>
                          </article>
                        );
                      }
                    )}
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </div>
    </WebShell>
  );
}

function PortalNav() {
  return (
    <div className="flex flex-wrap gap-2">
      <Nav href="/portal/barber">
        ← Dashboard
      </Nav>
      <Nav href="/portal/barber/bookings">
        Bookings
      </Nav>
      <Nav href="/portal/barber/availability">
        Availability
      </Nav>
      <Nav href="/portal/barber/earnings">
        Earnings
      </Nav>
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
