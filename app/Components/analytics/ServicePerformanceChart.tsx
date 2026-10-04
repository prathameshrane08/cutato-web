"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ServicePoint } from "@/app/lib/analytics/types";

export default function ServicePerformanceChart({ data }: { data: ServicePoint[] }) {
  return (
    <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff355d]">Services</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Top services</h2>
      <p className="mt-1 text-sm text-neutral-500">Most booked services in the selected period.</p>

      <div className="mt-6 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 18, right: 18 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.08)" />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <Tooltip />
            <Bar dataKey="bookings" fill="#ff355d" radius={[0, 10, 10, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
