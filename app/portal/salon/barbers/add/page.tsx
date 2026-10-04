"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, MapPin, Scissors, Sparkles } from "lucide-react";

import PortalShell from "@/app/Components/portal/PortalShell";
import { createClient } from "@/app/lib/supabase/client";
import { toast } from "@/app/lib/toast";

export default function AddBarberPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [tagline, setTagline] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter the barber name.");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter the barber email.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Please login again.");
        router.push("/login");
        return;
      }

      const res = await fetch("/api/salon/barbers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          area: area.trim(),
          address: address.trim(),
          speciality: speciality.trim(),
          tagline: tagline.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Could not add barber.");
        return;
      }

      if (data.emailSent) {
        toast.success(`${data.name} was added. Login details were emailed to ${data.email}.`);
      } else {
        toast.info(
          `${data.name} was added, but the login email could not be sent. Ask them to use "Forgot password" on the login page.`
        );
      }

      router.push("/portal/salon/staff");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PortalShell
      role="salon"
      title="Add barber"
      subtitle="Create a barber profile and CUTATO login for your salon"
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
              New salon barber
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Create barber account</h1>

            <p className="mt-3 leading-7 text-neutral-500">
              CUTATO will create the barber profile, connect it to your salon, and create a personal
              barber login automatically.
            </p>

            <div className="mt-5 rounded-[24px] border border-[#ff355d]/15 bg-[#ff355d]/5 p-5">
              <p className="text-sm font-black text-[#ff355d]">
                Personal barber workspace included
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                The barber gets their own login, dashboard, bookings, availability, services,
                schedule and earnings analytics. They stay linked to your salon and will not appear
                as an independent barber.
              </p>
            </div>
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
              placeholder="Barber login email"
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
            {loading ? "Creating barber account..." : "Add barber + create login"}
          </button>
        </form>
      </div>
    </PortalShell>
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
