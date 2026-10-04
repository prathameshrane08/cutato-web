"use client";

import type { AnalyticsRange } from "@/app/lib/analytics/types";

const OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "3 months" },
  { value: "year", label: "This year" },
];

export default function AnalyticsRangePicker({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (value: AnalyticsRange) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-full border border-black/10 bg-white p-1 shadow-sm">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-4 py-2 text-xs font-black transition ${
            value === option.value
              ? "bg-neutral-950 text-white"
              : "text-neutral-500 hover:text-neutral-950"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
