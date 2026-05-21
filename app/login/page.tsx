"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
} from "lucide-react";

import { getProfileByUserId } from "@/app/lib/profilesSupabase";
import WebShell from "@/app/Components/WebShell";
import { getAuthUser, signIn } from "@/app/Components/auth";
import {
  sendPhoneOtp,
  signInCustomer,
  signInWithApple,
  signInWithGoogle,
  verifyPhoneOtp,
} from "@/app/lib/authSupabase";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [email, setEmail] = useState("customer@cutato.com");
  const [pw, setPw] = useState("demo1234");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getAuthUser();
    if (!u) return;

    if (u.role === "salon") router.replace("/portal/salon");
    else if (u.role === "barber") router.replace("/portal/barber");
    else router.replace("/");
  }, [router]);

  const emailOk = useMemo(() => isEmail(email), [email]);
  const pwOk = useMemo(() => pw.length >= 4, [pw]);
  const canSubmit = emailOk && pwOk && !loading;

  async function syncUserAndRedirect(userId: string, userEmail?: string | null) {
    const profile = await getProfileByUserId(userId);

    const finalEmail = userEmail || profile?.email || "phone-user@cutato.local";

    signIn({
      email: finalEmail,
      role: profile?.role || "customer",
      name: profile?.name || finalEmail.split("@")[0] || "Customer",
      barberId: profile?.barber_id || undefined,
    });

    router.push(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setStatus("");

    if (!emailOk) return setErr("Please enter a valid email.");
    if (!pwOk) return setErr("Password must be at least 4 characters.");

    try {
      setLoading(true);

      const { data, error } = await signInCustomer(email.trim().toLowerCase(), pw);

      if (error) {
        setErr(error.message);
        return;
      }

      if (!data.user?.id) {
        setErr("Login failed. No user returned.");
        return;
      }

      await syncUserAndRedirect(data.user.id, data.user.email);
    } catch (ex: any) {
      setErr(ex?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleLogin() {
    setErr(null);
    setStatus("");

    const { error } = await signInWithGoogle();

    if (error) {
      setErr(error.message);
    }
  }

  async function onAppleLogin() {
    setErr(null);
    setStatus("");

    const { error } = await signInWithApple();

    if (error) {
      setErr(error.message);
    }
  }

  async function onSendOtp() {
    setErr(null);
    setStatus("");

    if (!phone.trim()) {
      setErr("Enter phone number with country code, e.g. +4915123456789.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await sendPhoneOtp(phone.trim());

      if (error) {
        setErr(error.message);
        return;
      }

      setOtpSent(true);
      setStatus("OTP sent. Check your phone.");
    } catch (ex: any) {
      setErr(ex?.message || "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp() {
    setErr(null);
    setStatus("");

    if (!phone.trim() || !otp.trim()) {
      setErr("Enter phone number and OTP.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await verifyPhoneOtp(phone.trim(), otp.trim());

      if (error) {
        setErr(error.message);
        return;
      }

      if (!data.user?.id) {
        setErr("Phone login failed. No user returned.");
        return;
      }

      await syncUserAndRedirect(data.user.id, data.user.email);
    } catch (ex: any) {
      setErr(ex?.message || "Could not verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebShell title="Welcome back" subtitle="Sign in to manage your Cutato bookings.">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />
          <div className="absolute bottom-[-120px] left-[-120px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/80">
              <Sparkles size={15} />
              Premium barber booking
            </div>

            <h2 className="mt-8 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">
              Your next haircut is only one booking away.
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/60">
              Book appointments, manage your history, get directions and keep your grooming routine simple.
            </p>

            <div className="mt-10 grid gap-3">
              <Feature icon={<CalendarCheck size={18} />} text="Book and manage appointments" />
              <Feature icon={<Scissors size={18} />} text="Find trusted barbers nearby" />
              <Feature icon={<MapPin size={18} />} text="Open directions instantly" />
            </div>

            <div className="mt-10 rounded-[30px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-black text-white">Demo account</p>
              <p className="mt-2 text-sm text-white/60">
                Email: customer@cutato.com
                <br />
                Password: demo1234
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.07)] md:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
              Login
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">
              Sign in to Cutato
            </h1>

            <p className="mt-3 text-sm text-neutral-500">
              Don’t have an account?{" "}
              <Link
                className="font-black text-[#ff355d] hover:underline"
                href={`/signup?next=${encodeURIComponent(next)}`}
              >
                Create one
              </Link>
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onGoogleLogin}
              className="h-13 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50"
            >
              Continue with Google
            </button>

            <button
              type="button"
              onClick={onAppleLogin}
              className="h-13 rounded-2xl border border-black/10 bg-neutral-950 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-neutral-800"
            >
              Continue with Apple
            </button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/10" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              or email
            </span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <form onSubmit={onSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <label className="text-sm font-black">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-14 rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-black">Password</label>
              <div className="relative">
                <input
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="••••••••"
                  type={show ? "text" : "password"}
                  className="h-14 w-full rounded-2xl border border-black/10 bg-neutral-50 px-5 pr-14 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
                />

                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-neutral-500 shadow-sm transition hover:text-[#ff355d]"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-bold text-neutral-500">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-[#ff355d]"
                />
                Remember me
              </label>

              <Link
                className="text-sm font-black text-[#ff355d] hover:underline"
                href={`/forgot-password?email=${encodeURIComponent(email || "")}`}
              >
                Forgot password?
              </Link>
            </div>

            {err ? (
              <div className="rounded-2xl border border-[#ff355d]/25 bg-[#ff355d]/10 p-4 text-sm font-bold text-[#ff355d]">
                {err}
              </div>
            ) : null}

            {status ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                {status}
              </div>
            ) : null}

            <button
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#ff355d] px-6 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:-translate-y-0.5 hover:bg-[#ff1f4c] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              disabled={!canSubmit}
              type="submit"
            >
              <Lock size={17} />
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/10" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              or phone
            </span>
            <div className="h-px flex-1 bg-black/10" />
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-black">Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+4915123456789"
                className="h-14 rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
              />
            </div>

            {otpSent ? (
              <div className="grid gap-2">
                <label className="text-sm font-black">OTP code</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="h-14 rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={otpSent ? onVerifyOtp : onSendOtp}
              disabled={loading}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-6 text-sm font-black shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
            >
              <Phone size={17} />
              {otpSent ? "Verify OTP" : "Send OTP"}
            </button>
          </div>

          <div className="mt-6 rounded-[24px] bg-neutral-50 p-5 text-sm leading-6 text-neutral-500">
            Customer, barber, and salon accounts all sign in here. Social login accounts are treated as customer accounts unless a profile role is assigned by the salon.
          </div>
        </section>
      </div>
    </WebShell>
  );
}

function Feature({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
      <div className="rounded-xl bg-[#ff355d] p-2 text-white">{icon}</div>
      <p className="text-sm font-bold text-white/80">{text}</p>
    </div>
  );
}