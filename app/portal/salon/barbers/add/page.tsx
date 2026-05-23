"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MapPin, Scissors, Sparkles } from "lucide-react";

import WebShell from "@/app/Components/WebShell";
import { createClient } from "@/app/lib/supabase/client";
import { getCurrentUser } from "@/app/lib/authSupabase";

export default function AddSalonBarberPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [tagline, setTagline] = useState("");

  async function submit() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await getCurrentUser();

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

      const { error } = await supabase.from("barbers").insert({
        name,
        email,
        area: area || "Unknown",
        address: address || area || "Unknown",
        speciality,
        tagline,
        dist_km: 0,
        rating: 5,
        reviews: 0,
        active: true,
        salon_id: profile.salon_id,
      });

      if (error) {
        alert(error.message);
        return;
      }

      router.push("/portal/salon/barbers");
    } catch (err: any) {
      alert(err?.message || "Could not add barber.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebShell title="Add barber" subtitle="Create a barber profile under your salon.">
      <div className="mx-auto max-w-2xl rounded-[36px] border border-black/10 bg-white p-8 shadow-sm">
        <div className="grid gap-5">
          <Input icon={<Scissors size={18} />} placeholder="Barber name" value={name} onChange={setName} />
          <Input icon={<Mail size={18} />} placeholder="Email" value={email} onChange={setEmail} />
          <Input icon={<MapPin size={18} />} placeholder="Area" value={area} onChange={setArea} />
          <Input icon={<MapPin size={18} />} placeholder="Address" value={address} onChange={setAddress} />
          <Input icon={<Sparkles size={18} />} placeholder="Speciality" value={speciality} onChange={setSpeciality} />
          <Input icon={<Sparkles size={18} />} placeholder="Tagline" value={tagline} onChange={setTagline} />

          <button
            onClick={submit}
            disabled={loading || !name}
            className="h-14 rounded-full bg-[#ff355d] text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add barber"}
          </button>
        </div>
      </div>
    </WebShell>
  );
}

function Input({
  icon,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex h-14 items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-5">
      <div className="text-neutral-400">{icon}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-sm font-semibold outline-none"
      />
    </div>
  );
}