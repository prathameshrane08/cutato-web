"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { requireSalonAuth } from "@/app/portal/_lib/portalAuth";
import {
  emptySalonAvailability,
  readSalonAvailabilityForSalon,
  writeSalonAvailabilityForSalon,
  type DayName,
  type DayRule,
  type SalonAvailability,
} from "@/app/lib/availabilityStore";

const DAYS: { key: DayName; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export default function SalonAvailabilityPage() {
  const auth = requireSalonAuth();

  if (!auth.ok) {
    return (
      <WebShell title="Access denied" subtitle="Salon account required.">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-black/10 bg-white p-8">
          This page is only available for salon accounts.
        </div>
      </WebShell>
    );
  }

  const salonId = auth.user.salonId ?? "";

  const [availability, setAvailability] =
    useState<SalonAvailability | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    if (!salonId) {
      setAvailability(null);
      setConfigured(false);
      return;
    }

    const saved = readSalonAvailabilityForSalon(salonId);

    if (saved) {
      setAvailability(saved);
      setConfigured(true);
    } else {
      setAvailability(emptySalonAvailability());
      setConfigured(false);
    }
  }, [salonId]);

  const openDays = useMemo(() => {
    if (!availability) return 0;

    return DAYS.filter(({ key }) => availability.week[key].open).length;
  }, [availability]);

  function patchDay(day: DayName, patch: Partial<DayRule>) {
    setAvailability((current) => {
      if (!current) return current;

      return {
        ...current,
        week: {
          ...current.week,
          [day]: {
            ...current.week[day],
            ...patch,
          },
        },
      };
    });
  }

  function useTypicalHours() {
    const next = emptySalonAvailability();

    for (const day of ["mon", "tue", "wed", "thu", "fri"] as DayName[]) {
      next.week[day] = {
        open: true,
        start: "09:00",
        end: "18:00",
      };
    }

    next.week.sat = {
      open: true,
      start: "10:00",
      end: "16:00",
    };

    setAvailability(next);
  }

  function save() {
    if (!salonId || !availability) {
      alert("Your account is not linked to a salon.");
      return;
    }

    writeSalonAvailabilityForSalon(salonId, availability);
    setAvailability(readSalonAvailabilityForSalon(salonId));
    setConfigured(true);

    alert("Salon availability saved.");
  }

  if (!availability) {
    return (
      <WebShell title="Availability" subtitle="Loading salon availability...">
        <div className="mx-auto max-w-6xl rounded-[28px] border border-black/10 bg-white p-8">
          Loading...
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell
      title="Availability"
      subtitle="Weekly opening hours for this salon only."
    >
      <div className="mx-auto max-w-6xl">
        <PortalNav />

        {!configured ? (
          <div className="mt-8 rounded-[30px] border border-[#ff355d]/20 bg-[#ff355d]/5 p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
              Not configured yet
            </p>
            <h2 className="mt-2 text-2xl font-black">
              This salon has no saved availability.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              A newly created salon now starts empty instead of inheriting the
              old demo schedule. Open the days you want, or use typical hours
              as a starting point.
            </p>

            <button
              type="button"
              onClick={useTypicalHours}
              className="mt-5 rounded-full bg-neutral-950 px-5 py-3 text-sm font-black text-white"
            >
              Use typical hours
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Slot step" value="30 min" />
          <StatCard label="Open days" value={String(openDays)} />
          <StatCard
            label="Last saved"
            value={
              availability.updatedAt
                ? new Date(availability.updatedAt).toLocaleDateString()
                : "Not yet"
            }
          />
        </div>

        <section className="mt-6 rounded-[32px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
              Weekly hours
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
              When is your salon open?
            </h1>
          </div>

          <div className="mt-8 grid gap-3">
            {DAYS.map(({ key, label }) => {
              const rule = availability.week[key];

              return (
                <div
                  key={key}
                  className="grid gap-4 rounded-[24px] border border-black/10 bg-neutral-50 p-5 md:grid-cols-[180px_1fr_1fr] md:items-center"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={rule.open}
                      onChange={(e) =>
                        patchDay(key, {
                          open: e.target.checked,
                        })
                      }
                    />

                    <div>
                      <p className="font-black">{label}</p>
                      <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                        {rule.open ? "Open" : "Closed"}
                      </p>
                    </div>
                  </div>

                  <label className="grid gap-1">
                    <span className="text-xs font-black uppercase text-neutral-400">
                      Start
                    </span>
                    <input
                      type="time"
                      disabled={!rule.open}
                      value={rule.start}
                      onChange={(e) =>
                        patchDay(key, {
                          start: e.target.value,
                        })
                      }
                      className="h-12 rounded-2xl border border-black/10 bg-white px-4 disabled:opacity-40"
                    />
                  </label>

                  <label className="grid gap-1">
                    <span className="text-xs font-black uppercase text-neutral-400">
                      End
                    </span>
                    <input
                      type="time"
                      disabled={!rule.open}
                      value={rule.end}
                      onChange={(e) =>
                        patchDay(key, {
                          end: e.target.value,
                        })
                      }
                      className="h-12 rounded-2xl border border-black/10 bg-white px-4 disabled:opacity-40"
                    />
                  </label>
                </div>
              );
            })}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white"
            >
              Save availability
            </button>

            <button
              type="button"
              onClick={() => setAvailability(emptySalonAvailability())}
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-black"
            >
              Close all days
            </button>
          </div>
        </section>
      </div>
    </WebShell>
  );
}

function PortalNav() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/portal/salon" className="btn btn-secondary">← Dashboard</Link>
      <Link href="/portal/salon/bookings" className="btn btn-secondary">Bookings</Link>
      <Link href="/portal/salon/staff" className="btn btn-secondary">Staff</Link>
      <Link href="/portal/salon/services" className="btn btn-secondary">Services</Link>
      <Link href="/portal/salon/settings" className="btn btn-secondary">Settings</Link>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
