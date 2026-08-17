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

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message ??
        "Unknown error"
    );
  }

  return "Unknown error";
}

export default function BarberBookingsPage() {
  const authUser = useMemo(
    () => getAuthUser(),
    []
  );

  const barberId =
    authUser?.role === "barber"
      ? authUser.barberId ?? ""
      : "";

  const [barber, setBarber] =
    useState<CustomerBarber | null>(null);

  const [all, setAll] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [tab, setTab] =
    useState<
      "today" | "upcoming" | "past" | "all"
    >("today");

  const [search, setSearch] =
    useState("");

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
        if (showLoader) {
          setLoading(true);
        }

        setLoadError("");

        const barberRow =
          await getBarberByIdFromSupabase(
            barberId
          );

        if (!barberRow) {
          throw new Error(
            "The linked barber profile does not exist."
          );
        }

        setBarber({
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
        });

        const bookings =
          await getBookingsForBarber(
            barberId
          );

        setAll(bookings ?? []);
      } catch (error) {
        const message =
          errorMessage(error);

        console.error(
          "BARBER BOOKINGS LOAD ERROR:",
          message
        );

        setBarber(null);
        setAll([]);
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    },
    [barberId]
  );

  useEffect(() => {
    void loadData(true);

    if (!barberId) {
      return;
    }

    const unsubscribe =
      subscribeToBookings(
        () => {
          void loadData(false);
        },
        `barber_id=eq.${barberId}`
      );

    return unsubscribe;
  }, [barberId, loadData]);

  const filtered =
    useMemo(() => {
      const today =
        todayKey();

      const query =
        search
          .trim()
          .toLowerCase();

      return all
        .filter(
          (booking) => {
            const status =
              (booking.status ??
                "pending") as BookingStatus;

            if (
              tab === "today" &&
              booking.date !== today
            ) {
              return false;
            }

            if (
              tab === "upcoming" &&
              !(
                booking.date >= today &&
                (status === "pending" ||
                  status === "confirmed")
              )
            ) {
              return false;
            }

            if (
              tab === "past" &&
              !(
                booking.date < today ||
                status === "completed" ||
                status === "cancelled" ||
                status === "no_show"
              )
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              booking.userEmail,
              booking.serviceName,
              booking.date,
              booking.time,
              booking.paymentMethod,
              status,
              booking.aiStyle ?? "",
              booking.haircutBrief ?? "",
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
      tab,
      search,
    ]);

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

      await loadData(false);
    } catch (error) {
      console.error(
        "BARBER STATUS UPDATE ERROR:",
        error
      );

      alert(
        errorMessage(error)
      );
    } finally {
      setActionId(null);
    }
  }

  if (
    !authUser ||
    authUser.role !== "barber"
  ) {
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
        title="Barber Bookings"
        subtitle="Loading your appointments..."
      >
        <div className="mx-auto max-w-6xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
          Loading bookings...
        </div>
      </WebShell>
    );
  }

  if (loadError) {
    return (
      <WebShell
        title="Barber Bookings"
        subtitle="Could not load your bookings."
      >
        <div className="mx-auto max-w-4xl rounded-[28px] border border-red-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">
            Bookings could not be loaded
          </h2>

          <p className="mt-3 text-sm text-neutral-500">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadData(true)
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
      title="Barber Bookings"
      subtitle={`Appointments assigned to ${
        barber?.name ?? "you"
      }.`}
    >
      <div className="mx-auto max-w-6xl">
        <PortalNav />

        <section className="mt-6 rounded-[30px] border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
                Logged-in barber
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {barber?.name}
              </h2>

              <p className="mt-1 text-xs text-neutral-400">
                {all.length} total booking
                {all.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search customer, service, date, AI brief..."
              className="h-11 min-w-[280px] rounded-2xl border border-black/10 bg-neutral-50 px-4 text-sm font-semibold outline-none focus:border-[#ff355d]"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(
              [
                "today",
                "upcoming",
                "past",
                "all",
              ] as const
            ).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setTab(item)
                }
                className={`rounded-full px-4 py-2 text-xs font-black ${
                  tab === item
                    ? "bg-neutral-950 text-white"
                    : "border border-black/10 bg-neutral-50"
                }`}
              >
                {item[0].toUpperCase() +
                  item.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {filtered.length ===
        0 ? (
          <div className="mt-5 rounded-[28px] border border-black/10 bg-white p-8 text-center shadow-sm">
            <h3 className="font-black">
              No bookings found
            </h3>

            <p className="mt-2 text-sm text-neutral-500">
              No appointments match
              the current filter.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {filtered.map(
              (booking) => {
                const busy =
                  actionId ===
                  booking.id;

                const status =
                  (booking.status ??
                    "pending") as BookingStatus;

                return (
                  <article
                    key={
                      booking.id
                    }
                    className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black">
                          {
                            booking.serviceName
                          }
                        </h3>

                        <p className="mt-2 text-sm text-neutral-500">
                          {formatDate(
                            booking.date
                          )}
                          {" • "}
                          {
                            booking.time
                          }
                          {" • "}
                          {
                            booking.durationMin
                          }{" "}
                          min
                        </p>

                        <p className="mt-1 text-sm text-neutral-500">
                          Customer:{" "}
                          {
                            booking.userEmail
                          }
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="rounded-full bg-neutral-100 px-3 py-2 text-xs font-black">
                          {statusLabel(
                            status
                          )}
                        </span>

                        <p className="mt-3 text-xl font-black text-[#ff355d]">
                          {fmtEUR(
                            Number(
                              booking.totalEuro
                            ) || 0
                          )}
                        </p>
                      </div>
                    </div>

                    {(booking.aiStyle ||
                      booking.haircutBrief ||
                      booking.referenceImage) ? (
                      <div className="mt-5 rounded-[22px] border border-[#ff355d]/20 bg-[#ff355d]/5 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
                          AI haircut brief
                        </p>

                        {booking.aiStyle ? (
                          <h4 className="mt-2 text-lg font-black">
                            {
                              booking.aiStyle
                            }
                          </h4>
                        ) : null}

                        {booking.haircutBrief ? (
                          <p className="mt-2 text-sm leading-6 text-neutral-700">
                            {
                              booking.haircutBrief
                            }
                          </p>
                        ) : null}

                        {booking.referenceImage ? (
                          <img
                            src={
                              booking.referenceImage
                            }
                            alt="Haircut reference"
                            className="mt-4 h-64 w-full rounded-[22px] object-cover"
                          />
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <InfoCard title="Booking">
                        <InfoRow
                          label="Reserved"
                          value={
                            booking
                              .reservedTimes
                              ?.length
                              ? booking.reservedTimes.join(
                                  ", "
                                )
                              : booking.time
                          }
                        />

                        <InfoRow
                          label="Booking ID"
                          value={
                            booking.id
                          }
                        />
                      </InfoCard>

                      <InfoCard title="Money">
                        <InfoRow
                          label="Service"
                          value={fmtEUR(
                            Number(
                              booking.servicePriceEuro
                            ) || 0
                          )}
                        />

                        <InfoRow
                          label="Tip"
                          value={fmtEUR(
                            Number(
                              booking.tipEuro
                            ) || 0
                          )}
                        />

                        <InfoRow
                          label="Total"
                          value={fmtEUR(
                            Number(
                              booking.totalEuro
                            ) || 0
                          )}
                          strong
                        />
                      </InfoCard>

                      <InfoCard title="Status">
                        <select
                          disabled={busy}
                          value={status}
                          onChange={(event) =>
                            void patchStatus(
                              booking.id,
                              event
                                .target
                                .value as BookingStatus
                            )
                          }
                          className="h-11 w-full rounded-2xl border border-black/10 bg-neutral-50 px-3 text-sm font-bold outline-none disabled:opacity-50"
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

                          <option value="no_show">
                            No-show
                          </option>

                          <option value="cancelled">
                            Cancelled
                          </option>
                        </select>
                      </InfoCard>
                    </div>
                  </article>
                );
              }
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
      <Nav href="/portal/barber/schedule">
        Schedule
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

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
      <p className="mb-3 text-xs font-black uppercase tracking-wide text-neutral-400">
        {title}
      </p>

      <div className="grid gap-2">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="font-bold text-neutral-500">
        {label}
      </span>

      <span
        className={
          strong
            ? "text-right font-black"
            : "text-right font-bold"
        }
      >
        {value}
      </span>
    </div>
  );
}
