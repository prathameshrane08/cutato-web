"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";
import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";
import {
  getBarberAvailability,
  upsertBarberAvailability,
  type BarberAvailability,
  type BarberDayRule,
  type DayName,
} from "@/app/lib/availabilityStore";

const DAY_LABEL: Record<
  DayName,
  string
> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function isValidYyyyMmDd(
  value: string
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  );
}

export default function BarberAvailabilityPage() {
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

  const [availability, setAvailability] =
    useState<BarberAvailability | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [newDate, setNewDate] =
    useState("");

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        setLoading(
          true
        );

        if (
          !barberId
        ) {
          setBarber(
            null
          );

          setAvailability(
            null
          );

          return;
        }

        const barberRow =
          await getBarberByIdFromSupabase(
            barberId
          );

        if (
          cancelled
        ) {
          return;
        }

        if (
          !barberRow
        ) {
          setBarber(
            null
          );

          setAvailability(
            null
          );

          return;
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

        setAvailability(
          getBarberAvailability(
            barberId
          )
        );
      } catch (
        error
      ) {
        console.error(
          "BARBER AVAILABILITY LOAD ERROR:",
          error
        );

        setBarber(
          null
        );

        setAvailability(
          null
        );
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled =
        true;
    };
  }, [barberId]);

  function save(
    next: BarberAvailability
  ) {
    const saved =
      upsertBarberAvailability(
        next
      );

    setAvailability(
      saved
    );
  }

  function setDay(
    day: DayName,
    patch: Partial<BarberDayRule>
  ) {
    if (
      !availability
    ) {
      return;
    }

    save({
      ...availability,
      week: {
        ...availability.week,
        [day]: {
          ...availability.week[
            day
          ],
          ...patch,
        },
      },
    });
  }

  function toggleBreak(
    day: DayName,
    enabled: boolean
  ) {
    if (
      !availability
    ) {
      return;
    }

    const current =
      availability.week[
        day
      ];

    if (
      !enabled
    ) {
      setDay(day, {
        breakStart:
          undefined,
        breakEnd:
          undefined,
      });

      return;
    }

    setDay(day, {
      breakStart:
        current.breakStart ??
        "13:00",

      breakEnd:
        current.breakEnd ??
        "13:30",
    });
  }

  function addTimeOff() {
    if (
      !availability
    ) {
      return;
    }

    const date =
      newDate.trim();

    if (
      !isValidYyyyMmDd(
        date
      )
    ) {
      alert(
        "Enter a date in YYYY-MM-DD format."
      );

      return;
    }

    if (
      availability.timeOffDates.includes(
        date
      )
    ) {
      setNewDate(
        ""
      );

      return;
    }

    save({
      ...availability,
      timeOffDates: [
        date,
        ...availability.timeOffDates,
      ].slice(0, 100),
    });

    setNewDate(
      ""
    );
  }

  function removeTimeOff(
    date: string
  ) {
    if (
      !availability
    ) {
      return;
    }

    save({
      ...availability,
      timeOffDates:
        availability.timeOffDates.filter(
          (
            item
          ) =>
            item !==
            date
        ),
    });
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
        title="Availability"
        subtitle="Loading your availability..."
      >
        <div className="mx-auto max-w-6xl rounded-[28px] border border-black/10 bg-white p-8">
          Loading availability...
        </div>
      </WebShell>
    );
  }

  if (
    !barberId ||
    !barber ||
    !availability
  ) {
    return (
      <WebShell
        title="Availability"
        subtitle="Your barber account is not linked to a staff profile yet."
      >
        <div className="mx-auto max-w-4xl rounded-[28px] border border-black/10 bg-white p-8">
          <h2 className="text-2xl font-black">
            Barber profile not linked
          </h2>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell
      title="Availability"
      subtitle={`Working hours for ${barber.name}.`}
    >
      <div className="mx-auto max-w-6xl">
        <PortalNav />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
              Weekly hours
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Your working schedule
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              These barber-specific hours are used by the booking availability logic.
            </p>

            <div className="mt-6 grid gap-3">
              {(
                Object.keys(
                  DAY_LABEL
                ) as DayName[]
              ).map(
                (
                  day
                ) => {
                  const rule =
                    availability.week[
                      day
                    ];

                  const breakOn =
                    Boolean(
                      rule.breakStart &&
                        rule.breakEnd
                    );

                  return (
                    <div
                      key={
                        day
                      }
                      className="rounded-[22px] border border-black/10 bg-neutral-50 p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black">
                            {
                              DAY_LABEL[
                                day
                              ]
                            }
                          </h3>

                          <p className="mt-1 text-xs font-black uppercase tracking-wide text-neutral-400">
                            {rule.enabled
                              ? "Open"
                              : "Closed"}
                          </p>
                        </div>

                        <label className="flex items-center gap-2 text-sm font-bold">
                          <input
                            type="checkbox"
                            checked={
                              rule.enabled
                            }
                            onChange={(
                              event
                            ) =>
                              setDay(
                                day,
                                {
                                  enabled:
                                    event
                                      .target
                                      .checked,
                                }
                              )
                            }
                          />

                          Enabled
                        </label>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <TimeField
                          label="Start"
                          disabled={
                            !rule.enabled
                          }
                          value={
                            rule.start
                          }
                          onChange={(
                            value
                          ) =>
                            setDay(
                              day,
                              {
                                start:
                                  value,
                              }
                            )
                          }
                        />

                        <TimeField
                          label="End"
                          disabled={
                            !rule.enabled
                          }
                          value={
                            rule.end
                          }
                          onChange={(
                            value
                          ) =>
                            setDay(
                              day,
                              {
                                end:
                                  value,
                              }
                            )
                          }
                        />
                      </div>

                      <div className="mt-4 rounded-[18px] border border-black/5 bg-white p-4">
                        <label className="flex items-center gap-2 text-sm font-bold">
                          <input
                            type="checkbox"
                            disabled={
                              !rule.enabled
                            }
                            checked={
                              breakOn
                            }
                            onChange={(
                              event
                            ) =>
                              toggleBreak(
                                day,
                                event
                                  .target
                                  .checked
                              )
                            }
                          />

                          Add break
                        </label>

                        {breakOn ? (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <TimeField
                              label="Break start"
                              disabled={
                                !rule.enabled
                              }
                              value={
                                rule.breakStart ??
                                "13:00"
                              }
                              onChange={(
                                value
                              ) =>
                                setDay(
                                  day,
                                  {
                                    breakStart:
                                      value,
                                  }
                                )
                              }
                            />

                            <TimeField
                              label="Break end"
                              disabled={
                                !rule.enabled
                              }
                              value={
                                rule.breakEnd ??
                                "13:30"
                              }
                              onChange={(
                                value
                              ) =>
                                setDay(
                                  day,
                                  {
                                    breakEnd:
                                      value,
                                  }
                                )
                              }
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>

          <aside className="h-fit rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
              Time off
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Holidays & leave
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Add dates when customers should not be able to book you.
            </p>

            <div className="mt-5 grid gap-2">
              <input
                type="date"
                value={
                  newDate
                }
                onChange={(
                  event
                ) =>
                  setNewDate(
                    event.target
                      .value
                  )
                }
                className="h-11 rounded-2xl border border-black/10 bg-neutral-50 px-4"
              />

              <button
                type="button"
                onClick={
                  addTimeOff
                }
                className="rounded-full bg-[#ff355d] px-5 py-3 text-sm font-black text-white"
              >
                Add time off
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {availability
                .timeOffDates
                .slice()
                .sort(
                  (
                    first,
                    second
                  ) =>
                    second.localeCompare(
                      first
                    )
                )
                .map(
                  (
                    date
                  ) => (
                    <div
                      key={
                        date
                      }
                      className="flex items-center justify-between gap-3 rounded-[18px] bg-neutral-50 p-4"
                    >
                      <span className="font-black">
                        {
                          date
                        }
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeTimeOff(
                            date
                          )
                        }
                        className="text-xs font-black text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}

              {availability
                .timeOffDates
                .length ===
              0 ? (
                <p className="rounded-[18px] bg-neutral-50 p-4 text-sm text-neutral-500">
                  No time off added.
                </p>
              ) : null}
            </div>

            <p className="mt-5 border-t border-black/10 pt-4 text-xs text-neutral-400">
              Last saved:{" "}
              {new Date(
                availability.updatedAt ??
                  Date.now()
              ).toLocaleString()}
            </p>
          </aside>
        </div>
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
      <Nav href="/portal/barber/schedule">
        Schedule
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

function TimeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-wide text-neutral-400">
        {label}
      </span>

      <input
        type="time"
        value={value}
        disabled={disabled}
        onChange={(
          event
        ) =>
          onChange(
            event.target
              .value
          )
        }
        className="h-11 rounded-2xl border border-black/10 bg-white px-4 disabled:opacity-40"
      />
    </label>
  );
}
