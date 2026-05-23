"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Scissors,
  Sparkles,
} from "lucide-react";

import WebShell from "@/app/Components/WebShell";
import { createClient } from "@/app/lib/supabase/client";

export default function AddBarberPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [tagline, setTagline] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login again.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("salon_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.salon_id) {
        alert("Salon profile not found.");
        return;
      }

      const res = await fetch("/api/salon/barbers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          area,
          address,
          speciality,
          tagline,
          salonId: profile.salon_id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Could not add barber");
        return;
      }

      alert("Barber added successfully!");

      router.push("/portal/salon/staff");
    } catch (err: any) {
      alert(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebShell
      title="Add barber"
      subtitle="Create a barber profile for your salon"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link
            href="/portal/salon/staff"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50"
          >
            <ArrowLeft size={16} />
            Back to staff
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[36px] border border-black/10 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="mb-8">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
              New barber
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">
              Create barber profile
            </h1>

            <p className="mt-3 text-neutral-500">
              Add barbers to your salon team and manage them centrally.
            </p>
          </div>

          <div className="grid gap-5">
            <Input
              icon={<Scissors size={18} />}
              placeholder="Barber name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              icon={<Mail size={18} />}
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              icon={<MapPin size={18} />}
              placeholder="Area / city"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
            />

            <Input
              icon={<MapPin size={18} />}
              placeholder="Full address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />

            <Input
              icon={<Sparkles size={18} />}
              placeholder="Speciality (Fade, Beard, Styling...)"
              value={speciality}
              onChange={(e) => setSpeciality(e.target.value)}
            />

            <Input
              icon={<Sparkles size={18} />}
              placeholder="Tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-full bg-[#ff355d] px-6 py-4 text-lg font-black text-white shadow-lg shadow-[#ff355d]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Adding..." : "Add barber"}
          </button>
        </form>
      </div>
    </WebShell>
  );
}

function Input({
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[24px] border border-black/10 bg-neutral-50 px-5 py-4">
      <div className="text-neutral-400">{icon}</div>

      <input
        {...props}
        className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-neutral-400"
      />
    </div>
  );
}