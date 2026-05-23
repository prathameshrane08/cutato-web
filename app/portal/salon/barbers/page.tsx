"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Scissors, Star, MapPin } from "lucide-react";

import WebShell from "@/app/Components/WebShell";
import { createClient } from "@/app/lib/supabase/client";
import { getCurrentUser } from "@/app/lib/authSupabase";

type Barber = {
  id: string;

  name: string;
  area?: string;
  address?: string;

  rating?: number;
  reviews?: number;

  tagline?: string;
  image_url?: string;

  active?: boolean;
};

export default function SalonBarbersPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [barbers, setBarbers] = useState<Barber[]>([]);

  async function loadBarbers() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await getCurrentUser();

      if (!user) {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("salon_id")
        .eq("id", user.id)
        .single();

      if (!profile?.salon_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("salon_id", profile.salon_id)
        .order("created_at", {
          ascending: false,
        });

      if (!error && data) {
        setBarbers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBarbers();
  }, []);

  return (
    <WebShell
      title="Salon Barbers"
      subtitle="Manage your salon staff and barber profiles."
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-[-0.04em]">
            Your barbers
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            Manage all professionals working under your salon.
          </p>
        </div>

        <Link
          href="/portal/salon/barbers/add"
          className="inline-flex items-center gap-2 rounded-full bg-[#ff355d] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#ff355d]/20 transition hover:bg-[#ff1f4c]"
        >
          <Plus size={18} />
          Add barber
        </Link>
      </div>

      {loading ? (
        <div className="rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
          Loading barbers...
        </div>
      ) : barbers.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-black/10 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ff355d]/10 text-[#ff355d]">
            <Scissors size={28} />
          </div>

          <h3 className="mt-5 text-2xl font-black">
            No barbers yet
          </h3>

          <p className="mt-3 text-sm text-neutral-500">
            Start building your salon team by adding your first barber.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className="overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-sm"
            >
              <div className="relative h-56 bg-neutral-900">
                <img
                  src={
                    barber.image_url ||
                    `https://api.dicebear.com/7.x/notionists/svg?seed=${barber.name}`
                  }
                  alt={barber.name}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-black text-white">
                    {barber.name}
                  </h3>

                  {barber.tagline ? (
                    <p className="mt-1 text-sm text-white/70">
                      {barber.tagline}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <MapPin size={15} />
                  {barber.area || "Unknown"}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#ff355d]/10 px-3 py-2 text-sm font-black text-[#ff355d]">
                    <Star
                      size={14}
                      className="fill-[#ff355d]"
                    />
                    {Number(barber.rating || 0).toFixed(1)}
                  </div>

                  <div
                    className={`rounded-full px-3 py-2 text-xs font-black ${
                      barber.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {barber.active ? "Active" : "Inactive"}
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href={`/barbers/${barber.id}`}
                    className="inline-flex w-full items-center justify-center rounded-full border border-black/10 bg-neutral-50 px-5 py-3 text-sm font-black transition hover:bg-neutral-100"
                  >
                    View barber profile
                  </Link>
                  <Link
                    href={`/portal/salon/barbers/${barber.id}/availability`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#ff355d] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#ff355d]/20 transition hover:bg-[#ff1f4c]"
                  >
                    Set availability
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WebShell>
  );
}