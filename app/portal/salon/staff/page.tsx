"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import { requireSalonAuth } from "@/app/portal/_lib/portalAuth";
import type { CustomerBarber as Barber } from "@/app/lib/barbersStore";
import {
  deleteBarberFromSupabase,
  getBarbersForSalonFromSupabase,
  upsertBarberToSupabase,
  type SupabaseBarber,
} from "@/app/lib/barbersSupabase";

function uid() {
  return crypto.randomUUID();
}

export default function SalonStaffPage() {
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

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);

  async function loadBarbers() {
    try {
      setLoading(true);

      if (!salonId) {
        setBarbers([]);
        return;
      }

      const rows = await getBarbersForSalonFromSupabase(salonId);

      setBarbers(
        rows.map((b) => ({
          id: b.id,
          name: b.name,
          area: b.area,
          address: b.address,
          distKm: Number(b.dist_km ?? 0),
          rating: Number(b.rating ?? 0),
          reviews: Number(b.reviews ?? 0),
          tagline: b.tagline ?? undefined,
          about: b.about ?? undefined,
          active: b.active ?? true,
          imageUrl: b.image_url ?? undefined,
          speciality: b.speciality ?? undefined,
        }))
      );
    } catch (error) {
      console.error("Failed to load salon barbers:", error);
      alert("Could not load this salon's staff.");
      setBarbers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBarbers();
  }, [salonId]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return barbers
      .filter((b) => {
        if (!query) return true;
        return `${b.name} ${b.area} ${b.address} ${b.speciality ?? ""}`
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [barbers, q]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setArea("");
    setAddress("");
    setTagline("");
    setAbout("");
    setSpeciality("");
    setImageUrl("");
    setActive(true);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(barber: Barber) {
    setEditingId(barber.id);
    setName(barber.name);
    setArea(barber.area);
    setAddress(barber.address);
    setTagline(barber.tagline ?? "");
    setAbout(barber.about ?? "");
    setSpeciality(barber.speciality ?? "");
    setImageUrl(barber.imageUrl ?? "");
    setActive(barber.active !== false);
    setOpen(true);
  }

  async function saveBarber() {
    if (!salonId) {
      alert("Your account is not linked to a salon.");
      return;
    }

    if (!name.trim() || !area.trim() || !address.trim()) {
      alert("Name, area and address are required.");
      return;
    }

    const current = editingId
      ? barbers.find((barber) => barber.id === editingId)
      : null;

    const payload: SupabaseBarber = {
      id: editingId ?? uid(),
      name: name.trim(),
      area: area.trim(),
      address: address.trim(),
      dist_km: Number(current?.distKm ?? 0),
      rating: Number(current?.rating ?? 5),
      reviews: Number(current?.reviews ?? 0),
      tagline: tagline.trim() || null,
      about: about.trim() || null,
      image_url: imageUrl.trim() || null,
      speciality: speciality.trim() || null,
      active,
      salon_id: salonId,
    };

    try {
      await upsertBarberToSupabase(payload);
      setOpen(false);
      resetForm();
      await loadBarbers();
    } catch (error) {
      console.error("Failed to save barber:", error);
      alert("Failed to save barber.");
    }
  }

  async function deleteBarber(id: string) {
    if (!confirm("Delete this barber from this salon?")) return;

    try {
      await deleteBarberFromSupabase(id, salonId);
      await loadBarbers();
    } catch (error) {
      console.error("Failed to delete barber:", error);
      alert(
        "Failed to delete barber. If this barber has bookings/services, remove those links first."
      );
    }
  }

  return (
    <WebShell
      title="Salon Staff"
      subtitle="Only barbers assigned to this salon are shown here."
    >
      <div className="mx-auto max-w-6xl">
        <PortalNav />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
              Staff
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
              Your salon team
            </h1>
            <p className="mt-2 text-neutral-500">
              {loading ? "Loading…" : `${barbers.length} barber(s) assigned to this salon.`}
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white"
          >
            + New barber
          </button>
        </div>

        <div className="mt-6 rounded-[28px] border border-black/10 bg-white p-5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search staff..."
            className="h-12 w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 outline-none"
          />
        </div>

        <div className="mt-5 grid gap-4">
          {!loading && filtered.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/10 bg-white p-10 text-center">
              <h2 className="text-xl font-black">No barbers yet</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Add the first barber for this salon.
              </p>
            </div>
          ) : (
            filtered.map((barber) => (
              <div
                key={barber.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-black/10 bg-white p-5"
              >
                <div>
                  <h3 className="text-xl font-black">{barber.name}</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {barber.speciality || "Barber"} • {barber.area}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">{barber.address}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(barber)}
                    className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-black"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void deleteBarber(barber.id)}
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
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black">
                  {editingId ? "Edit barber" : "Add barber"}
                </h2>
                <p className="mt-2 text-sm text-neutral-500">
                  This barber will automatically belong to the logged-in salon.
                </p>
              </div>

              <button onClick={() => setOpen(false)} className="text-2xl">
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Name" value={name} onChange={setName} />
              <Field label="Area" value={area} onChange={setArea} />
              <div className="sm:col-span-2">
                <Field label="Address" value={address} onChange={setAddress} />
              </div>
              <Field label="Speciality" value={speciality} onChange={setSpeciality} />
              <Field label="Image URL" value={imageUrl} onChange={setImageUrl} />
              <div className="sm:col-span-2">
                <Field label="Tagline" value={tagline} onChange={setTagline} />
              </div>
              <div className="sm:col-span-2">
                <Field label="About" value={about} onChange={setAbout} />
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
                onClick={() => void saveBarber()}
                className="rounded-full bg-[#ff355d] px-6 py-3 font-black text-white"
              >
                Save barber
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WebShell>
  );
}

function PortalNav() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/portal/salon" className="btn btn-secondary">← Dashboard</Link>
      <Link href="/portal/salon/bookings" className="btn btn-secondary">Bookings</Link>
      <Link href="/portal/salon/services" className="btn btn-secondary">Services</Link>
      <Link href="/portal/salon/availability" className="btn btn-secondary">Availability</Link>
      <Link href="/portal/salon/settings" className="btn btn-secondary">Settings</Link>
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
        className="h-12 rounded-2xl border border-black/10 bg-neutral-50 px-4 outline-none"
      />
    </label>
  );
}
