"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";

import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarbersForSalonFromSupabase } from "@/app/lib/barbersSupabase";

import type {
  Booking,
  BookingStatus,
} from "@/app/lib/bookingStore";

import {
  getSalonBookingsFromSupabase,
  updateBookingAssignmentInSupabase,
  updateBookingStatusInSupabase,
} from "@/app/lib/bookingsSupabase";

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
};

function todayKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

export default function SalonBookingsAdminPage() {
  //------------------------------------------------
  // AUTH
  //------------------------------------------------

  const authUser = useMemo(
    () => getAuthUser(),
    []
  );

  const salonId =
    authUser?.role === "salon"
      ? authUser.salonId ?? ""
      : "";

  //------------------------------------------------
  // STATE
  //------------------------------------------------

  const [salon, setSalon] =
    useState<SalonInfo | null>(null);

  const [barbers, setBarbers] =
    useState<CustomerBarber[]>([]);

  const [all, setAll] =
    useState<Booking[]>([]);

  const [q, setQ] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | BookingStatus>("all");

  const [dateFilter, setDateFilter] =
    useState<
      "all" | "today" | "future" | "past"
    >("future");

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [actionId, setActionId] =
    useState<string | null>(null);

  //------------------------------------------------
  // LOAD ALL SALON DATA
  //------------------------------------------------

  const loadAll = useCallback(
    async (showLoader = false) => {
      if (!salonId) {
        setLoadError(
          "This salon account is not linked to a salon."
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
        // 1. Salon
        //------------------------------------------

        const {
          data: salonRow,
          error: salonError,
        } = await supabase
          .from("salons")
          .select("id, name")
          .eq("id", salonId)
          .maybeSingle();

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

        setSalon(
          salonRow as SalonInfo
        );

        //------------------------------------------
        // 2. This salon's barbers ONLY
        //------------------------------------------

        const barberRows =
          await getBarbersForSalonFromSupabase(
            salonId
          );

        setBarbers(
          barberRows.map(
            (barber) => ({
              id: barber.id,
              name: barber.name,
              area: barber.area,
              address: barber.address,
              distKm: Number(
                barber.dist_km ?? 0
              ),
              rating: Number(
                barber.rating ?? 0
              ),
              reviews: Number(
                barber.reviews ?? 0
              ),
              tagline:
                barber.tagline ??
                undefined,
              about:
                barber.about ??
                undefined,
              imageUrl:
                barber.image_url ??
                undefined,
              speciality:
                barber.speciality ??
                undefined,
              active:
                barber.active ?? true,
            })
          )
        );

        //------------------------------------------
        // 3. This salon's bookings ONLY
        //------------------------------------------

        const bookingRows =
          await getSalonBookingsFromSupabase(
            salonId
          );

        setAll(
          bookingRows as Booking[]
        );
      } catch (error) {
        const message =
          errorMessage(error);

        console.error(
          "SALON BOOKINGS LOAD ERROR:",
          message
        );

        setLoadError(message);
        setSalon(null);
        setBarbers([]);
        setAll([]);
      } finally {
        setLoading(false);
      }
    },
    [salonId]
  );

  //------------------------------------------------
  // INITIAL LOAD + REALTIME
  //------------------------------------------------

  useEffect(() => {
    void loadAll(true);

    const unsubscribe =
      subscribeToBookings(() => {
        void loadAll(false);
      });

    return unsubscribe;
  }, [loadAll]);

  //------------------------------------------------
  // COUNTS
  //------------------------------------------------

  const counts =
    useMemo(() => {
      const normalized =
        all.map(
          (booking) => ({
            ...booking,
            status:
              (booking.status ??
                "pending") as BookingStatus,
          })
        );

      const result: Record<
        string,
        number
      > = {
        all: normalized.length,
      };

      for (const status of [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ] as BookingStatus[]) {
        result[status] =
          normalized.filter(
            (booking) =>
              booking.status ===
              status
          ).length;
      }

      return result;
    }, [all]);

  //------------------------------------------------
  // FILTERED BOOKINGS
  //------------------------------------------------

  const visible =
    useMemo(() => {
      const today =
        todayKey();

      const query =
        q
          .trim()
          .toLowerCase();

      return all
        .map(
          (booking) => ({
            ...booking,

            status:
              (booking.status ??
                "pending") as BookingStatus,

            assignedBarberId:
              booking.assignedBarberId ??
              booking.barberId,
          })
        )
        .filter(
          (booking) => {
            if (
              statusFilter !==
                "all" &&
              booking.status !==
                statusFilter
            ) {
              return false;
            }

            if (
              dateFilter ===
                "today" &&
              booking.date !==
                today
            ) {
              return false;
            }

            if (
              dateFilter ===
                "future" &&
              booking.date < today
            ) {
              return false;
            }

            if (
              dateFilter ===
                "past" &&
              booking.date >= today
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              booking.userEmail,
              booking.barberName,
              booking.serviceName,
              booking.date,
              booking.time,
              booking.paymentMethod,
              booking.id,
              booking.barberId,
              booking.assignedBarberId ??
                "",
            ]
              .join(" ")
              .toLowerCase()
              .includes(query);
          }
        )
        .sort(
          (first, second) =>
            `${first.date}${first.time}`.localeCompare(
              `${second.date}${second.time}`
            )
        );
    }, [
      all,
      q,
      statusFilter,
      dateFilter,
    ]);

  //------------------------------------------------
  // ASSIGN BARBER
  //------------------------------------------------

  async function assignBarber(
    bookingId: string,
    barberId: string
  ) {
    try {
      setActionId(
        bookingId
      );

      const barber =
        barbers.find(
          (item) =>
            item.id === barberId
        );

      if (!barber) {
        alert(
          "That barber is not part of this salon."
        );
        return;
      }

      await updateBookingAssignmentInSupabase(
        bookingId,
        barber.id,
        barber.name
      );

      await loadAll(false);
    } catch (error) {
      console.error(
        "ASSIGN BARBER ERROR:",
        error
      );

      alert(
        errorMessage(error)
      );
    } finally {
      setActionId(null);
    }
  }

  //------------------------------------------------
  // UPDATE STATUS
  //------------------------------------------------

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

      await loadAll(false);
    } catch (error) {
      console.error(
        "BOOKING STATUS ERROR:",
        error
      );

      alert(
        errorMessage(error)
      );
    } finally {
      setActionId(null);
    }
  }

  //------------------------------------------------
  // ACCESS ERROR
  //------------------------------------------------

  if (
    !authUser ||
    authUser.role !== "salon"
  ) {
    return (
      <WebShell
        title="Access denied"
        subtitle="Salon account required."
      >
        <div className="mx-auto max-w-4xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">
            Salon login required
          </h2>

          <p className="mt-2 text-neutral-500">
            Sign in using a salon
            account to manage salon
            bookings.
          </p>

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

  //------------------------------------------------
  // LOADING
  //------------------------------------------------

  if (loading) {
    return (
      <WebShell
        title="Salon Bookings"
        subtitle="Loading salon bookings..."
      >
        <div className="mx-auto max-w-6xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
          Loading bookings...
        </div>
      </WebShell>
    );
  }

  //------------------------------------------------
  // ERROR
  //------------------------------------------------

  if (loadError) {
    return (
      <WebShell
        title="Salon Bookings"
        subtitle="Could not load salon bookings."
      >
        <div className="mx-auto max-w-4xl rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
            Booking error
          </p>

          <h2 className="mt-3 text-2xl font-black">
            Salon bookings could not
            be loaded
          </h2>

          <p className="mt-3 text-sm text-neutral-500">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadAll(true)
            }
            className="mt-5 rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white"
          >
            Try again
          </button>
        </div>
      </WebShell>
    );
  }

  //------------------------------------------------
  // UI
  //------------------------------------------------

  return (
    <WebShell
      title="Salon Bookings"
      subtitle={`Manage bookings for ${
        salon?.name ??
        "your salon"
      }`}
    >
      <div className="mx-auto max-w-6xl">
        {/* NAV */}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <PortalLink
              href="/portal/salon"
            >
              ← Dashboard
            </PortalLink>

            <PortalLink
              href="/portal/salon/calendar"
            >
              Calendar
            </PortalLink>

            <PortalLink
              href="/portal/salon/staff"
            >
              Staff
            </PortalLink>

            <PortalLink
              href="/portal/salon/services"
            >
              Services
            </PortalLink>

            <PortalLink
              href="/portal/salon/availability"
            >
              Availability
            </PortalLink>

            <PortalLink
              href="/portal/salon/settings"
            >
              Settings
            </PortalLink>
          </div>

          <div className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-black text-white">
            {counts.all} booking
            {counts.all === 1
              ? ""
              : "s"}
          </div>
        </div>

        {/* FILTERS */}

        <section className="mt-6 rounded-[30px] border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={
                  statusFilter ===
                  "all"
                }
                onClick={() =>
                  setStatusFilter(
                    "all"
                  )
                }
              >
                All ({counts.all})
              </FilterChip>

              <FilterChip
                active={
                  statusFilter ===
                  "pending"
                }
                onClick={() =>
                  setStatusFilter(
                    "pending"
                  )
                }
              >
                Pending (
                {counts.pending ?? 0})
              </FilterChip>

              <FilterChip
                active={
                  statusFilter ===
                  "confirmed"
                }
                onClick={() =>
                  setStatusFilter(
                    "confirmed"
                  )
                }
              >
                Confirmed (
                {counts.confirmed ??
                  0}
                )
              </FilterChip>

              <FilterChip
                active={
                  statusFilter ===
                  "completed"
                }
                onClick={() =>
                  setStatusFilter(
                    "completed"
                  )
                }
              >
                Completed (
                {counts.completed ??
                  0}
                )
              </FilterChip>

              <FilterChip
                active={
                  statusFilter ===
                  "cancelled"
                }
                onClick={() =>
                  setStatusFilter(
                    "cancelled"
                  )
                }
              >
                Cancelled (
                {counts.cancelled ??
                  0}
                )
              </FilterChip>

              <FilterChip
                active={
                  statusFilter ===
                  "no_show"
                }
                onClick={() =>
                  setStatusFilter(
                    "no_show"
                  )
                }
              >
                No-show (
                {counts.no_show ?? 0})
              </FilterChip>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={
                  dateFilter
                }
                onChange={(
                  event
                ) =>
                  setDateFilter(
                    event.target
                      .value as
                      | "all"
                      | "today"
                      | "future"
                      | "past"
                  )
                }
                className="h-11 rounded-2xl border border-black/10 bg-neutral-50 px-4 text-sm font-bold outline-none"
              >
                <option value="future">
                  Future
                </option>

                <option value="today">
                  Today
                </option>

                <option value="past">
                  Past
                </option>

                <option value="all">
                  All dates
                </option>
              </select>

              <input
                value={q}
                onChange={(
                  event
                ) =>
                  setQ(
                    event.target
                      .value
                  )
                }
                placeholder="Search bookings..."
                className="h-11 min-w-[260px] rounded-2xl border border-black/10 bg-neutral-50 px-4 text-sm font-semibold outline-none focus:border-[#ff355d]"
              />
            </div>
          </div>
        </section>

        {/* BOOKINGS */}

        <section className="mt-5 rounded-[30px] border border-black/10 bg-white p-5 shadow-sm md:p-6">
          <div>
            <h2 className="text-2xl font-black">
              Bookings
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              {visible.length} result
              {visible.length === 1
                ? ""
                : "s"}
            </p>
          </div>

          {visible.length ===
          0 ? (
            <div className="mt-6 rounded-[24px] bg-neutral-50 p-8 text-center">
              <h3 className="font-black">
                No bookings found
              </h3>

              <p className="mt-2 text-sm text-neutral-500">
                No bookings match
                the selected filters.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {visible.map(
                (booking) => {
                  const busy =
                    actionId ===
                    booking.id;

                  return (
                    <article
                      key={
                        booking.id
                      }
                      className="rounded-[26px] border border-black/10 bg-neutral-50 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black">
                            {
                              booking.date
                            }{" "}
                            •{" "}
                            {
                              booking.time
                            }{" "}
                            •{" "}
                            {
                              booking.serviceName
                            }
                          </h3>

                          <p className="mt-2 text-sm text-neutral-500">
                            Customer:{" "}
                            <strong>
                              {
                                booking.userEmail
                              }
                            </strong>
                          </p>

                          <p className="mt-1 text-xs font-bold text-neutral-400">
                            Booking ID:{" "}
                            {
                              booking.id
                            }
                          </p>

                          <p className="mt-1 text-xs font-bold text-neutral-400">
                            Reserved:{" "}
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
                          <span
                            style={statusPillStyle(
                              booking.status
                            )}
                          >
                            {statusLabel(
                              booking.status
                            )}
                          </span>

                          <p className="mt-3 text-xl font-black text-[#ff355d]">
                            {fmtMoney(
                              Number(
                                booking.totalEuro
                              ) ||
                                0,
                              "EUR"
                            )}
                          </p>

                          <p className="mt-1 text-xs font-bold text-neutral-400">
                            {booking.paymentMethod ===
                            "online"
                              ? "Online payment"
                              : "Pay at salon"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {/* BARBER */}

                        <ControlCard title="Assigned barber">
                          {barbers.length ===
                          0 ? (
                            <p className="text-sm text-neutral-500">
                              No salon
                              barbers
                              available.
                            </p>
                          ) : (
                            <select
                              disabled={
                                busy
                              }
                              value={
                                booking.assignedBarberId ??
                                booking.barberId
                              }
                              onChange={(
                                event
                              ) =>
                                void assignBarber(
                                  booking.id,
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold outline-none disabled:opacity-50"
                            >
                              {barbers.map(
                                (
                                  barber
                                ) => (
                                  <option
                                    key={
                                      barber.id
                                    }
                                    value={
                                      barber.id
                                    }
                                  >
                                    {
                                      barber.name
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          )}
                        </ControlCard>

                        {/* STATUS */}

                        <ControlCard title="Status">
                          <select
                            disabled={
                              busy
                            }
                            value={
                              booking.status
                            }
                            onChange={(
                              event
                            ) =>
                              void patchStatus(
                                booking.id,
                                event.target
                                  .value as BookingStatus
                              )
                            }
                            className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold outline-none disabled:opacity-50"
                          >
                            <option value="pending">
                              Pending
                            </option>

                            <option value="confirmed">
                              Confirmed
                            </option>

                            <option value="completed">
                              Completed
                            </option>

                            <option value="cancelled">
                              Cancelled
                            </option>

                            <option value="no_show">
                              No-show
                            </option>
                          </select>
                        </ControlCard>

                        {/* QUICK ACTIONS */}

                        <ControlCard title="Quick actions">
                          <div className="flex flex-wrap gap-2">
                            <SmallButton
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void patchStatus(
                                  booking.id,
                                  "confirmed"
                                )
                              }
                            >
                              Confirm
                            </SmallButton>

                            <SmallButton
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void patchStatus(
                                  booking.id,
                                  "completed"
                                )
                              }
                            >
                              Complete
                            </SmallButton>

                            <SmallButton
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void patchStatus(
                                  booking.id,
                                  "no_show"
                                )
                              }
                            >
                              No-show
                            </SmallButton>

                            <SmallButton
                              disabled={
                                busy
                              }
                              danger
                              onClick={() =>
                                void patchStatus(
                                  booking.id,
                                  "cancelled"
                                )
                              }
                            >
                              Cancel
                            </SmallButton>
                          </div>
                        </ControlCard>
                      </div>

                      <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-black/5 pt-4 text-xs font-bold text-neutral-400">
                        <span>
                          Barber:{" "}
                          {
                            booking.barberName
                          }
                        </span>

                        <span>
                          Base:{" "}
                          {fmtMoney(
                            Number(
                              booking.basePriceEuro
                            ) || 0,
                            "EUR"
                          )}{" "}
                          • Tip:{" "}
                          {fmtMoney(
                            Number(
                              booking.tipEuro
                            ) || 0,
                            "EUR"
                          )}{" "}
                          • Total:{" "}
                          <strong className="text-neutral-700">
                            {fmtMoney(
                              Number(
                                booking.totalEuro
                              ) || 0,
                              "EUR"
                            )}
                          </strong>
                        </span>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </WebShell>
  );
}

function PortalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-black transition hover:bg-neutral-50"
    >
      {children}
    </Link>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-black transition ${
        active
          ? "bg-neutral-950 text-white"
          : "border border-black/10 bg-neutral-50 text-neutral-700 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function ControlCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-black/10 bg-white p-4">
      <p className="mb-3 text-xs font-black uppercase tracking-wide text-neutral-400">
        {title}
      </p>

      {children}
    </div>
  );
}

function SmallButton({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "bg-red-50 text-red-600 hover:bg-red-100"
          : "border border-black/10 bg-neutral-50 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}
