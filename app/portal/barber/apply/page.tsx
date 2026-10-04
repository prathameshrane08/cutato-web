"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MapPin, Phone, Scissors, Send, User } from "lucide-react";

import WebShell from "@/app/Components/WebShell";

type BarberForm = {
  name: string;
  email: string;
  phone: string;
  city: string;
  experience: string;
  instagram: string;
};

const initialForm: BarberForm = {
  name: "",
  email: "",
  phone: "",
  city: "",
  experience: "",
  instagram: "",
};

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function BarberApplicationPage() {
  const [form, setForm] = useState<BarberForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => form.name.trim().length >= 2 && validEmail(form.email) && !loading,
    [form, loading]
  );

  function update<K extends keyof BarberForm>(key: K, value: BarberForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (!form.name.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    if (!validEmail(form.email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/applications/barber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          city: form.city.trim() || undefined,
          experience: form.experience.trim() || undefined,
          instagram: form.instagram.trim() || undefined,
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
      <WebShell title="Barber application" subtitle="Your application has been submitted.">
        <div className="mx-auto max-w-3xl rounded-[36px] border border-black/10 bg-white p-8 text-center shadow-sm md:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={30} />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[#ff355d]">
            Application received
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">
            Thanks for applying to CUTATO.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-neutral-500">
            Your barber application is now pending review. Once approved, CUTATO will create your
            account and send your login details to the email address used in the application.
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
    <WebShell title="Become a Barber" subtitle="Apply to join CUTATO as a professional barber.">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative">
            <div className="inline-flex rounded-2xl bg-[#ff355d] p-4">
              <Scissors size={24} />
            </div>

            <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-[#ff355d]">
              Barber onboarding
            </p>

            <h2 className="mt-3 text-5xl font-black leading-[0.95] tracking-[-0.05em]">
              Grow your barber business with CUTATO.
            </h2>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
              Submit your details for review. Approved barbers receive their CUTATO login
              credentials by email.
            </p>

            <div className="mt-8 grid gap-3">
              <InfoTile title="1. Apply" text="Send your professional details." />
              <InfoTile title="2. Review" text="CUTATO admin reviews your application." />
              <InfoTile title="3. Login" text="Receive temporary login details after approval." />
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-[0_20px_70px_rgba(0,0,0,0.07)] md:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
                Application
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em]">Barber details</h1>
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
            <Field label="Full name" icon={<User size={17} />} required>
              <input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Your full name"
                className="form-input"
              />
            </Field>

            <Field label="Email" required>
              <input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="you@example.com"
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

            <Field label="Experience">
              <textarea
                value={form.experience}
                onChange={(event) => update("experience", event.target.value)}
                placeholder="Tell us about your barber experience, specialities and background."
                rows={5}
                className="form-input min-h-[130px] resize-y py-4"
              />
            </Field>

            <Field label="Instagram">
              <input
                value={form.instagram}
                onChange={(event) => update("instagram", event.target.value)}
                placeholder="@yourprofile or profile URL"
                className="form-input"
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
              {loading ? "Submitting..." : "Submit barber application"}
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
