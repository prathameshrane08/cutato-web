"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RevenuePoint } from "@/app/lib/analytics/types";

function euro(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RevenueTrendChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff355d]">Performance</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Revenue trend</h2>
      <p className="mt-1 text-sm text-neutral-500">Revenue across the selected period.</p>

      <div className="mt-6 h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cutatoRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff355d" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#ff355d" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickFormatter={(value) => euro(Number(value))}
              tickLine={false}
              axisLine={false}
              width={70}
              fontSize={12}
            />
            <Tooltip
              formatter={(value) => [euro(Number(value ?? 0)), "Revenue"]}
              contentStyle={{
                borderRadius: 18,
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 18px 50px rgba(0,0,0,0.08)",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#ff355d"
              strokeWidth={3}
              fill="url(#cutatoRevenueFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
