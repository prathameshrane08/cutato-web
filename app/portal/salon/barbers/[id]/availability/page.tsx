"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import WebShell from "@/app/Components/WebShell";
import { createClient } from "@/app/lib/supabase/client";

const days = [
  { day: 0, label: "Sun" },
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
];

type WorkingHour = {
  id?: string;
  barber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  active: boolean;
};

export default function BarberAvailabilityPage() {
  const params = useParams<{ id: string }>();
  const barberId = params.id;
  const supabase = createClient();

  const [rows, setRows] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);

  async function load() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("barber_working_hours")
        .select("*")
        .eq("barber_id", barberId)
        .order("day_of_week");

      if (error) {
        alert(error.message);
        return;
      }

      setRows(data || []);
    } finally {
      setLoading(false);
    }
  }

  function getRow(day: number): WorkingHour {
    return (
      rows.find((r) => r.day_of_week === day) || {
        barber_id: barberId,
        day_of_week: day,
        start_time: "09:00",
        end_time: "18:00",
        break_start: null,
        break_end: null,
        active: true,
      }
    );
  }

  function updateLocal(day: number, key: keyof WorkingHour, value: any) {
    setRows((prev) => {
      const existing = prev.find((r) => r.day_of_week === day);

      if (existing) {
        return prev.map((r) =>
          r.day_of_week === day ? { ...r, [key]: value } : r
        );
      }

      return [
        ...prev,
        {
          barber_id: barberId,
          day_of_week: day,
          start_time: "09:00",
          end_time: "18:00",
          break_start: null,
          break_end: null,
          active: true,
          [key]: value,
        } as WorkingHour,
      ];
    });
  }

  async function save(day: number) {
    try {
      setSavingDay(day);

      const row = getRow(day);

      const res = await fetch("/api/salon/barbers/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barberId,
          dayOfWeek: day,
          startTime: row.start_time?.slice(0, 5) || "09:00",
          endTime: row.end_time?.slice(0, 5) || "18:00",
          breakStart: row.break_start ? row.break_start.slice(0, 5) : null,
          breakEnd: row.break_end ? row.break_end.slice(0, 5) : null,
          active: row.active,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Could not save availability");
        return;
      }

      await load();
    } catch (err: any) {
      alert(err?.message || "Could not save availability");
    } finally {
      setSavingDay(null);
    }
  }

  useEffect(() => {
    if (barberId) load();
  }, [barberId]);

  return (
    <WebShell title="Barber availability" subtitle="Set weekly working hours.">
      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-[28px] bg-white p-8">Loading...</div>
        ) : (
          days.map(({ day, label }) => {
            const row = getRow(day);

            return (
              <div
                key={day}
                className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm"
              >
                <div className="grid gap-4 md:grid-cols-[90px_1fr_1fr_1fr_1fr_auto_auto] md:items-center">
                  <div className="text-lg font-black">{label}</div>

                  <input
                    type="time"
                    value={row.start_time?.slice(0, 5) || "09:00"}
                    onChange={(e) =>
                      updateLocal(day, "start_time", e.target.value)
                    }
                    className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 font-bold"
                  />

                  <input
                    type="time"
                    value={row.end_time?.slice(0, 5) || "18:00"}
                    onChange={(e) =>
                      updateLocal(day, "end_time", e.target.value)
                    }
                    className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 font-bold"
                  />

                  <input
                    type="time"
                    value={row.break_start?.slice(0, 5) || ""}
                    onChange={(e) =>
                      updateLocal(day, "break_start", e.target.value || null)
                    }
                    className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 font-bold"
                  />

                  <input
                    type="time"
                    value={row.break_end?.slice(0, 5) || ""}
                    onChange={(e) =>
                      updateLocal(day, "break_end", e.target.value || null)
                    }
                    className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 font-bold"
                  />

                  <label className="flex items-center gap-2 text-sm font-black">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) =>
                        updateLocal(day, "active", e.target.checked)
                      }
                      className="h-4 w-4 accent-[#ff355d]"
                    />
                    Active
                  </label>

                  <button
                    onClick={() => save(day)}
                    disabled={savingDay === day}
                    className="rounded-full bg-[#ff355d] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    {savingDay === day ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </WebShell>
  );
}