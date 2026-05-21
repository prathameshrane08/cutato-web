"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { getAuthUser } from "@/app/Components/auth";
import { useCustomerBarbers } from "@/app/lib/barbersStore";
import {
  getBarberAvailability,
  upsertBarberAvailability,
  type BarberAvailability,
  type BarberDayRule,
  type DayName,
} from "@/app/lib/availabilityStore";
import { requireBarberAuth } from "@/app/portal/_lib/portalAuth";

const DAY_LABEL: Record<DayName, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function isValidYyyyMmDd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default function Page() {
  const auth = requireBarberAuth();

  if (!auth.ok) {
    return <Denied role="barber" reason={auth.reason} />;
  }

  const { byId } = useCustomerBarbers();
  const barberId = getAuthUser()?.barberId ?? "";
  const barber = barberId ? byId.get(barberId) ?? null : null;

  const [av, setAv] = useState<BarberAvailability | null>(null);
  const [newDate, setNewDate] = useState("");

  useEffect(() => {
    if (barberId) {
      setAv(getBarberAvailability(barberId));
    }
  }, [barberId]);

  function save(next: BarberAvailability) {
    const saved = upsertBarberAvailability(next);
    setAv(saved);
  }

  function setDay(day: DayName, patch: Partial<BarberDayRule>) {
    if (!av) return;

    save({
      ...av,
      week: {
        ...av.week,
        [day]: {
          ...av.week[day],
          ...patch,
        },
      },
    });
  }

  function toggleBreak(day: DayName, on: boolean) {
    if (!av) return;

    const current = av.week[day];
    if (!on) {
      setDay(day, { breakStart: undefined, breakEnd: undefined });
    } else {
      setDay(day, {
        breakStart: current.breakStart ?? "13:00",
        breakEnd: current.breakEnd ?? "13:30",
      });
    }
  }

  function addTimeOff() {
    if (!av) return;

    const d = newDate.trim();
    if (!isValidYyyyMmDd(d)) {
      alert("Enter date like 2026-02-01");
      return;
    }

    if (av.timeOffDates.includes(d)) {
      setNewDate("");
      return;
    }

    save({
      ...av,
      timeOffDates: [d, ...av.timeOffDates].slice(0, 100),
    });
    setNewDate("");
  }

  function removeTimeOff(d: string) {
    if (!av) return;

    save({
      ...av,
      timeOffDates: av.timeOffDates.filter((x) => x !== d),
    });
  }

  if (!barberId || !barber) {
    return (
      <WebShell title="Availability" subtitle="Your barber account is not linked to a staff profile yet.">
        <div className="mx-auto max-w-4xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Barber profile not linked</div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              Ask the salon owner to create your staff profile first.
            </div>
          </div>
        </div>
      </WebShell>
    );
  }

  if (!av) {
    return (
      <WebShell title="Availability" subtitle={`Barber portal — ${barber.name}`}>
        <div className="mx-auto max-w-6xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 950 }}>Loading availability…</div>
          </div>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell title="Availability" subtitle={`Barber portal — ${barber.name}`}>
      <div className="mx-auto max-w-6xl">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/portal/barber" className="btn btn-secondary" style={{ height: 42 }}>
              ← Dashboard
            </Link>
            <Link href="/portal/barber/schedule" className="btn btn-secondary" style={{ height: 42 }}>
              Schedule
            </Link>
            <Link href="/portal/barber/bookings" className="btn btn-primary" style={{ height: 42 }}>
              My bookings
            </Link>
            <Link href="/portal/barber/earnings" className="btn btn-secondary" style={{ height: 42 }}>
              Earnings
            </Link>
          </div>

          <div className="theme-muted" style={{ fontWeight: 900, alignSelf: "center" }}>
            Barber ID: <b>{barberId}</b>
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Weekly working hours</div>
            <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
              Shared with the customer booking flow through the main availability store.
            </div>

            <div style={{ height: 12 }} />

            <div style={{ display: "grid", gap: 12 }}>
              {(Object.keys(DAY_LABEL) as DayName[]).map((day) => {
                const r = av.week[day];
                const breakOn = Boolean(r.breakStart && r.breakEnd);

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
                          {r.enabled ? "OPEN" : "CLOSED"}
                        </span>
                      </div>

                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={r.enabled}
                          onChange={(e) => setDay(day, { enabled: e.target.checked })}
                          style={{ width: 16, height: 16 }}
                        />
                        <span className="theme-muted" style={{ fontWeight: 900 }}>
                          Enabled
                        </span>
                      </label>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <Field label="Start">
                        <input
                          className="input"
                          type="time"
                          value={r.start}
                          disabled={!r.enabled}
                          onChange={(e) => setDay(day, { start: e.target.value })}
                          style={{ height: 42, borderRadius: 14, padding: "0 12px" }}
                        />
                      </Field>

                      <Field label="End">
                        <input
                          className="input"
                          type="time"
                          value={r.end}
                          disabled={!r.enabled}
                          onChange={(e) => setDay(day, { end: e.target.value })}
                          style={{ height: 42, borderRadius: 14, padding: "0 12px" }}
                        />
                      </Field>

                      <div style={{ display: "grid", gap: 6 }}>
                        <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.8 }}>Break</div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={breakOn}
                              disabled={!r.enabled}
                              onChange={(e) => toggleBreak(day, e.target.checked)}
                              style={{ width: 16, height: 16 }}
                            />
                            <span className="theme-muted" style={{ fontWeight: 900 }}>
                              {breakOn ? "On" : "Off"}
                            </span>
                          </label>

                          {breakOn ? (
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <input
                                className="input"
                                type="time"
                                value={r.breakStart ?? "13:00"}
                                disabled={!r.enabled}
                                onChange={(e) => setDay(day, { breakStart: e.target.value })}
                                style={{ height: 42, borderRadius: 14, padding: "0 12px", width: 140 }}
                              />
                              <input
                                className="input"
                                type="time"
                                value={r.breakEnd ?? "13:30"}
                                disabled={!r.enabled}
                                onChange={(e) => setDay(day, { breakEnd: e.target.value })}
                                style={{ height: 42, borderRadius: 14, padding: "0 12px", width: 140 }}
                              />
                            </div>
                          ) : (
                            <div className="theme-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                              No break
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="theme-card" style={{ padding: 18, height: "fit-content" }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Time off</div>
            <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
              Add dates like holidays / sick leave.
            </div>

            <div style={{ height: 12 }} />

            <div style={{ display: "grid", gap: 10 }}>
              <input
                className="input"
                placeholder="YYYY-MM-DD (e.g., 2026-02-01)"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                style={{ height: 42, borderRadius: 14, padding: "0 14px" }}
              />
              <button className="btn btn-primary" onClick={addTimeOff}>
                Add date
              </button>
            </div>

            <div className="divider" style={{ margin: "14px 0" }} />

            {av.timeOffDates.length === 0 ? (
              <div className="theme-muted" style={{ fontSize: 13 }}>
                No time off added.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {av.timeOffDates
                  .slice()
                  .sort((a, b) => b.localeCompare(a))
                  .map((d) => (
                    <div
                      key={d}
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(0,0,0,0.02)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontWeight: 950 }}>{d}</div>
                      <button className="btn btn-secondary" onClick={() => removeTimeOff(d)}>
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            )}

            <div className="divider" style={{ margin: "14px 0" }} />

            <div className="theme-muted" style={{ fontSize: 12 }}>
              Saved: <b>{new Date(av.updatedAt ?? Date.now()).toLocaleString()}</b>
            </div>
          </div>
        </div>

        <div style={{ height: 16 }} />
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