"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WebShell from "@/app/Components/WebShell";
import type { CustomerBarber as Barber } from "@/app/lib/barbersStore";
import {
  getBarbersFromSupabase,
  upsertBarberToSupabase,
  deleteBarberFromSupabase,
  type SupabaseBarber,
} from "@/app/lib/barbersSupabase";
import { requireSalonAuth } from "@/app/portal/_lib/portalAuth";

function uid(prefix = "barber") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function SalonStaffPage() {
  const auth = requireSalonAuth();

  if (!auth.ok) {
    return (
      <WebShell title="Access denied" subtitle="You do not have permission to open this page.">
        <div className="mx-auto max-w-4xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {auth.reason === "not_logged_in" ? "Please log in" : "Wrong account type"}
            </div>
            <div className="theme-muted" style={{ marginTop: 8 }}>
              This page is only available for salon accounts.
            </div>
          </div>
        </div>
      </WebShell>
    );
  }

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [speciality, setSpeciality] = useState("");

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [distKm, setDistKm] = useState<number>(1.2);
  const [rating, setRating] = useState<number>(4.7);
  const [reviews, setReviews] = useState<number>(100);
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [active, setActive] = useState(true);

  async function loadBarbers() {
  try {
    const rows = await getBarbersFromSupabase();

    const mapped: Barber[] = rows.map((b: SupabaseBarber) => ({
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
    }));

    setBarbers(mapped);
  } catch (error) {
    console.error("Failed to load barbers:", error);
    alert("Failed to load barbers from Supabase.");
  }
}

  useEffect(() => {
    loadBarbers();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let arr = barbers.slice();

    if (query) {
      arr = arr.filter((b) => {
        const hay = `${b.id} ${b.name} ${b.area} ${b.address} ${b.tagline ?? ""}`.toLowerCase();
        return hay.includes(query);
      });
    }

    if (onlyActive) {
      arr = arr.filter((b) => b.active !== false);
    }

    arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [barbers, q, onlyActive]);

  function resetForm() {
    setEditingId(null);
    setId("");
    setName("");
    setArea("");
    setAddress("");
    setDistKm(1.2);
    setRating(4.7);
    setReviews(100);
    setTagline("");
    setAbout("");
    setActive(true);
    setImageUrl("");
    setSpeciality("");
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(b: Barber) {
    setEditingId(b.id);
    setId(b.id);
    setName(b.name);
    setArea(b.area);
    setAddress(b.address);
    setDistKm(Number(b.distKm ?? 1.2));
    setRating(Number(b.rating ?? 4.7));
    setReviews(Number(b.reviews ?? 100));
    setTagline(b.tagline ?? "");
    setAbout(b.about ?? "");
    setActive(b.active ?? true);
    setOpen(true);
    setImageUrl(b.imageUrl ?? "");
    setSpeciality(b.speciality ?? "");
  }

  function validate(): string | null {
    if (!name.trim()) return "Barber name is required.";
    if (!area.trim()) return "Area is required.";
    if (!address.trim()) return "Address is required.";
    if (distKm < 0 || distKm > 99) return "Distance must be between 0 and 99.";
    if (rating < 0 || rating > 5) return "Rating must be between 0 and 5.";
    if (reviews < 0 || reviews > 999999) return "Reviews must be between 0 and 999999.";
    return null;
  }

  function onSave() {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    const generatedId = (id.trim() ? slugify(id) : slugify(name)) || uid();
    const nextId = editingId ?? generatedId;

    const payload: Barber = {
      id: nextId,
      name: name.trim(),
      area: area.trim(),
      address: address.trim(),
      distKm: Number(distKm),
      rating: Number(rating),
      reviews: Number(reviews),
      tagline: tagline.trim() || undefined,
      about: about.trim() || undefined,
      active,
      imageUrl: imageUrl.trim() || undefined,
      speciality: speciality.trim() || undefined,
    };

    const supabasePayload: SupabaseBarber = {
      id: payload.id,
      name: payload.name,
      area: payload.area,
      address: payload.address,
      dist_km: Number(payload.distKm),
      rating: Number(payload.rating),
      reviews: Number(payload.reviews),
      tagline: payload.tagline ?? null,
      about: payload.about ?? null,
      active: payload.active ?? true,
      image_url: payload.imageUrl ?? null,
      speciality: payload.speciality ?? null,
    };

    upsertBarberToSupabase(supabasePayload)
      .then(async () => {
        await loadBarbers();
        closeModal();
      })
      .catch((error) => {
        console.error("Failed to save barber:", error);
        alert("Failed to save barber.");
      });
  }

  function onDelete(id: string) {
    if (!confirm("Delete this barber?")) return;
    deleteBarberFromSupabase(id)
      .then(async () => {
        await loadBarbers();

        if (editingId === id) {
          closeModal();
        }
      })
      .catch((error) => {
        console.error("Failed to delete barber:", error);
        alert("Failed to delete barber.");
      });
  }

  return (
    <WebShell
      title="Salon Staff"
      subtitle="Manage the barbers shown on the customer app. Each barber has a permanent ID used later for login and bookings."
    >
      <div className="mx-auto max-w-6xl" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/portal/salon" className="btn btn-secondary">
            ← Salon dashboard
          </Link>
          <Link href="/portal/salon/services" className="btn btn-secondary">
            Services
          </Link>
          <Link href="/portal/salon/bookings" className="btn btn-secondary">
            Bookings
          </Link>
          <Link href="/portal/salon/availability" className="btn btn-secondary">
            Availability
          </Link>
          <Link href="/portal/salon/settings" className="btn btn-secondary">
            Settings
          </Link>

          <button className="btn btn-primary" onClick={openCreate}>
            + New barber
          </button>
        </div>

        <div className="theme-card" style={{ padding: 16, borderRadius: 20 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ flex: "1 1 360px", minWidth: 240 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Search barber</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by ID, name, area, address…"
                style={inputStyle}
              />
            </div>

            <button
              onClick={() => setOnlyActive((v) => !v)}
              style={{
                marginTop: 28,
                padding: "10px 14px",
                borderRadius: 999,
                border: onlyActive ? "1px solid rgba(0,0,0,0.18)" : "1px solid rgba(0,0,0,0.08)",
                background: onlyActive ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {onlyActive ? "Active only ✓" : "Active only"}
            </button>

            <div style={{ marginLeft: "auto", marginTop: 28 }} className="theme-muted">
              {filtered.length} barber(s)
            </div>
          </div>

          <div className="theme-muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5 }}>
            The barber ID becomes the login identity later. Example: barber ID <b>abhi</b> → barber login email{" "}
            <b>abhi@cutato.com</b>.
          </div>
        </div>

        <div className="theme-card" style={{ padding: 16, borderRadius: 20 }}>
          {!filtered.length ? (
            <div className="theme-muted" style={{ padding: 8 }}>
              No barbers found.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filtered.map((b) => (
                <div
                  key={b.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.02)",
                    padding: 14,
                    display: "grid",
                    gap: 10,
                    opacity: b.active === false ? 0.65 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 950, fontSize: 16 }}>{b.name}</div>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 900,
                            border: "1px solid rgba(0,0,0,0.10)",
                            background: "rgba(0,0,0,0.04)",
                          }}
                        >
                          ID: {b.id}
                        </span>
                      </div>

                      <div className="theme-muted" style={{ marginTop: 4, fontSize: 13 }}>
                        {b.area} • ⭐ {Number(b.rating ?? 0).toFixed(1)} • {Number(b.distKm ?? 0).toFixed(1)} km
                      </div>

                      <div className="theme-muted" style={{ marginTop: 4, fontSize: 13 }}>
                        {b.address}
                      </div>

                      {b.tagline ? (
                        <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
                          {b.tagline}
                        </div>
                      ) : null}
                    </div>

                    {b.speciality ? (
                      <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
                        Speciality: {b.speciality}
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btn-secondary" onClick={() => openEdit(b)}>
                        Edit
                      </button>

                      <button className="btn btn-secondary" onClick={() => onDelete(b.id)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {b.about ? (
                    <div className="theme-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {b.about}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {open ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              display: "grid",
              placeItems: "center",
              zIndex: 50,
              padding: 16,
            }}
            onClick={closeModal}
          >
            <div
              className="theme-card"
              style={{ width: "min(700px, 100%)", borderRadius: 22, maxHeight: "90vh", display: "grid", gridTemplateRows: "auto 1fr auto", overflow: "hidden" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: "0 20px 20px",fontWeight: 900, fontSize: 18 }}>
                {editingId ? "Edit barber" : "Create barber"}
              </div>

              <div style={{ display: "grid", gap: 12, padding: "0 20px 20px", overflow: "auto", marginTop: 14 }}>
                {!editingId ? (
                  <Field label="Barber ID (optional)">
                    <input
                      placeholder="e.g. abhi"
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      style={inputStyle}
                    />
                  </Field>
                ) : (
                  <Field label="Barber ID">
                    <input value={id} disabled style={{ ...inputStyle, opacity: 0.7 }} />
                  </Field>
                )}

                <Field label="Name">
                  <input
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Area">
                  <input
                    placeholder="Area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Address">
                  <input
                    placeholder="Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Distance (km)">
                  <input
                    type="number"
                    value={distKm}
                    onChange={(e) => setDistKm(Number(e.target.value))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Rating">
                  <input
                    type="number"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Reviews">
                  <input
                    type="number"
                    value={reviews}
                    onChange={(e) => setReviews(Number(e.target.value))}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Tagline">
                  <input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Speciality">
                  <input
                    placeholder="e.g. Fade Specialist"
                    value={speciality}
                    onChange={(e) => setSpeciality(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Image URL">
                  <input
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={inputStyle}
                  />
                </Field>

                <Field label="About">
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    style={{ ...inputStyle, height: 90, paddingTop: 10 }}
                  />
                </Field>

                <Field label="Visible to customers">
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                    />
                    <span className="theme-muted" style={{ fontSize: 13 }}>
                      {active ? "Active" : "Hidden"}
                    </span>
                  </label>
                </Field>

                <div style={{ display: "flex", gap: 10, 
                              justifyContent: "flex-end", padding: 20,
                              borderTop: "1px solid rgba(0,0,0,0.08)",
                              background: "white",
                }}>
                  <button className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>

                  <button className="btn btn-primary" onClick={onSave}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </WebShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 900 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.1)",
  background: "rgba(0,0,0,0.02)",
  outline: "none",
};