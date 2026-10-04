"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { subscribeToasts, type ToastItem } from "@/app/lib/toast";

const DURATION_MS = 4500;

const toneStyles = {
  success: {
    icon: <CheckCircle2 size={18} className="text-emerald-500" />,
    ring: "border-emerald-200",
  },
  error: { icon: <XCircle size={18} className="text-[#ff355d]" />, ring: "border-red-200" },
  info: { icon: <Info size={18} className="text-neutral-500" />, ring: "border-black/10" },
} as const;

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts((item) => {
      setToasts((current) => [...current.slice(-3), item]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== item.id));
      }, DURATION_MS);
    });
  }, []);

  function dismiss(id: number) {
    setToasts((current) => current.filter((t) => t.id !== id));
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role={item.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-bold text-neutral-900 shadow-[0_16px_40px_rgba(0,0,0,0.12)] ${toneStyles[item.tone].ring}`}
        >
          <span className="mt-0.5 shrink-0">{toneStyles[item.tone].icon}</span>
          <p className="min-w-0 flex-1 whitespace-pre-line break-words leading-6">{item.message}</p>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
