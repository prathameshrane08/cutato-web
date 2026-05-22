"use client";

import { useState } from "react";
import {
  Mail,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
} from "lucide-react";

import WebShell from "@/app/Components/WebShell";

export default function BarberApplyPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [experience, setExperience] = useState("");
  const [instagram, setInstagram] = useState("");

  async function submit() {
    try {
      setLoading(true);

      const res = await fetch("/api/applications/barber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
          email,
          phone,
          city,
          experience,
          instagram,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Application failed");
        return;
      }

      setDone(true);
    } catch (err: any) {
      alert(err?.message || "Application failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <WebShell
        title="Application submitted"
        subtitle="We’ll review your barber application shortly."
      >
        <div className="mx-auto max-w-3xl rounded-[34px] border border-black/10 bg-white p-10 shadow-sm">
          <div className="inline-flex rounded-full bg-[#ff355d]/10 p-4 text-[#ff355d]">
            <Sparkles />
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-[-0.04em]">
            Application received
          </h1>

          <p className="mt-4 text-lg leading-8 text-neutral-500">
            Your barber application has been sent to the Cutato team.
            Once approved, you’ll receive access to the barber portal.
          </p>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell
      title="Become a Cutato Barber"
      subtitle="Apply to join the Cutato barber network."
    >
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/80">
              <Scissors size={15} />
              Barber partner application
            </div>

            <h2 className="mt-8 text-5xl font-black leading-[0.95] tracking-[-0.05em]">
              Grow your barber business with Cutato.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/60">
              Get discovered by customers, manage bookings, receive payments,
              and build your digital barber brand.
            </p>

            <div className="mt-10 grid gap-3">
              <Feature text="AI hairstyle powered booking system" />
              <Feature text="Online payments with Stripe" />
              <Feature text="Professional barber dashboard" />
              <Feature text="Customer management and analytics" />
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.07)] md:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
              barber application
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
              Apply as barber
            </h1>

            <p className="mt-3 text-sm text-neutral-500">
              Our team reviews every barber before approval.
            </p>
          </div>

          <div className="mt-8 grid gap-5">
            <Input
              icon={<Scissors size={18} />}
              placeholder="Full name"
              value={name}
              onChange={setName}
            />

            <Input
              icon={<Mail size={18} />}
              placeholder="Email address"
              value={email}
              onChange={setEmail}
            />

            <Input
              icon={<Phone size={18} />}
              placeholder="Phone number"
              value={phone}
              onChange={setPhone}
            />

            <Input
              icon={<MapPin size={18} />}
              placeholder="City"
              value={city}
              onChange={setCity}
            />

            <Input
              icon={<Sparkles size={18} />}
              placeholder="Years of experience"
              value={experience}
              onChange={setExperience}
            />

            <Input
              icon={<Sparkles size={18} />}
              placeholder="Instagram profile"
              value={instagram}
              onChange={setInstagram}
            />

            <button
              disabled={loading || !name || !email}
              onClick={submit}
              className="inline-flex h-14 items-center justify-center rounded-full bg-[#ff355d] px-6 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c] disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit application"}
            </button>
          </div>
        </section>
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

function Feature({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 text-sm font-bold text-white/80">
      {text}
    </div>
  );
}