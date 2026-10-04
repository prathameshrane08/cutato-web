"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { RevenuePoint } from "@/app/lib/analytics/types";

export default function BookingsTrendChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff355d]">Demand</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Booking volume</h2>
      <p className="mt-1 text-sm text-neutral-500">Appointment volume over time.</p>

      <div className="mt-6 h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip />
            <Bar dataKey="bookings" fill="#171717" radius={[10, 10, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
