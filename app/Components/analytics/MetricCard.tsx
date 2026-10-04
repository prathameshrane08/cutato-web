"use client";

import type { ReactNode } from "react";

export default function MetricCard({
  label,
  value,
  helper,
  icon,
  trend,
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
  trend?: { value: number; label?: string };
}) {
  const trendText =
    trend && trend.value !== 0 ? `${trend.value > 0 ? "+" : ""}${trend.value.toFixed(1)}%` : "0.0%";

  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-neutral-400">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-neutral-950">{value}</p>
        </div>

        {icon ? (
          <div className="inline-flex rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">{icon}</div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {trend ? (
          <span
            className={`rounded-full px-2.5 py-1 font-black ${
              trend.value > 0
                ? "bg-emerald-50 text-emerald-700"
                : trend.value < 0
                  ? "bg-red-50 text-red-700"
                  : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {trendText}
          </span>
        ) : null}

        {trend?.label ? (
          <span className="font-bold text-neutral-400">{trend.label}</span>
        ) : helper ? (
          <span className="font-bold text-neutral-400">{helper}</span>
        ) : null}
      </div>
    </div>
  );
}
