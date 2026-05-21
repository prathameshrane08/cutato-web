"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WebShell from "@/app/Components/WebShell";
import { getBestActiveBarberFromSupabase } from "@/app/lib/barbersSupabase";
import { getBestServiceForBarberFromSupabase } from "@/app/lib/servicesStore";

export default function BookAIPage() {
  return (
    <Suspense fallback={<LoadingAI />}>
      <BookAIInner />
    </Suspense>
  );
}

function BookAIInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const service = sp.get("service") || "haircut";

  useEffect(() => {
    async function redirectToBooking() {
      try {
        const barber = await getBestActiveBarberFromSupabase();

        if (!barber?.id) {
          router.replace("/");
          return;
        }

        const matchedService = await getBestServiceForBarberFromSupabase(
          barber.id,
          service
        );

        const qs = new URLSearchParams({
          barberId: barber.id,
        });

        if (matchedService?.id) {
          qs.set("serviceId", matchedService.id);
        }

        router.replace(`/book?${qs.toString()}`);
      } catch (err) {
        console.error("AI booking redirect failed:", err);
        router.replace("/");
      }
    }

    redirectToBooking();
  }, [router, service]);

  return <LoadingAI />;
}

function LoadingAI() {
  return (
    <WebShell title="AI booking" subtitle="Finding the best barber and service...">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
        <div className="font-black">Preparing your AI booking...</div>
      </div>
    </WebShell>
  );
}