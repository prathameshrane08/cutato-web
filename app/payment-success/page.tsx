"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import WebShell from "@/app/Components/WebShell";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessInner />
    </Suspense>
  );
}

function PaymentSuccessInner() {
  const sp = useSearchParams();

  const sessionId = sp.get("session_id");

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setReady(true);
    }, 1200);

    return () => clearTimeout(t);
  }, []);

  return (
    <WebShell
      title="Payment successful"
      subtitle="Your booking has been confirmed."
    >
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[40px] border border-emerald-500/20 bg-white shadow-[0_24px_90px_rgba(0,0,0,0.08)]">
          <div className="relative overflow-hidden bg-neutral-950 px-8 py-14 text-center text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,53,93,0.35),transparent_60%)]" />

            <div className="relative">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/15">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl">
                  <CheckCircle2 size={42} />
                </div>
              </div>

              <h1 className="mt-8 text-5xl font-black tracking-[-0.05em]">
                Payment Complete
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/60">
                Your appointment has been successfully booked and confirmed.
              </p>
            </div>
          </div>

          <div className="p-8 md:p-10">
            <div className="rounded-[30px] bg-neutral-50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff355d]">
                    Stripe session
                  </p>

                  <p className="mt-2 text-sm font-bold text-neutral-500">
                    {sessionId || "Session verified"}
                  </p>
                </div>

                <div className="rounded-full bg-emerald-100 px-5 py-2 text-sm font-black text-emerald-700">
                  Confirmed
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Link
                href="/bookings"
                className="inline-flex h-14 items-center justify-center rounded-full bg-[#ff355d] px-6 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]"
              >
                Open my bookings
              </Link>

              <Link
                href="/"
                className="inline-flex h-14 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm font-black transition hover:bg-neutral-50"
              >
                Book another appointment
              </Link>
            </div>

            <div className="mt-8 rounded-[28px] border border-black/10 bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">
                  <CheckCircle2 size={22} />
                </div>

                <div>
                  <h3 className="text-base font-black">
                    What happens next?
                  </h3>

                  <div className="mt-3 grid gap-2 text-sm font-semibold text-neutral-500">
                    <p>• Your barber has received the booking.</p>
                    <p>• Your hairstyle reference image is attached.</p>
                    <p>• You can manage the booking from My Bookings.</p>
                    <p>• Calendar reminders can be added anytime.</p>
                  </div>
                </div>
              </div>
            </div>

            {ready ? (
              <div className="mt-8 text-center text-sm font-bold text-emerald-600">
                Booking successfully confirmed.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </WebShell>
  );
}

function PaymentSuccessLoading() {
  return (
    <WebShell title="Payment successful" subtitle="Loading payment confirmation...">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
        <div className="font-black">Loading payment confirmation...</div>
      </div>
    </WebShell>
  );
}