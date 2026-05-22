"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import WebShell from "@/app/Components/WebShell";

type Application = {
  id: string;

  type: string;
  status: string;

  name?: string;
  owner_name?: string;

  salon_name?: string;

  email: string;
  phone?: string;

  city?: string;
  address?: string;

  experience?: string;
  instagram?: string;

  created_at: string;
};

export default function AdminApplicationsPage() {
  const supabase = createClient();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadApplications() {
    setLoading(true);

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setApplications(data);
    }

    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("applications")
      .update({
        status,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadApplications();
  }

  async function approveApplication(id: string) {
  const res = await fetch("/api/admin/applications/approve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      applicationId: id,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Approval failed");
    return;
  }

  alert(
    `Approved successfully.\n\nLogin email: ${data.email}\nTemporary password: ${data.temporaryPassword}`
  );

  loadApplications();
}

  useEffect(() => {
    loadApplications();
  }, []);

  return (
    <WebShell
      title="Applications"
      subtitle="Review barber and salon applications."
    >
      <div className="grid gap-5">
        {loading ? (
          <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
            Loading applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
            No applications yet.
          </div>
        ) : (
          applications.map((app) => (
            <div
              key={app.id}
              className="rounded-[32px] border border-black/10 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex rounded-full bg-[#ff355d]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
                    {app.type}
                  </div>

                  <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">
                    {app.type === "barber"
                      ? app.name
                      : app.salon_name}
                  </h2>

                  <p className="mt-2 text-sm text-neutral-500">
                    {app.email}
                  </p>
                </div>

                <div
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    app.status === "approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : app.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {app.status}
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {app.phone ? (
                  <Info label="Phone" value={app.phone} />
                ) : null}

                {app.city ? (
                  <Info label="City" value={app.city} />
                ) : null}

                {app.experience ? (
                  <Info label="Experience" value={app.experience} />
                ) : null}

                {app.instagram ? (
                  <Info label="Instagram" value={app.instagram} />
                ) : null}

                {app.owner_name ? (
                  <Info label="Owner" value={app.owner_name} />
                ) : null}

                {app.address ? (
                  <Info label="Address" value={app.address} />
                ) : null}
              </div>

              {app.status === "pending" ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={() => approveApplication(app.id)
                    }
                    className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() =>
                      updateStatus(app.id, "rejected")
                    }
                    className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white"
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </WebShell>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-neutral-800">
        {value}
      </p>
    </div>
  );
}