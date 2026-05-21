"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WebShell from "@/app/Components/WebShell";
import { requireSalonAuth } from "@/app/portal/_lib/portalAuth";
import {
  readSalonSettings,
  writeSalonSettings,
  type SalonSettings,
} from "@/app/lib/salonSettingsStore";
import { subscribeStoreUpdates } from "@/app/lib/storeEvents";

export default function SalonSettingsPage() {
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

  const [form, setForm] = useState<SalonSettings | null>(null);
  const [savedAt, setSavedAt] = useState<string>("");

  useEffect(() => {
    const load = () => {
      const current = readSalonSettings();
      setForm(current);
      setSavedAt(current.updatedAt ?? "");
    };

    load();

    const unsub = subscribeStoreUpdates((info) => {
      if (!info.key || info.key === "cutato_salon_settings_v1") {
        load();
      }
    });

    return unsub;
  }, []);

  function patch<K extends keyof SalonSettings>(key: K, value: SalonSettings[K]) {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  function onSave() {
    if (!form) return;

    const clean: SalonSettings = {
      ...form,
      salonName: form.salonName.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      website: form.website.trim(),
      currency: form.currency.trim() || "EUR",
      timezone: form.timezone.trim() || "Europe/Berlin",
      cancellationPolicy: form.cancellationPolicy.trim(),
      openingNote: form.openingNote.trim(),
      logoUrl: form.logoUrl.trim(),
      coverImageUrl: form.coverImageUrl.trim(),
    };

    writeSalonSettings(clean);

    const updated = readSalonSettings();
    setForm(updated);
    setSavedAt(updated.updatedAt ?? "");

    alert("Salon settings saved.");
  }

  function onResetChanges() {
    const current = readSalonSettings();
    setForm(current);
    setSavedAt(current.updatedAt ?? "");
  }

  if (!form) {
    return (
      <WebShell title="Salon Settings" subtitle="Manage your public salon information and policies.">
        <div className="mx-auto max-w-6xl">
          <div className="theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 950 }}>Loading settings…</div>
          </div>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell title="Salon Settings" subtitle="Manage your public salon information and policies.">
      <div className="mx-auto max-w-6xl" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/portal/salon" className="btn btn-secondary">
            ← Salon dashboard
          </Link>
          <Link href="/portal/salon/bookings" className="btn btn-secondary">
            Bookings
          </Link>
          <Link href="/portal/salon/staff" className="btn btn-secondary">
            Staff
          </Link>
          <Link href="/portal/salon/services" className="btn btn-secondary">
            Services
          </Link>
          <Link href="/portal/salon/availability" className="btn btn-secondary">
            Availability
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 theme-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Salon profile</div>
            <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
              This information is used across the customer booking flow and confirmation pages.
            </div>

            <div className="divider" style={{ margin: "14px 0" }} />

            <div
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              }}
            >
              <Field label="Salon name">
                <input
                  value={form.salonName}
                  onChange={(e) => patch("salonName", e.target.value)}
                  placeholder="Cutato Studio"
                  style={inputStyle}
                />
              </Field>

              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => patch("phone", e.target.value)}
                  placeholder="+49 ..."
                  style={inputStyle}
                />
              </Field>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Address">
                  <input
                    value={form.address}
                    onChange={(e) => patch("address", e.target.value)}
                    placeholder="Street, postal code, city"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) => patch("email", e.target.value)}
                  placeholder="hello@cutato.com"
                  style={inputStyle}
                />
              </Field>

              <Field label="Website">
                <input
                  value={form.website}
                  onChange={(e) => patch("website", e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </Field>

              <Field label="Currency">
                <input
                  value={form.currency}
                  onChange={(e) => patch("currency", e.target.value)}
                  placeholder="EUR"
                  style={inputStyle}
                />
              </Field>

              <Field label="Timezone">
                <input
                  value={form.timezone}
                  onChange={(e) => patch("timezone", e.target.value)}
                  placeholder="Europe/Berlin"
                  style={inputStyle}
                />
              </Field>

              <Field label="Logo URL">
                <input
                  value={form.logoUrl}
                  onChange={(e) => patch("logoUrl", e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </Field>

              <Field label="Cover image URL">
                <input
                  value={form.coverImageUrl}
                  onChange={(e) => patch("coverImageUrl", e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </Field>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Cancellation policy">
                  <textarea
                    value={form.cancellationPolicy}
                    onChange={(e) => patch("cancellationPolicy", e.target.value)}
                    placeholder="Please cancel at least 12 hours in advance..."
                    style={{ ...inputStyle, height: 110, paddingTop: 10 }}
                  />
                </Field>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Customer-facing note">
                  <textarea
                    value={form.openingNote}
                    onChange={(e) => patch("openingNote", e.target.value)}
                    placeholder="Welcome note, parking info, arrival instructions..."
                    style={{ ...inputStyle, height: 110, paddingTop: 10 }}
                  />
                </Field>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              <button className="btn btn-secondary" onClick={onResetChanges}>
                Reset changes
              </button>
              <button className="btn btn-primary" onClick={onSave}>
                Save settings
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14, height: "fit-content" }}>
            <div className="theme-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Preview</div>
              <div className="theme-muted" style={{ marginTop: 6, fontSize: 13 }}>
                A quick summary of what customers will see.
              </div>

              <div className="divider" style={{ margin: "14px 0" }} />

              <PreviewRow label="Salon" value={form.salonName || "—"} />
              <PreviewRow label="Address" value={form.address || "—"} />
              <PreviewRow label="Phone" value={form.phone || "—"} />
              <PreviewRow label="Email" value={form.email || "—"} />
              <PreviewRow label="Website" value={form.website || "—"} />
              <PreviewRow label="Currency" value={form.currency || "EUR"} />
              <PreviewRow label="Timezone" value={form.timezone || "Europe/Berlin"} />
              <PreviewRow label="Logo URL" value={form.logoUrl || "—"} />
              <PreviewRow label="Cover image URL" value={form.coverImageUrl || "—"} />
            </div>

            <div className="theme-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Status</div>
              <div className="divider" style={{ margin: "14px 0" }} />
              <div className="theme-muted" style={{ fontSize: 13 }}>
                Last saved:
              </div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>
                {savedAt ? new Date(savedAt).toLocaleString() : "Not saved yet"}
              </div>
            </div>
          </div>
        </div>
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

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
      <div className="theme-muted" style={{ fontSize: 12, fontWeight: 800 }}>
        {label}
      </div>
      <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.4 }}>{value}</div>
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