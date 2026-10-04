"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Send,
  Store,
  User,
} from "lucide-react";

import WebShell from "@/app/Components/WebShell";

type SalonForm = {
  salonName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
};

const initialForm: SalonForm = {
  salonName: "",
  ownerName: "",
  email: "",
  phone: "",
  city: "",
  address: "",
};

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SalonApplicationPage() {
  const [form, setForm] = useState<SalonForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      form.salonName.trim().length >= 2 &&
      form.ownerName.trim().length >= 2 &&
      validEmail(form.email) &&
      !loading,
    [form, loading]
  );

  function update<K extends keyof SalonForm>(key: K, value: SalonForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (!form.salonName.trim()) {
      setErrorMessage("Please enter the salon name.");
      return;
    }

    if (!form.ownerName.trim()) {
      setErrorMessage("Please enter the owner name.");
      return;
    }

    if (!validEmail(form.email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/applications/salon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salonName: form.salonName.trim(),
          ownerName: form.ownerName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          city: form.city.trim() || undefined,
          address: form.address.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not submit application.");
      }

      setSubmitted(true);
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not submit application.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <WebShell title="Salon application" subtitle="Your application has been submitted.">
        <div className="mx-auto max-w-3xl rounded-[36px] border border-black/10 bg-white p-8 text-center shadow-sm md:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={30} />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[#ff355d]">
            Application received
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">
            Your salon application is under review.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-neutral-500">
            Once approved, CUTATO will create the salon account and send the temporary login
            credentials to the application email address.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white"
            >
              Back to home
            </Link>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-black"
            >
              Submit another
            </button>
          </div>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell title="For Salons" subtitle="Register your salon to join the CUTATO platform.">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative">
            <div className="inline-flex rounded-2xl bg-[#ff355d] p-4">
              <Store size={24} />
            </div>

            <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-[#ff355d]">
              Salon onboarding
            </p>

            <h2 className="mt-3 text-5xl font-black leading-[0.95] tracking-[-0.05em]">
              Run your salon on CUTATO.
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
              Apply once, get reviewed by CUTATO, then manage staff, services, availability,
              bookings and analytics from your salon workspace.
            </p>

            <div className="mt-8 grid gap-3">
              <InfoTile title="1. Register" text="Submit your salon and owner details." />
              <InfoTile title="2. Review" text="CUTATO admin reviews the application." />
              <InfoTile title="3. Workspace" text="Receive your salon login after approval." />
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.07)] md:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
                Application
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">Salon details</h1>
            </div>

            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-black"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
          </div>

          <form onSubmit={onSubmit} className="mt-8 grid gap-5">
            <Field label="Salon name" icon={<Building2 size={17} />} required>
              <input
                value={form.salonName}
                onChange={(event) => update("salonName", event.target.value)}
                placeholder="Salon name"
                className="form-input"
              />
            </Field>

            <Field label="Owner name" icon={<User size={17} />} required>
              <input
                value={form.ownerName}
                onChange={(event) => update("ownerName", event.target.value)}
                placeholder="Owner full name"
                className="form-input"
              />
            </Field>

            <Field label="Email" icon={<Mail size={17} />} required>
              <input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="salon@example.com"
                className="form-input"
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Phone" icon={<Phone size={17} />}>
                <input
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="+49..."
                  className="form-input"
                />
              </Field>

              <Field label="City" icon={<MapPin size={17} />}>
                <input
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                  placeholder="Dresden"
                  className="form-input"
                />
              </Field>
            </div>

            <Field label="Address" icon={<MapPin size={17} />}>
              <textarea
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
                placeholder="Street, number, postal code, city"
                rows={4}
                className="form-input min-h-[110px] resize-y py-4"
              />
            </Field>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#ff355d] px-6 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={17} />
              {loading ? "Submitting..." : "Submit salon application"}
            </button>
          </form>
        </section>
      </div>

      <style jsx global>{`
        .form-input {
          height: 56px;
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #fafafa;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 600;
          outline: none;
          transition: 0.2s ease;
        }

        .form-input:focus {
          border-color: #ff355d;
          background: white;
        }
      `}</style>
    </WebShell>
  );
}

function Field({
  label,
  icon,
  required,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label className="flex items-center gap-2 text-sm font-black">
        {icon}
        {label}
        {required ? <span className="text-[#ff355d]">*</span> : null}
      </label>

      {children}
    </div>
  );
}

function InfoTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-black">{title}</p>
      <p className="mt-1 text-xs leading-5 text-white/45">{text}</p>
    </div>
  );
}
