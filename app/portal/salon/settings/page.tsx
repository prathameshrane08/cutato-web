"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { requireSalonAuth } from "@/app/portal/_lib/portalAuth";
import { createClient } from "@/app/lib/supabase/client";

type SalonForm = {
  name: string;
  owner_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
};

const EMPTY_FORM: SalonForm = {
  name: "",
  owner_name: "",
  email: "",
  phone: "",
  city: "",
  address: "",
};

export default function SalonSettingsPage() {
  const auth = requireSalonAuth();

  if (!auth.ok) {
    return (
      <WebShell title="Access denied" subtitle="Salon account required.">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-black/10 bg-white p-8">
          This page is only available for salon accounts.
        </div>
      </WebShell>
    );
  }

  const salonId = auth.user.salonId ?? "";
  const supabase = createClient();

  const [form, setForm] = useState<SalonForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");

  async function loadSalon() {
    try {
      setLoading(true);

      if (!salonId) {
        setForm(EMPTY_FORM);
        return;
      }

      const { data, error } = await supabase
        .from("salons")
        .select("id,name,owner_name,email,phone,city,address,updated_at")
        .eq("id", salonId)
        .single();

      if (error) throw error;

      setForm({
        name: data.name ?? "",
        owner_name: data.owner_name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        city: data.city ?? "",
        address: data.address ?? "",
      });

      setSavedAt(data.updated_at ?? "");
    } catch (error) {
      console.error("Failed to load salon settings:", error);
      alert("Could not load the current salon profile.");
      setForm(EMPTY_FORM);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSalon();
  }, [salonId]);

  function patch<K extends keyof SalonForm>(key: K, value: SalonForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save() {
    if (!salonId) {
      alert("Your account is not linked to a salon.");
      return;
    }

    if (!form.name.trim()) {
      alert("Salon name is required.");
      return;
    }

    try {
      setSaving(true);

      const updatedAt = new Date().toISOString();

      const { error } = await supabase
        .from("salons")
        .update({
          name: form.name.trim(),
          owner_name: form.owner_name.trim() || null,
          email: form.email.trim().toLowerCase() || null,
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          updated_at: updatedAt,
        })
        .eq("id", salonId);

      if (error) throw error;

      setSavedAt(updatedAt);
      alert("Salon settings saved.");
    } catch (error) {
      console.error("Failed to save salon settings:", error);
      alert(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Could not save salon settings."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <WebShell
      title="Salon Settings"
      subtitle="These values come from the current salon record in Supabase."
    >
      <div className="mx-auto max-w-6xl">
        <PortalNav />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
          <section className="rounded-[32px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
              Salon profile
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
              Public salon information
            </h1>

            <p className="mt-3 text-sm leading-6 text-neutral-500">
              No demo values are loaded here. This page reads the salon created
              when the application was approved.
            </p>

            {loading ? (
              <div className="mt-8 rounded-2xl bg-neutral-50 p-5 font-bold">
                Loading salon profile...
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <Field
                  label="Salon name"
                  value={form.name}
                  onChange={(value) => patch("name", value)}
                />

                <Field
                  label="Owner name"
                  value={form.owner_name}
                  onChange={(value) => patch("owner_name", value)}
                />

                <Field
                  label="Email"
                  value={form.email}
                  onChange={(value) => patch("email", value)}
                />

                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(value) => patch("phone", value)}
                />

                <Field
                  label="City"
                  value={form.city}
                  onChange={(value) => patch("city", value)}
                />

                <Field
                  label="Address"
                  value={form.address}
                  onChange={(value) => patch("address", value)}
                />
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={loading || saving}
                onClick={() => void save()}
                className="rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>

              <button
                type="button"
                disabled={loading || saving}
                onClick={() => void loadSalon()}
                className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-black"
              >
                Reset changes
              </button>
            </div>
          </section>

          <aside className="h-fit rounded-[32px] border border-black/10 bg-neutral-950 p-6 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
              Preview
            </p>

            <h2 className="mt-3 text-3xl font-black">
              {form.name || "Unnamed salon"}
            </h2>

            <div className="mt-6 grid gap-4 text-sm">
              <Preview label="Owner" value={form.owner_name || "—"} />
              <Preview label="Address" value={form.address || "—"} />
              <Preview label="City" value={form.city || "—"} />
              <Preview label="Phone" value={form.phone || "—"} />
              <Preview label="Email" value={form.email || "—"} />
            </div>

            <p className="mt-6 border-t border-white/10 pt-5 text-xs text-white/40">
              {savedAt
                ? `Last saved ${new Date(savedAt).toLocaleString()}`
                : "Not saved yet"}
            </p>
          </aside>
        </div>
      </div>
    </WebShell>
  );
}

function PortalNav() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/portal/salon" className="btn btn-secondary">← Dashboard</Link>
      <Link href="/portal/salon/bookings" className="btn btn-secondary">Bookings</Link>
      <Link href="/portal/salon/staff" className="btn btn-secondary">Staff</Link>
      <Link href="/portal/salon/services" className="btn btn-secondary">Services</Link>
      <Link href="/portal/salon/availability" className="btn btn-secondary">Availability</Link>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-13 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 outline-none focus:border-[#ff355d]/50"
      />
    </label>
  );
}

function Preview({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-white/35">
        {label}
      </p>
      <p className="mt-1 font-bold text-white/85">{value}</p>
    </div>
  );
}
