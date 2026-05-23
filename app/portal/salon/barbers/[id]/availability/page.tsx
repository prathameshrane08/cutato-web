"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import WebShell from "@/app/Components/WebShell";
import { createClient } from "@/app/lib/supabase/client";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BarberAvailabilityPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("barber_working_hours")
      .select("*")
      .eq("barber_id", id)
      .order("day_of_week");

    setRows(data || []);
    setLoading(false);
  }

  async function save(day: number) {
    const existing = rows.find((r) => r.day_of_week === day);

    const payload = {
      barber_id: id,
      day_of_week: day,
      start_time: existing?.start_time || "09:00",
      end_time: existing?.end_time || "18:00",
      break_start: existing?.break_start || null,
      break_end: existing?.break_end || null,
      active: existing?.active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("barber_working_hours")
      .upsert(payload, { onConflict: "barber_id,day_of_week" });

    if (error) {
      alert(error.message);
      return;
    }

    load();
  }

  function updateLocal(day: number, key: string, value: any) {
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
          barber_id: id,
          day_of_week: day,
          start_time: "09:00",
          end_time: "18:00",
          break_start: null,
          break_end: null,
          active: true,
          [key]: value,
        },
      ];
    });
  }

  useEffect(() => {
    load();
  }, [id]);

  return (
    <WebShell title="Barber availability" subtitle="Set weekly working hours.">
      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-[28px] bg-white p-8">Loading...</div>
        ) : (
          days.map((label, day) => {
            const row = rows.find((r) => r.day_of_week === day);

            return (
              <div
                key={day}
                className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm"
              >
                <div className="grid gap-4 md:grid-cols-[90px_1fr_1fr_1fr_1fr_auto_auto] md:items-center">
                  <div className="text-lg font-black">{label}</div>

                  <input
                    type="time"
                    value={row?.start_time?.slice(0, 5) || "09:00"}
                    onChange={(e) =>
                      updateLocal(day, "start_time", e.target.value)
                    }
                    className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 font-bold"
                  />

                  <input
                    type="time"
                    value={row?.end_time?.slice(0, 5) || "18:00"}
                    onChange={(e) =>
                      updateLocal(day, "end_time", e.target.value)
                    }
                    className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 font-bold"
                  />

                  <input
                    type="time"
                    value={row?.break_start?.slice(0, 5) || ""}
                    onChange={(e) =>
                      updateLocal(day, "break_start", e.target.value || null)
                    }
                    className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 font-bold"
                  />

                  <input
                    type="time"
                    value={row?.break_end?.slice(0, 5) || ""}
                    onChange={(e) =>
                      updateLocal(day, "break_end", e.target.value || null)
                    }
                    className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 font-bold"
                  />

                  <label className="flex items-center gap-2 text-sm font-black">
                    <input
                      type="checkbox"
                      checked={row?.active ?? true}
                      onChange={(e) =>
                        updateLocal(day, "active", e.target.checked)
                      }
                      className="h-4 w-4 accent-[#ff355d]"
                    />
                    Active
                  </label>

                  <button
                    onClick={() => save(day)}
                    className="rounded-full bg-[#ff355d] px-5 py-3 text-sm font-black text-white"
                  >
                    Save
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