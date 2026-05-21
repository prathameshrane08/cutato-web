"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WebShell from "@/app/Components/WebShell";
import { updateCustomerPassword } from "@/app/lib/authSupabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await updateCustomerPassword(password);

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Password updated successfully.");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Could not update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <WebShell
      title="Create new password"
      subtitle="Choose a secure password for your account."
    >
      <div className="mx-auto max-w-md rounded-[34px] border border-black/10 bg-white p-8 shadow-sm">
        <form onSubmit={onSubmit} className="grid gap-5">
          <div>
            <label className="text-sm font-black">
              New password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none focus:border-[#ff355d] focus:bg-white"
            />
          </div>

          <div>
            <label className="text-sm font-black">
              Confirm password
            </label>

            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="mt-2 h-14 w-full rounded-2xl border border-black/10 bg-neutral-50 px-5 text-sm font-semibold outline-none focus:border-[#ff355d] focus:bg-white"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-[#ff355d]/25 bg-[#ff355d]/10 p-4 text-sm font-bold text-[#ff355d]">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              {success}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="h-14 rounded-full bg-[#ff355d] text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </WebShell>
  );
}