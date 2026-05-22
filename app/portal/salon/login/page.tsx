"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, Mail, Lock } from "lucide-react";

import WebShell from "@/app/Components/WebShell";

export default function SalonLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <WebShell
      title="Salon portal"
      subtitle="Login to manage your salon operations."
    >
      <div className="mx-auto max-w-md">
        <div className="rounded-[36px] border border-black/10 bg-white p-8 shadow-[0_20px_70px_rgba(0,0,0,0.07)]">
          <div className="inline-flex rounded-2xl bg-[#ff355d]/10 p-4 text-[#ff355d]">
            <Building2 />
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-[-0.05em]">
            Salon login
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Access your salon dashboard, staff management and analytics.
          </p>

          <div className="mt-8 grid gap-5">
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-5">
              <Mail size={18} className="text-neutral-400" />

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Business email"
                className="h-full w-full bg-transparent text-sm font-semibold outline-none"
              />
            </div>

            <div className="flex h-14 items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-5">
              <Lock size={18} className="text-neutral-400" />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-full w-full bg-transparent text-sm font-semibold outline-none"
              />
            </div>

            <button className="inline-flex h-14 items-center justify-center rounded-full bg-[#ff355d] px-6 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]">
              Login
            </button>

            <Link
              href="/portal/salon/apply"
              className="text-center text-sm font-bold text-[#ff355d]"
            >
              Register your salon
            </Link>
          </div>
        </div>
      </div>
    </WebShell>
  );
}