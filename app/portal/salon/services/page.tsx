"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { requireSalonAuth } from "@/app/portal/_lib/portalAuth";
import {
  getServicesFromSupabase,
  upsertServiceToSupabase,
  type Service,
} from "@/app/lib/servicesStore";
import { getBarbersForSalonFromSupabase } from "@/app/lib/barbersSupabase";
import { supabase } from "@/app/lib/supabase";

const CATEGORIES = ["Haircut", "Fade", "Beard", "Combo", "Color", "Kids", "Other"] as const;

function fmtEUR(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function uid() {
  return `svc_${crypto.randomUUID()}`;
}

export default function SalonServicesPage() {
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

  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("Haircut");
  const [durationMin, setDurationMin] = useState(30);
  const [basePriceEuro, setBasePriceEuro] = useState(25);
  const [description, setDescription] = useState("");
  const [assignedBarberIds, setAssignedBarberIds] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  async function refresh() {
    try {
      setLoading(true);

      if (!salonId) {
        setServices([]);
        setBarbers([]);
        return;
      }

      const salonBarbers = await getBarbersForSalonFromSupabase(salonId);
      const allowedIds = new Set(salonBarbers.map((b) => b.id));

      setBarbers(salonBarbers.map((b) => ({ id: b.id, name: b.name })));

      const rows = await getServicesFromSupabase(true);

      const grouped = new Map<string, Service>();

      for (const row of rows) {
        const rowBarberIds = (row.barberIds ?? []).filter((id) => allowedIds.has(id));
        if (rowBarberIds.length === 0) continue;

        const rawId = String(row.id);
        const matchingBarberId = rowBarberIds[0];

        const suffix = `_${matchingBarberId}`;
        const baseId = rawId.endsWith(suffix)
          ? rawId.slice(0, -suffix.length)
          : rawId;

        const existing = grouped.get(baseId);

        if (existing) {
          for (const barberId of rowBarberIds) {
            if (!existing.barberIds.includes(barberId)) {
              existing.barberIds.push(barberId);
            }
          }
        } else {
          grouped.set(baseId, {
            ...row,
            id: baseId,
            barberIds: [...rowBarberIds],
          });
        }
      }

      setServices(Array.from(grouped.values()));
    } catch (error) {
      console.error("Failed to load salon services:", error);
      setServices([]);
      alert("Could not load this salon's services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [salonId]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return services
      .filter((service) => {
        if (!query) return true;
        return `${service.name} ${service.category} ${service.description ?? ""}`
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [services, q]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setCategory("Haircut");
    setDurationMin(30);
    setBasePriceEuro(25);
    setDescription("");
    setAssignedBarberIds([]);
    setActive(true);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(service: Service) {
    setEditingId(service.id);
    setName(service.name);
    setCategory(
      CATEGORIES.includes(service.category as (typeof CATEGORIES)[number])
        ? (service.category as (typeof CATEGORIES)[number])
        : "Other"
    );
    setDurationMin(service.durationMin);
    setBasePriceEuro(service.basePriceEuro);
    setDescription(service.description ?? "");
    setAssignedBarberIds(service.barberIds ?? []);
    setActive(service.active !== false);
    setOpen(true);
  }

  function toggleBarber(id: string) {
    setAssignedBarberIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

  async function saveService() {
    if (!name.trim()) {
      alert("Service name is required.");
      return;
    }

    if (assignedBarberIds.length === 0) {
      alert("Assign this service to at least one barber in this salon.");
      return;
    }

    const allowedIds = new Set(barbers.map((b) => b.id));
    const safeAssignments = assignedBarberIds.filter((id) => allowedIds.has(id));

    if (safeAssignments.length === 0) {
      alert("The selected barbers do not belong to this salon.");
      return;
    }

    const payload: Service = {
      id: editingId ?? uid(),
      name: name.trim(),
      category,
      durationMin: Math.round(durationMin),
      basePriceEuro: Math.round(basePriceEuro * 100) / 100,
      description: description.trim() || undefined,
      barberIds: safeAssignments,
      active,
      updatedAt: new Date().toISOString(),
    };

    try {
      // Delete only rows of this service that belong to this salon.
      if (editingId) {
        await deleteServiceRowsForSalon(editingId, barbers.map((b) => b.id));
      }

      await upsertServiceToSupabase(payload);
      setOpen(false);
      resetForm();
      await refresh();
    } catch (error) {
      console.error("Failed to save service:", error);
      alert(getErrorMessage(error, "Failed to save service."));
    }
  }

  async function deleteService(serviceId: string) {
    if (!confirm("Delete this service from this salon?")) return;

    try {
      await deleteServiceRowsForSalon(
        serviceId,
        barbers.map((barber) => barber.id)
      );

      await refresh();
    } catch (error) {
      console.error("Failed to delete service:", error);
      alert(getErrorMessage(error, "Failed to delete service."));
    }
  }

  return (
    <WebShell
      title="Salon Services"
      subtitle="Only services assigned to barbers in this salon are shown."
    >
      <div className="mx-auto max-w-6xl">
        <PortalNav />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
              Services
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
              Your service menu
            </h1>
            <p className="mt-2 text-neutral-500">
              {loading ? "Loading…" : `${services.length} service(s) in this salon.`}
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            disabled={barbers.length === 0}
            className="rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            + New service
          </button>
        </div>

        {barbers.length === 0 && !loading ? (
          <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Add at least one barber before creating services.
          </div>
        ) : null}

        <div className="mt-6 rounded-[28px] border border-black/10 bg-white p-5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services..."
            className="h-12 w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 outline-none"
          />
        </div>

        <div className="mt-5 grid gap-4">
          {!loading && filtered.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/10 bg-white p-10 text-center">
              <h2 className="text-xl font-black">No services yet</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Services from other salons will not appear here.
              </p>
            </div>
          ) : (
            filtered.map((service) => (
              <div
                key={service.id}
                className="flex flex-wrap items-center justify-between gap-5 rounded-[28px] border border-black/10 bg-white p-5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black">{service.name}</h3>
                    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">
                      {service.category}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-neutral-500">
                    {service.durationMin} min • {fmtEUR(service.basePriceEuro)}
                  </p>

                  <p className="mt-2 text-xs font-bold text-neutral-400">
                    Assigned to{" "}
                    {service.barberIds
                      .map((id) => barbers.find((b) => b.id === id)?.name)
                      .filter(Boolean)
                      .join(", ") || "no barber"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(service)}
                    className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-black"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => void deleteService(service.id)}
                    className="rounded-full bg-red-50 px-5 py-2.5 text-sm font-black text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[32px] bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-black">
                  {editingId ? "Edit service" : "New service"}
                </h2>
                <p className="mt-2 text-sm text-neutral-500">
                  Assign the service only to barbers in this salon.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-2xl">×</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input label="Name" value={name} onChange={setName} />

              <label className="grid gap-2">
                <span className="text-sm font-black">Category</span>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as (typeof CATEGORIES)[number])
                  }
                  className="h-12 rounded-2xl border border-black/10 bg-neutral-50 px-4"
                >
                  {CATEGORIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <NumberInput
                label="Duration (minutes)"
                value={durationMin}
                onChange={setDurationMin}
              />

              <NumberInput
                label="Price (€)"
                value={basePriceEuro}
                onChange={setBasePriceEuro}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Description"
                  value={description}
                  onChange={setDescription}
                />
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-black">Assigned barbers</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {barbers.map((barber) => (
                  <label
                    key={barber.id}
                    className="flex items-center gap-3 rounded-2xl border border-black/10 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={assignedBarberIds.includes(barber.id)}
                      onChange={() => toggleBarber(barber.id)}
                    />
                    <span className="font-bold">{barber.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="mt-5 flex items-center gap-3 font-bold">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active
            </label>

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/10 px-5 py-3 font-black"
              >
                Cancel
              </button>
              <button
                onClick={() => void saveService()}
                className="rounded-full bg-[#ff355d] px-6 py-3 font-black text-white"
              >
                Save service
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WebShell>
  );
}

async function deleteServiceRowsForSalon(
  baseServiceId: string,
  salonBarberIds: string[]
) {
  if (salonBarberIds.length === 0) return;

  const { data, error: loadError } = await supabase
    .from("services")
    .select("id,barber_id")
    .in("barber_id", salonBarberIds);

  if (loadError) throw loadError;

  const rowIds = (data ?? [])
    .filter((row) => {
      const id = String(row.id);
      return id === baseServiceId || id.startsWith(`${baseServiceId}_`);
    })
    .map((row) => row.id);

  if (rowIds.length === 0) return;

  const { error: deleteError } = await supabase
    .from("services")
    .delete()
    .in("id", rowIds);

  if (deleteError) throw deleteError;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

function PortalNav() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/portal/salon" className="btn btn-secondary">← Dashboard</Link>
      <Link href="/portal/salon/bookings" className="btn btn-secondary">Bookings</Link>
      <Link href="/portal/salon/staff" className="btn btn-secondary">Staff</Link>
      <Link href="/portal/salon/availability" className="btn btn-secondary">Availability</Link>
      <Link href="/portal/salon/settings" className="btn btn-secondary">Settings</Link>
    </div>
  );
}

function Input({
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
        className="h-12 rounded-2xl border border-black/10 bg-neutral-50 px-4 outline-none"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-12 rounded-2xl border border-black/10 bg-neutral-50 px-4 outline-none"
      />
    </label>
  );
}
