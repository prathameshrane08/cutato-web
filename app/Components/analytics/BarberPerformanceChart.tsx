"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { BarberPoint } from "@/app/lib/analytics/types";

function euro(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function BarberPerformanceChart({ data }: { data: BarberPoint[] }) {
  return (
    <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff355d]">Team</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Revenue by barber</h2>
      <p className="mt-1 text-sm text-neutral-500">Compare staff performance.</p>

      <div className="mt-6 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickFormatter={(value) => euro(Number(value))}
              tickLine={false}
              axisLine={false}
              width={68}
              fontSize={12}
            />
            <Tooltip formatter={(value) => [euro(Number(value ?? 0)), "Revenue"]} />
            <Bar dataKey="revenue" fill="#171717" radius={[10, 10, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
