"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { StatusPoint } from "@/app/lib/analytics/types";

const COLORS = ["#ff355d", "#171717", "#10b981", "#f59e0b", "#94a3b8"];

export default function BookingStatusChart({ data }: { data: StatusPoint[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff355d]">Operations</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Booking status</h2>

      <div className="relative mt-4 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={72}
              outerRadius={100}
              paddingAngle={3}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-black">{total}</p>
            <p className="text-xs font-bold text-neutral-400">bookings</p>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="font-bold text-neutral-600">{item.name}</span>
            </div>
            <span className="font-black">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
