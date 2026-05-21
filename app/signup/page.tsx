"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  CheckCircle2,
  Lock,
  Scissors,
  Sparkles,
  Star,
} from "lucide-react";
import { upsertProfile } from "@/app/lib/profilesSupabase";
import WebShell from "@/app/Components/WebShell";
import { getAuthUser, signIn } from "@/app/Components/auth";
import { signUpCustomer } from "@/app/lib/authSupabase";

function safeNext(next: string | null) {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  return next;
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = useMemo(() => safeNext(sp.get("next")), [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const u = getAuthUser?.();
    if (u?.email) router.replace(next);
  }, [router, next]);

  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError("");

  const em = email.trim().toLowerCase();

  if (!em) return setError("Please enter your email.");
  if (!password || password.length < 6) {
    return setError("Password must be at least 6 characters.");
  }

  try {
    setLoading(true);

    const { data, error } = await signUpCustomer(em, password);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.user?.email) {
      setError("Signup failed. No user returned.");
      return;
    }

    await upsertProfile({
      id: data.user.id,
      email: data.user.email,
      name: data.user.email.split("@")[0],
      role: "customer",
      barber_id: null,
    });

    signIn({
      email: data.user.email,
      role: "customer",
      name:
        data.user.user_metadata?.name ||
        data.user.email.split("@")[0] ||
        "Customer",
    });

    router.replace(next);
  } catch (err: any) {
    setError(err?.message ?? "Signup failed.");
  } finally {
    setLoading(false);
  }
}

  return (
    <WebShell title="Create account" subtitle="Join Cutato and book in seconds.">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />
          <div className="absolute bottom-[-120px] left-[-120px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex min-h-[470px] flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/80">
                <Sparkles size={15} />
                New customer account
              </div>

              <h2 className="mt-8 max-w-2xl text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
                Discover and book the best barbers near you.
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-white/60">
                Real availability, transparent pricing and easy booking in one
                smooth experience.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <MiniInfo icon={<Star size={17} />} title="4.8★" text="avg rating" />
              <MiniInfo icon={<CalendarCheck size={17} />} title="Instant" text="confirmation" />
              <MiniInfo icon={<Scissors size={17} />} title="Easy" text="reschedule" />
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.07)] md:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
              Customer signup
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
              Create your account
            </h1>

            <p className="mt-3 text-sm text-neutral-500">
              Already have an account?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(next)}`}
                className="font-black text-[#ff355d] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 grid gap-5">
            <div className="grid gap-2">
              <label className="text-sm font-black">Email</label>
              <input
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-14 rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-black">Password</label>
              <input
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="h-14 rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
              />
              <p className="text-xs font-bold text-neutral-400">
                Minimum 6 characters.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-neutral-500">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-[#ff355d]"
              />
              Remember me
            </label>

            {error ? (
              <div className="rounded-2xl border border-[#ff355d]/25 bg-[#ff355d]/10 p-4 text-sm font-bold text-[#ff355d]">
                {error}
              </div>
            ) : null}

            <button
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#ff355d] px-6 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:-translate-y-0.5 hover:bg-[#ff1f4c] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              disabled={loading}
              type="submit"
            >
              <Lock size={17} />
              {loading ? "Creating account..." : "Create account"}
            </button>

            <div className="rounded-[24px] bg-neutral-50 p-5">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 text-[#ff355d]" size={19} />
                <p className="text-sm leading-6 text-neutral-500">
                  By continuing, you agree to Cutato’s Terms and Privacy Policy.
                  This is currently a demo authentication flow.
                </p>
              </div>
            </div>
          </form>
        </section>
      </div>
    </WebShell>
  );
}

function SignupLoading() {
  return (
    <WebShell title="Create account" subtitle="Loading signup page...">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
        <div className="font-black">Loading signup page...</div>
      </div>
    </WebShell>
  );
}

function MiniInfo({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
      <div className="mb-3 inline-flex rounded-xl bg-[#ff355d] p-2 text-white">
        {icon}
      </div>
      <p className="font-black">{title}</p>
      <p className="mt-1 text-xs font-bold text-white/50">{text}</p>
    </div>
  );
}