"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Scissors, Sparkles } from "lucide-react";

import WebShell from "@/app/Components/WebShell";
import { getAuthUser, signIn } from "@/app/Components/auth";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function BarberLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("abhi@cutato.com");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("demo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getAuthUser();
    if (!u) return;

    if (u.role === "barber") router.replace("/portal/barber");
    else if (u.role === "salon") router.replace("/portal/salon");
    else router.replace("/");
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!isEmail(normalizedEmail)) {
      setError("Enter a valid email.");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    const barberId = normalizedEmail.split("@")[0].toLowerCase();

    try {
      setLoading(true);

      const barber = await getBarberByIdFromSupabase(barberId);

if (!barber) {
  setError("No barber account found.");
  return;
}

signIn({
  name: name.trim() || barber.name,
  email: normalizedEmail,
  role: "barber",
  barberId: barber.id,
});

router.push("/portal/barber");
    } catch (err) {
      console.error("Barber login failed:", err);
      setError("Could not login as barber. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebShell
      title="Barber login"
      subtitle="Sign in to see your schedule, bookings, and earnings."
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/80">
              <Sparkles size={15} />
              Barber workspace
            </div>

            <h2 className="mt-8 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
              Manage your day from one dashboard.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/60">
              View bookings, check your schedule, track earnings, and manage
              your availability inside Cutato.
            </p>

            <div className="mt-10 rounded-[30px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-black">Demo barber login</p>
              <p className="mt-2 text-sm text-white/60">
                If your barber ID is <b>abhi</b>, login with:
                <br />
                <b>abhi@cutato.com</b>
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.07)] md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
            Barber portal
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
            Sign in as barber
          </h1>

          <form onSubmit={onSubmit} className="mt-8 grid gap-5">
            <div className="grid gap-2">
              <label className="text-sm font-black">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="abhi@cutato.com"
                className="h-14 rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-black">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional — auto-filled from Supabase"
                className="h-14 rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-black">Password</label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-14 w-full rounded-2xl border border-black/10 bg-neutral-50 px-5 pr-14 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-neutral-500 shadow-sm transition hover:text-[#ff355d]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-[#ff355d]/25 bg-[#ff355d]/10 p-4 text-sm font-bold text-[#ff355d]">
                {error}
              </div>
            ) : null}

            <button
              disabled={loading}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#ff355d] px-6 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:-translate-y-0.5 hover:bg-[#ff1f4c] disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
            >
              <Lock size={17} />
              {loading ? "Checking barber..." : "Login as barber"}
            </button>

            <div className="rounded-[24px] bg-neutral-50 p-5 text-sm leading-6 text-neutral-500">
              Login email must match a barber ID. Example: barber ID{" "}
              <b>abhi</b> → <b>abhi@cutato.com</b>.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/portal/salon/login"
                className="rounded-full border border-black/10 bg-white px-5 py-4 text-center text-sm font-black shadow-sm transition hover:bg-neutral-50"
              >
                Salon login
              </Link>

              <Link
                href="/login"
                className="rounded-full border border-black/10 bg-white px-5 py-4 text-center text-sm font-black shadow-sm transition hover:bg-neutral-50"
              >
                Customer login
              </Link>
            </div>
          </form>
        </section>
      </div>
    </WebShell>
  );
}