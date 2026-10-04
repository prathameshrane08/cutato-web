"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

import { useRouter } from "next/navigation";

import WebShell from "@/app/Components/WebShell";
import { createClient } from "@/app/lib/supabase/client";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function AdminLoginPage() {
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allowedAdminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@cutato.com")
    .trim()
    .toLowerCase();

  useEffect(() => {
    let cancelled = false;

    async function checkExistingAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!cancelled && user?.email?.trim().toLowerCase() === allowedAdminEmail) {
        router.replace("/admin/applications");
      }
    }

    void checkExistingAdmin();

    return () => {
      cancelled = true;
    };
  }, [allowedAdminEmail, router, supabase]);

  const canSubmit = isEmail(email) && password.length >= 6 && !loading;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    setErrorMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== allowedAdminEmail) {
      setErrorMessage("This email is not authorized for Cutato administration.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data.user?.email || data.user.email.trim().toLowerCase() !== allowedAdminEmail) {
        await supabase.auth.signOut();

        setErrorMessage("This account is not authorized for Cutato administration.");
        return;
      }

      router.replace("/admin/applications");

      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Admin login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebShell title="Administration" subtitle="Secure access to Cutato application management.">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-100px] top-[-100px] h-72 w-72 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative">
            <div className="inline-flex rounded-2xl bg-[#ff355d] p-4">
              <ShieldCheck size={24} />
            </div>

            <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-[#ff355d]">
              Cutato Admin
            </p>

            <h1 className="mt-3 text-5xl font-black leading-[0.95] tracking-[-0.05em]">
              Platform management.
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
              Review barber and salon applications, approve new accounts and manage onboarding.
            </p>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-black uppercase tracking-wide text-white/35">
                Authorized administrator
              </p>

              <p className="mt-2 break-all font-black">{allowedAdminEmail}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.07)] md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
            Admin login
          </p>

          <h2 className="mt-3 text-4xl font-black tracking-[-0.05em]">Applications</h2>

          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Sign in with the dedicated administrator account.
          </p>

          <form onSubmit={onSubmit} className="mt-8 grid gap-5">
            <div className="grid gap-2">
              <label className="text-sm font-black">Admin email</label>

              <div className="flex h-14 items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-4 focus-within:border-[#ff355d] focus-within:bg-white">
                <Mail size={18} className="text-neutral-400" />

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={allowedAdminEmail}
                  autoComplete="email"
                  className="h-full flex-1 bg-transparent text-sm font-semibold outline-none"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-black">Password</label>

              <div className="relative">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-14 w-full rounded-2xl border border-black/10 bg-neutral-50 px-5 pr-14 text-sm font-semibold outline-none transition focus:border-[#ff355d] focus:bg-white"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-neutral-500 shadow-sm transition hover:text-[#ff355d]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {errorMessage ? (
              <div className="rounded-2xl border border-[#ff355d]/25 bg-[#ff355d]/10 p-4 text-sm font-bold text-[#ff355d]">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#ff355d] px-6 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:-translate-y-0.5 hover:bg-[#ff1f4c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Lock size={17} />

              {loading ? "Signing in..." : "Open Applications"}
            </button>
          </form>

          <div className="mt-6 border-t border-black/10 pt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-black text-neutral-500 transition hover:text-[#ff355d]"
            >
              ← Back to normal login
            </Link>
          </div>
        </section>
      </div>
    </WebShell>
  );
}
