"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WebShell from "@/app/Components/WebShell";
import { useCustomerBarbers } from "@/app/lib/barbersStore";
import {
  getServicesFromSupabase,
  upsertServiceToSupabase,
  deleteServiceFromSupabase,
  type Service,
} from "@/app/lib/servicesStore";
import { requireSalonAuth } from "@/app/portal/_lib/portalAuth";

const CATEGORIES = ["Haircut", "Fade", "Beard", "Combo", "Color", "Kids", "Other"] as const;

function fmtEUR(v: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(v);
}

function uid(prefix = "svc") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export default function SalonServicesPage() {
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

  const { barbers, refresh: refreshBarbers } = useCustomerBarbers();

  const [services, setServices] = useState<Service[]>([]);
  const [q, setQ] = useState("");
  const [filterBarberId, setFilterBarberId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Haircut");
  const [durationMin, setDurationMin] = useState<number>(30);
  const [basePriceEuro, setBasePriceEuro] = useState<number>(25);
  const [description, setDescription] = useState<string>("");
  const [assignedBarberIds, setAssignedBarberIds] = useState<string[]>([]);
  const [active, setActive] = useState(true);

  async function refresh() {
    try {
      setLoading(true);
      const rows = await getServicesFromSupabase(true);

      const grouped = new Map<string, Service>();

      for (const row of rows as any[]) {
        const baseId = String(row.id).includes("_")
          ? String(row.id).split("_").slice(0, -1).join("_") || String(row.id)
          : String(row.id);

        const barberId = row.barberIds?.[0] || row.barber_id;

        const existing = grouped.get(baseId);

        if (existing) {
          if (barberId && !existing.barberIds.includes(barberId)) {
            existing.barberIds.push(barberId);
          }
        } else {
          grouped.set(baseId, {
            id: baseId,
            name: row.name,
            category: row.category,
            durationMin: Number(row.durationMin ?? row.duration_min ?? 30),
            basePriceEuro: Number(row.basePriceEuro ?? row.base_price_euro ?? 0),
            description: row.description ?? undefined,
            barberIds: barberId ? [barberId] : [],
            active: row.active ?? true,
          });
        }
      }

      setServices(Array.from(grouped.values()));
    } catch (err) {
      console.error("Failed to load services:", err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshBarbers();
    refresh();
  }, [refreshBarbers]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let arr = services.slice();

    if (query) {
      arr = arr.filter((s) => {
        const hay = `${s.name} ${s.category} ${s.description ?? ""}`.toLowerCase();
        return hay.includes(query);
      });
    }

    if (filterBarberId !== "all") {
      arr = arr.filter((s) => (s.barberIds ?? []).includes(filterBarberId));
    }

    arr.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });

    return arr;
  }, [services, q, filterBarberId]);

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

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(s: Service) {
    setEditingId(s.id);
    setName(s.name);
    setCategory((s.category as (typeof CATEGORIES)[number]) ?? "Haircut");
    setDurationMin(Number(s.durationMin || 30));
    setBasePriceEuro(Number(s.basePriceEuro || 0));
    setDescription(s.description ?? "");
    setAssignedBarberIds(Array.isArray(s.barberIds) ? s.barberIds : []);
    setActive(s.active ?? true);
    setOpen(true);
  }

  function toggleAssign(id: string) {
    setAssignedBarberIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  }

  function validate(): string | null {
    if (!name.trim()) return "Service name is required.";
    if (durationMin < 5 || durationMin > 240) return "Duration must be between 5 and 240 minutes.";
    if (basePriceEuro < 0 || basePriceEuro > 999) return "Price must be between 0 and 999.";
    if (assignedBarberIds.length === 0) return "Assign this service to at least one barber.";
    return null;
  }

  async function onSave() {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    const payload: Service = {
      id: editingId ?? uid(),
      name: name.trim(),
      category,
      durationMin: Math.round(durationMin),
      basePriceEuro: Math.round(basePriceEuro * 100) / 100,
      description: description.trim() || undefined,
      barberIds: assignedBarberIds,
      active,
      updatedAt: new Date().toISOString(),
    };

    try {
      await upsertServiceToSupabase(payload);
      await refresh();
      closeModal();
    } catch (error) {
      console.error("Failed to save service:", error);
      alert("Failed to save service.");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this service?")) return;

    try {
      await deleteServiceFromSupabase(id);
      await refresh();

      if (editingId === id) {
        closeModal();
      }
    } catch (error) {
      console.error("Failed to delete service:", error);
      alert("Failed to delete service.");
    }
  }

  function barberName(id: string) {
    return barbers.find((b) => b.id === id)?.name ?? id;
  }

  return (
    <WebShell title="Salon Services" subtitle="Create services and assign them to barbers.">
      <div className="mx-auto max-w-6xl" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/portal/salon" className="btn btn-secondary">
            ← Back to salon dashboard
          </Link>
          <Link href="/portal/salon/staff" className="btn btn-secondary">
            Staff
          </Link>
          <Link href="/portal/salon/bookings" className="btn btn-secondary">
            Bookings
          </Link>
          <button className="btn btn-primary" onClick={openCreate}>
            + New service
          </button>
        </div>

        <div className="theme-card" style={{ padding: 16, borderRadius: 20 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 360px", minWidth: 240 }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Search services</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, category, description…"
                className="input"
                style={inputStyle}
              />
            </div>

            <div style={{ width: 320, maxWidth: "100%" }}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Filter by barber</div>
              <select
                value={filterBarberId}
                onChange={(e) => setFilterBarberId(e.target.value)}
                style={inputStyle}
              >
                <option value="all">All barbers</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
              <span className="theme-muted" style={{ fontSize: 13 }}>
                {loading ? "Loading..." : `${filtered.length} service(s)`}
              </span>
              <button className="btn btn-secondary" onClick={refresh}>
                Refresh
              </button>
            </div>
          </div>

          <div className="theme-muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5 }}>
            Customer pages and booking flow read services from Supabase. If a barber has no
            services, assign at least one here.
          </div>
        </div>

        <div className="theme-card" style={{ padding: 16, borderRadius: 20 }}>
          {loading ? (
            <div className="theme-muted" style={{ padding: 8 }}>
              Loading services...
            </div>
          ) : !filtered.length ? (
            <div className="theme-muted" style={{ padding: 8 }}>
              No services found.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filtered.map((s) => (
                <div
                  key={s.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.02)",
                    padding: 14,
                    display: "grid",
                    gap: 10,
                    opacity: s.active ? 1 : 0.65,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 220 }}>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>{s.name}</div>
                      <div className="theme-muted" style={{ marginTop: 4, fontSize: 13 }}>
                        {s.category} • {s.durationMin} min • {s.active ? "Active" : "Hidden"}
                      </div>
                      {s.description ? (
                        <div className="theme-muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
                          {s.description}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 950 }}>{fmtEUR(s.basePriceEuro || 0)}</span>
                      <button className="btn btn-secondary" onClick={() => openEdit(s)}>
                        Edit
                      </button>
                      <button className="btn btn-secondary" onClick={() => onDelete(s.id)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(s.barberIds ?? []).map((bid) => (
                      <span
                        key={bid}
                        style={{
                          display: "inline-flex",
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 900,
                          border: "1px solid rgba(0,0,0,0.10)",
                          background: "rgba(0,0,0,0.03)",
                        }}
                      >
                        {barberName(bid)}
                      </span>
                    ))}
                    {!s.barberIds?.length ? (
                      <span className="theme-muted" style={{ fontSize: 12 }}>
                        Not assigned to any barber
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {open ? (
          <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                display: "grid",
                placeItems: "center",
                padding: 16,
                zIndex: 9999,
              }}
              onClick={closeModal}
            >
              <div
                className="theme-card"
                style={{
                  width: "min(860px, calc(100vw - 32px))",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  padding: 22,
                  borderRadius: 28,
                  background: "white",
                  zIndex: 10000,
                }}
                onClick={(e) => e.stopPropagation()}
              >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 950, fontSize: 16 }}>
                  {editingId ? "Edit service" : "New service"}
                </div>
                <button className="btn btn-secondary" onClick={closeModal}>
                  Close
                </button>
              </div>

              <div className="divider" style={{ margin: "14px 0" }} />

              <div
                style={{
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                }}
              >
                <Field label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Haircut + wash"
                    style={inputStyle}
                  />
                </Field>

                <Field label="Category">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
                    style={inputStyle}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Duration (minutes)">
                  <input
                    type="number"
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    min={5}
                    max={240}
                    step={5}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Base price (€)">
                  <input
                    type="number"
                    value={basePriceEuro}
                    onChange={(e) => setBasePriceEuro(Number(e.target.value))}
                    min={0}
                    max={999}
                    step={1}
                    style={inputStyle}
                  />
                </Field>

                <Field label="Visible to customers">
                  <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
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

                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Description (optional)">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Short details customers will see…"
                      style={{ ...inputStyle, height: 90, paddingTop: 10 }}
                    />
                  </Field>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Assign to barbers</div>
                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    {barbers.map((b) => {
                      const isOn = assignedBarberIds.includes(b.id);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => toggleAssign(b.id)}
                          style={{
                            textAlign: "left",
                            padding: 12,
                            borderRadius: 16,
                            border: isOn
                              ? "1px solid rgba(0,0,0,0.20)"
                              : "1px solid rgba(0,0,0,0.08)",
                            background: isOn ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 900 }}>{b.name}</div>
                            <div className="theme-muted" style={{ fontSize: 12, marginTop: 2 }}>
                              {b.area}
                            </div>
                          </div>
                          <div style={{ fontWeight: 950 }}>{isOn ? "✓" : ""}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="theme-muted" style={{ marginTop: 8, fontSize: 12 }}>
                    Selected:{" "}
                    {assignedBarberIds.length
                      ? assignedBarberIds.map(barberName).join(", ")
                      : "none"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={onSave}>
                  {editingId ? "Save changes" : "Create service"}
                </button>
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
  height: 44,
  padding: "0 12px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "rgba(0,0,0,0.02)",
  outline: "none",
  fontWeight: 800,
};