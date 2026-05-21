"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { requireSalonAuth } from "@/app/portal/_lib/portalAuth";
import {
  readSalonAvailability,
  writeSalonAvailability,
  readAllBarberAvailability,
  type DayName,
  type DayRule,
  type SalonAvailability,
} from "@/app/lib/availabilityStore";
import { useCustomerBarbers } from "@/app/lib/barbersStore";

const DAY_LABEL: Record<DayName, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export default function Page() {
  const auth = requireSalonAuth();

  if (!auth.ok) {
    return <Denied role="salon" reason={auth.reason} />;
  }

  const { byId } = useCustomerBarbers();
  const [availability, setAvailability] = useState<SalonAvailability | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setAvailability(readSalonAvailability());
  }, [tick]);

  const barberAvailability = useMemo(() => readAllBarberAvailability(), [tick]);

  const barberSummaries = useMemo(() => {
    return barberAvailability
      .map((av) => {
        const barber = byId.get(av.barberId);
        const openDays = (Object.keys(av.week) as DayName[]).filter((d) => av.week[d].enabled).length;
        return {
          barberId: av.barberId,
          name: barber?.name ?? av.barberId,
          timeOffCount: av.timeOffDates.length,
          openDays,
          updatedAt: av.updatedAt,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [barberAvailability, byId]);

  function save(next: SalonAvailability) {
    writeSalonAvailability(next);
    setAvailability(readSalonAvailability());
  }

  function patchDay(day: DayName, patch: Partial<DayRule>) {
    if (!availability) return;
    save({
      ...availability,
      week: {
        ...availability.week,
        [day]: {
          ...availability.week[day],
          ...patch,
        },
      },
    });
  }

  function setSlotStep(slotStepMin: 30) {
    if (!availability) return;
    save({
      ...availability,
      slotStepMin,
    });
  }

  if (!availability) {
    return (
      <WebShell title="Availability" subtitle="Salon portal">
        <div className="mx-auto max-w-6xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 950 }}>Loading availability…</div>
          </div>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell title="Availability" subtitle="Salon portal — manage weekly working hours and slot settings.">
      <div className="mx-auto max-w-6xl" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/portal/salon" className="btn btn-secondary">
            ← Salon dashboard
          </Link>
          <Link href="/portal/salon/calendar" className="btn btn-secondary">
            Calendar
          </Link>
          <Link href="/portal/salon/bookings" className="btn btn-secondary">
            Bookings
          </Link>
          <Link href="/portal/salon/staff" className="btn btn-secondary">
            Staff
          </Link>
          <Link href="/portal/salon/settings" className="btn btn-secondary">
            Settings
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <StatCard
            label="Slot step"
            value={`${availability.slotStepMin} min`}
            sub="Used in customer booking slot generation"
          />
          <StatCard
            label="Open days"
            value={`${(Object.keys(availability.week) as DayName[]).filter((d) => availability.week[d].open).length}`}
            sub="Weekly salon opening days"
          />
          <StatCard
            label="Barber overrides"
            value={`${barberAvailability.length}`}
            sub="Barbers with personal availability settings"
          />
          <StatCard
            label="Last saved"
            value={new Date(availability.updatedAt ?? Date.now()).toLocaleDateString()}
            sub="Salon availability last update"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Weekly salon hours</div>
            <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
              These hours define when the salon is open. Final customer slots are generated from
              the overlap of salon hours and each barber’s own availability.
            </div>

            <div className="divider" style={{ margin: "14px 0" }} />

            <div style={{ display: "grid", gap: 10 }}>
              {(Object.keys(DAY_LABEL) as DayName[]).map((day) => {
                const rule = availability.week[day];

                return (
                  <div
                    key={day}
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: "rgba(0,0,0,0.02)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>
                        {DAY_LABEL[day]}
                        <span className="theme-muted" style={{ marginLeft: 10, fontWeight: 900, fontSize: 12 }}>
                          {rule.open ? "OPEN" : "CLOSED"}
                        </span>
                      </div>

                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={rule.open}
                          onChange={(e) => patchDay(day, { open: e.target.checked })}
                          style={{ width: 16, height: 16 }}
                        />
                        <span className="theme-muted" style={{ fontWeight: 900 }}>
                          Open
                        </span>
                      </label>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <Field label="Start">
                        <input
                          className="input"
                          type="time"
                          value={rule.start}
                          disabled={!rule.open}
                          onChange={(e) => patchDay(day, { start: e.target.value })}
                          style={inputStyle}
                        />
                      </Field>

                      <Field label="End">
                        <input
                          className="input"
                          type="time"
                          value={rule.end}
                          disabled={!rule.open}
                          onChange={(e) => patchDay(day, { end: e.target.value })}
                          style={inputStyle}
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 14, height: "fit-content" }}>
            <div className="theme-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Slot settings</div>
              <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
                Choose the step used to generate booking start times.
              </div>

              <div className="divider" style={{ margin: "14px 0" }} />

              <div style={{ display: "grid", gap: 10 }}>
                {[15, 30].map((step) => (
                  <button
                    key={step}
                    onClick={() => setSlotStep(step as 30)}
                    style={{
                      textAlign: "left",
                      padding: 14,
                      borderRadius: 16,
                      border:
                        availability.slotStepMin === step
                          ? "1px solid rgba(0,0,0,0.18)"
                          : "1px solid rgba(0,0,0,0.08)",
                      background:
                        availability.slotStepMin === step
                          ? "rgba(0,0,0,0.05)"
                          : "rgba(0,0,0,0.02)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{step} minutes</div>
                    <div className="theme-muted" style={{ marginTop: 4, fontSize: 12 }}>
                      {step === 15
                        ? "More granular booking starts"
                        : "Cleaner and simpler slot grid"}
                    </div>
                  </button>
                ))}
              </div>

              <div className="divider" style={{ margin: "14px 0" }} />

              <div className="theme-muted" style={{ fontSize: 12 }}>
                Saved: <b>{new Date(availability.updatedAt ?? Date.now()).toLocaleString()}</b>
              </div>
            </div>

            <div className="theme-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Barber availability summary</div>
              <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
                Each barber can still set personal working hours, breaks, and time off.
              </div>

              <div className="divider" style={{ margin: "14px 0" }} />

              {barberSummaries.length === 0 ? (
                <div className="theme-muted" style={{ fontSize: 13 }}>
                  No barber-specific availability saved yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {barberSummaries.map((b) => (
                    <div
                      key={b.barberId}
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(0,0,0,0.02)",
                      }}
                    >
                      <div style={{ fontWeight: 900 }}>{b.name}</div>
                      <div className="theme-muted" style={{ marginTop: 4, fontSize: 12 }}>
                        ID: {b.barberId}
                      </div>
                      <div className="theme-muted" style={{ marginTop: 4, fontSize: 12 }}>
                        Open days: {b.openDays} • Time off dates: {b.timeOffCount}
                      </div>
                      <div className="theme-muted" style={{ marginTop: 4, fontSize: 12 }}>
                        Updated: {b.updatedAt ? new Date(b.updatedAt).toLocaleString() : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </WebShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>{label}</div>
      {children}
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
    <div className="theme-card" style={{ padding: 16, borderRadius: 20 }}>
      <div className="theme-muted" style={{ fontSize: 13, fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ marginTop: 8, fontWeight: 950, fontSize: 24 }}>{value}</div>
      <div className="theme-muted" style={{ marginTop: 8, fontSize: 12 }}>
        {sub}
      </div>
    </div>
  );
}

function Denied({ role, reason }: { role: string; reason: string | null }) {
  return (
    <WebShell title="Access denied" subtitle="You do not have permission to open this page.">
      <div className="mx-auto max-w-4xl">
        <div className="theme-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            {reason === "not_logged_in" ? "Please log in" : "Wrong account type"}
          </div>
          <div className="theme-muted" style={{ marginTop: 8 }}>
            This page is only available for {role} accounts.
          </div>
        </div>
      </div>
    </WebShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "rgba(0,0,0,0.02)",
  outline: "none",
  fontWeight: 800,
};