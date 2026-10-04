"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Euro, Pencil, Plus, Scissors, Trash2, X } from "lucide-react";

import PortalShell from "@/app/Components/portal/PortalShell";
import { getAuthUser } from "@/app/Components/auth";
import { supabase } from "@/app/lib/supabase";
import { toast } from "@/app/lib/toast";

type ServiceRow = {
  id: string;
  barber_id: string;
  name: string;
  category: string;
  duration_min: number;
  base_price_euro: number;
  description: string | null;
  active: boolean;
};

type ServiceForm = {
  name: string;
  category: string;
  durationMin: string;
  priceEuro: string;
  description: string;
  active: boolean;
};

const EMPTY_FORM: ServiceForm = {
  name: "",
  category: "Hair",
  durationMin: "30",
  priceEuro: "",
  description: "",
  active: true,
};

const CATEGORIES = ["Hair", "Beard", "Combo", "Color", "Other"];

function formatEUR(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unknown error");
  }
  return "Unknown error";
}

export default function BarberServicesPage() {
  const authUser = useMemo(() => getAuthUser(), []);
  const barberId = authUser?.role === "barber" ? (authUser.barberId ?? "") : "";
  const salonId = authUser?.role === "barber" ? (authUser.salonId ?? "") : "";

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);

  const isIndependent = !salonId;

  const loadServices = useCallback(async () => {
    if (!barberId) {
      setLoadError("This barber account is not linked to a barber profile.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("services")
        .select("id, barber_id, name, category, duration_min, base_price_euro, description, active")
        .eq("barber_id", barberId)
        .order("name");

      if (error) throw new Error(error.message);
      setServices((data ?? []) as ServiceRow[]);
    } catch (error) {
      console.error("BARBER SERVICES LOAD ERROR:", error);
      setServices([]);
      setLoadError(messageOf(error));
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(service: ServiceRow) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      category: service.category || "Other",
      durationMin: String(service.duration_min),
      priceEuro: String(service.base_price_euro),
      description: service.description ?? "",
      active: service.active !== false,
    });
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(false);
  }

  function updateForm<K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveService(event: React.FormEvent) {
    event.preventDefault();

    const name = form.name.trim();
    const duration = Number(form.durationMin);
    const price = Number(form.priceEuro);

    if (!name) return toast.error("Please enter a service name.");
    if (!Number.isFinite(duration) || duration < 5 || duration > 240) {
      return toast.error("Duration must be between 5 and 240 minutes.");
    }
    if (!Number.isFinite(price) || price < 0) {
      return toast.error("Please enter a valid price.");
    }

    try {
      setSaving(true);

      if (editingId) {
        const { error } = await supabase
          .from("services")
          .update({
            name,
            category: form.category,
            duration_min: duration,
            base_price_euro: price,
            description: form.description.trim() || null,
            active: form.active,
          })
          .eq("id", editingId)
          .eq("barber_id", barberId);

        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("services").insert({
          id: `svc_${crypto.randomUUID()}`,
          barber_id: barberId,
          name,
          category: form.category,
          duration_min: duration,
          base_price_euro: price,
          description: form.description.trim() || null,
          active: form.active,
        });

        if (error) throw new Error(error.message);
      }

      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormOpen(false);
      await loadServices();
    } catch (error) {
      console.error("BARBER SERVICE SAVE ERROR:", error);
      toast.error(messageOf(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(service: ServiceRow) {
    if (!window.confirm(`Delete "${service.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", service.id)
        .eq("barber_id", barberId);

      if (error) throw new Error(error.message);
      await loadServices();
    } catch (error) {
      toast.error(messageOf(error));
    }
  }

  async function toggleActive(service: ServiceRow) {
    try {
      const { error } = await supabase
        .from("services")
        .update({ active: !service.active })
        .eq("id", service.id)
        .eq("barber_id", barberId);

      if (error) throw new Error(error.message);
      await loadServices();
    } catch (error) {
      toast.error(messageOf(error));
    }
  }

  if (!authUser || authUser.role !== "barber") {
    return (
      <PortalShell role="barber" title="Barber Services" subtitle="Barber access required.">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">Barber login required</h2>
          <p className="mt-2 text-neutral-500">Sign in with a barber account to manage services.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white"
          >
            Go to login
          </Link>
        </div>
      </PortalShell>
    );
  }

  if (!barberId) {
    return (
      <PortalShell
        role="barber"
        title="Barber Services"
        subtitle="Your account is not linked to a barber profile."
      >
        <div className="mx-auto max-w-3xl rounded-[30px] border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">Barber profile not linked</h2>
        </div>
      </PortalShell>
    );
  }

  const activeServices = services.filter((service) => service.active);
  const startingPrice = activeServices.length
    ? Math.min(...activeServices.map((service) => Number(service.base_price_euro)))
    : null;

  return (
    <PortalShell
      role="barber"
      title="Services"
      subtitle={
        isIndependent
          ? "Manage the services customers can book directly with you."
          : "Manage the services assigned to your barber profile."
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/portal/barber"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-5 text-sm font-black shadow-sm"
          >
            <ArrowLeft size={16} /> Dashboard
          </Link>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ff355d] px-5 text-sm font-black text-white shadow-lg shadow-[#ff355d]/20"
          >
            <Plus size={17} /> New service
          </button>
        </div>

        <section className="mt-6 relative overflow-hidden rounded-[34px] bg-neutral-950 p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)] md:p-9">
          <div className="absolute right-[-120px] top-[-120px] h-72 w-72 rounded-full bg-[#ff355d]/25 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff355d]">
              {isIndependent ? "Independent barber" : "Salon barber"}
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em]">Your service menu</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
              {isIndependent
                ? "These services appear on your public profile and can be booked directly by customers."
                : "These services are bookable specifically with your barber profile at the salon."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <MiniStat label="Services" value={String(services.length)} />
              <MiniStat label="Active" value={String(activeServices.length)} />
              <MiniStat
                label="Starting at"
                value={startingPrice === null ? "—" : formatEUR(startingPrice)}
              />
            </div>
          </div>
        </section>

        {loadError ? (
          <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-600">
            {loadError}
          </div>
        ) : null}

        <section className="mt-6">
          {loading ? (
            <div className="rounded-[30px] border border-black/10 bg-white p-8 shadow-sm">
              <p className="font-black">Loading services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-black/10 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff355d]/10 text-[#ff355d]">
                <Scissors size={24} />
              </div>
              <h3 className="mt-5 text-2xl font-black">No services yet</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Add your first service with duration and price.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-6 inline-flex rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white"
              >
                Add first service
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff355d]">
                        {service.category}
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                        {service.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleActive(service)}
                      className={`rounded-full px-3 py-2 text-xs font-black ${service.active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}
                    >
                      {service.active ? "Active" : "Hidden"}
                    </button>
                  </div>

                  <p className="mt-4 min-h-12 text-sm leading-6 text-neutral-500">
                    {service.description || "No description added."}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <InfoBox
                      icon={<Clock3 size={16} />}
                      label="Duration"
                      value={`${service.duration_min} min`}
                    />
                    <InfoBox
                      icon={<Euro size={16} />}
                      label="Price"
                      value={formatEUR(Number(service.base_price_euro))}
                    />
                  </div>

                  <div className="mt-5 flex gap-2 border-t border-black/10 pt-5">
                    <button
                      type="button"
                      onClick={() => openEdit(service)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-3 text-sm font-black"
                    >
                      <Pencil size={15} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteService(service)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${service.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
                  {editingId ? "Edit service" : "New service"}
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  {editingId ? "Update your service" : "Add to your service menu"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveService} className="mt-7 grid gap-5">
              <Field label="Service name">
                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="e.g. Skin fade"
                  className="service-input"
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => updateForm("category", e.target.value)}
                    className="service-input"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Duration">
                  <input
                    type="number"
                    min="5"
                    max="240"
                    step="5"
                    value={form.durationMin}
                    onChange={(e) => updateForm("durationMin", e.target.value)}
                    className="service-input"
                  />
                </Field>
                <Field label="Price (€)">
                  <input
                    type="number"
                    min="0"
                    step="0.50"
                    value={form.priceEuro}
                    onChange={(e) => updateForm("priceEuro", e.target.value)}
                    placeholder="25"
                    className="service-input"
                  />
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Describe what is included."
                  className="service-input min-h-[110px] resize-y py-4"
                />
              </Field>

              <label className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 p-4">
                <div>
                  <p className="text-sm font-black">Active service</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Active services are visible to customers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => updateForm("active", e.target.checked)}
                  className="h-5 w-5 accent-[#ff355d]"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 border-t border-black/10 pt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-full border border-black/10 px-5 py-3 text-sm font-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Create service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .service-input {
          min-height: 52px;
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #fafafa;
          padding-left: 16px;
          padding-right: 16px;
          font-size: 14px;
          font-weight: 700;
          outline: none;
          transition: 0.2s ease;
        }
        .service-input:focus {
          border-color: #ff355d;
          background: white;
        }
      `}</style>
    </PortalShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[130px] rounded-[20px] border border-white/10 bg-white/10 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function InfoBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <div className="flex items-center gap-2 text-neutral-400">
        {icon}
        <span className="text-xs font-black uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-black">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-black">{label}</label>
      {children}
    </div>
  );
}
