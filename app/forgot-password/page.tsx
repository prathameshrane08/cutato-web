"use client";

import { useState } from "react";
import Link from "next/link";
import WebShell from "@/app/Components/WebShell";
import { resetCustomerPassword } from "@/app/lib/authSupabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setError("");

    const em = email.trim().toLowerCase();

    if (!em) {
      setError("Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await resetCustomerPassword(em);

      if (error) {
        setError(error.message);
        return;
      }

      setStatus("Password reset link sent. Please check your email.");
    } catch (err: any) {
      setError(err?.message || "Could not send reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebShell title="Reset password" subtitle="Get a secure password reset link.">
      <div className="mx-auto max-w-md rounded-[34px] border border-black/10 bg-white p-8 shadow-sm">
        <form onSubmit={onSubmit} className="grid gap-5">
          <div>
            <label className="text-sm font-black">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none focus:border-[#ff355d] focus:bg-white"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-[#ff355d]/25 bg-[#ff355d]/10 p-4 text-sm font-bold text-[#ff355d]">
              {error}
            </div>
          ) : null}

          {status ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              {status}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="h-14 rounded-full bg-[#ff355d] text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <Link href="/login" className="text-center text-sm font-black text-[#ff355d]">
            Back to login
          </Link>
        </form>
      </div>
    </WebShell>
  );
}