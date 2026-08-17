"use client";

import { useEffect, useMemo, useState } from "react";

import WebShell from "@/app/Components/WebShell";

type Application = {
  id: string;

  type: "barber" | "salon" | string;
  status: "pending" | "approved" | "rejected" | string;

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

type Filter =
  | "all"
  | "pending"
  | "approved"
  | "rejected";

export default function AdminApplicationsPage() {
  const [applications, setApplications] =
    useState<Application[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<Filter>("all");

  //--------------------------------------------------
  // Load applications
  //--------------------------------------------------

  async function loadApplications() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/applications",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Could not load applications."
        );
      }

      setApplications(
        result.applications ?? []
      );
    } catch (error) {
      console.error(
        "LOAD APPLICATIONS ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unexpected error while loading applications."
      );

      setApplications([]);
    } finally {
      setLoading(false);
    }
  }

  //--------------------------------------------------
  // Approve application
  //--------------------------------------------------

  async function approveApplication(
    id: string
  ) {
    try {
      setActionId(id);

      const response = await fetch(
        "/api/admin/applications",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            applicationId: id,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "APPROVAL RESPONSE:",
        data
      );

      if (!response.ok) {
        alert(
          data.error ||
            "Approval failed."
        );

        return;
      }

      const emailStatus =
        data.emailSent
          ? "Email sent successfully ✅"
          : "Email was NOT sent ⚠️";

      alert(
        [
          "Application approved successfully.",
          "",
          `Role: ${data.role}`,
          `Login email: ${data.email}`,
          `Temporary password: ${data.temporaryPassword}`,
          "",
          emailStatus,
          "",
          "Use these credentials to test the portal login.",
        ].join("\n")
      );

      await loadApplications();
    } catch (error) {
      console.error(
        "APPROVAL ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Approval failed."
      );
    } finally {
      setActionId(null);
    }
  }

  //--------------------------------------------------
  // Reject application
  //--------------------------------------------------

  async function rejectApplication(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to reject this application?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(id);

      const response = await fetch(
        "/api/admin/applications",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            applicationId: id,
            status: "rejected",
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not reject application."
        );
      }

      await loadApplications();
    } catch (error) {
      console.error(
        "REJECTION ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Could not reject application."
      );
    } finally {
      setActionId(null);
    }
  }

  //--------------------------------------------------
  // Stats
  //--------------------------------------------------

  const stats = useMemo(() => {
    const pending =
      applications.filter(
        (application) =>
          application.status ===
          "pending"
      ).length;

    const approved =
      applications.filter(
        (application) =>
          application.status ===
          "approved"
      ).length;

    const rejected =
      applications.filter(
        (application) =>
          application.status ===
          "rejected"
      ).length;

    return {
      total:
        applications.length,

      pending,

      approved,

      rejected,
    };
  }, [applications]);

  //--------------------------------------------------
  // Filter
  //--------------------------------------------------

  const visibleApplications =
    useMemo(() => {
      if (filter === "all") {
        return applications;
      }

      return applications.filter(
        (application) =>
          application.status ===
          filter
      );
    }, [applications, filter]);

  //--------------------------------------------------
  // Initial load
  //--------------------------------------------------

  useEffect(() => {
    void loadApplications();
  }, []);

  return (
    <WebShell
      title="Admin"
      subtitle="Review and manage Cutato barber and salon applications."
    >
      <div className="mx-auto max-w-7xl">
        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="rounded-[36px] bg-neutral-950 p-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff355d]">
              Cutato Administration
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-6xl">
              Applications
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-white/60">
              Review new barber and salon
              applications, approve accounts
              and manage application status.
            </p>
          </div>
        </div>

        {/* ==========================================
            STATS
        ========================================== */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total"
            value={stats.total}
          />

          <StatCard
            label="Pending"
            value={stats.pending}
          />

          <StatCard
            label="Approved"
            value={stats.approved}
          />

          <StatCard
            label="Rejected"
            value={stats.rejected}
          />
        </div>

        {/* ==========================================
            FILTERS
        ========================================== */}

        <div className="mt-8 flex flex-wrap gap-2">
          <FilterButton
            active={
              filter === "all"
            }
            label="All"
            onClick={() =>
              setFilter("all")
            }
          />

          <FilterButton
            active={
              filter === "pending"
            }
            label={`Pending (${stats.pending})`}
            onClick={() =>
              setFilter("pending")
            }
          />

          <FilterButton
            active={
              filter === "approved"
            }
            label={`Approved (${stats.approved})`}
            onClick={() =>
              setFilter("approved")
            }
          />

          <FilterButton
            active={
              filter === "rejected"
            }
            label={`Rejected (${stats.rejected})`}
            onClick={() =>
              setFilter("rejected")
            }
          />
        </div>

        {/* ==========================================
            APPLICATIONS
        ========================================== */}

        <div className="mt-6 grid gap-5">
          {loading ? (
            <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
              <p className="font-black">
                Loading applications...
              </p>
            </div>
          ) : visibleApplications.length ===
            0 ? (
            <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
              <h2 className="text-xl font-black">
                No applications
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                There are no applications in
                this category.
              </p>
            </div>
          ) : (
            visibleApplications.map(
              (application) => {
                const isProcessing =
                  actionId ===
                  application.id;

                const displayName =
                  application.type ===
                  "salon"
                    ? application.salon_name ||
                      application.owner_name ||
                      "Unnamed salon"
                    : application.name ||
                      "Unnamed barber";

                return (
                  <article
                    key={
                      application.id
                    }
                    className="rounded-[32px] border border-black/10 bg-white p-6 shadow-sm md:p-8"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-5">
                      <div>
                        <div className="inline-flex rounded-full bg-[#ff355d]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff355d]">
                          {
                            application.type
                          }
                        </div>

                        <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">
                          {
                            displayName
                          }
                        </h2>

                        <p className="mt-2 text-sm font-bold text-neutral-500">
                          {
                            application.email
                          }
                        </p>

                        <p className="mt-2 text-xs font-bold text-neutral-400">
                          Applied{" "}
                          {formatDate(
                            application.created_at
                          )}
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          application.status
                        }
                      />
                    </div>

                    <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {application.owner_name ? (
                        <Info
                          label="Owner"
                          value={
                            application.owner_name
                          }
                        />
                      ) : null}

                      {application.phone ? (
                        <Info
                          label="Phone"
                          value={
                            application.phone
                          }
                        />
                      ) : null}

                      {application.city ? (
                        <Info
                          label="City"
                          value={
                            application.city
                          }
                        />
                      ) : null}

                      {application.address ? (
                        <Info
                          label="Address"
                          value={
                            application.address
                          }
                        />
                      ) : null}

                      {application.experience ? (
                        <Info
                          label="Experience"
                          value={
                            application.experience
                          }
                        />
                      ) : null}

                      {application.instagram ? (
                        <Info
                          label="Instagram"
                          value={
                            application.instagram
                          }
                        />
                      ) : null}
                    </div>

                    {application.status ===
                    "pending" ? (
                      <div className="mt-8 flex flex-wrap gap-3 border-t border-black/10 pt-6">
                        <button
                          type="button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            void approveApplication(
                              application.id
                            )
                          }
                          className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isProcessing
                            ? "Processing..."
                            : "Approve"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            void rejectApplication(
                              application.id
                            )
                          }
                          className="rounded-full bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              }
            )
          )}
        </div>
      </div>
    </WebShell>
  );
}

//==================================================
// STAT CARD
//==================================================

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </p>

      <p className="mt-3 text-4xl font-black tracking-[-0.04em] text-neutral-950">
        {value}
      </p>
    </div>
  );
}

//==================================================
// FILTER BUTTON
//==================================================

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-3 text-sm font-black transition ${
        active
          ? "bg-neutral-950 text-white"
          : "border border-black/10 bg-white text-neutral-700 hover:bg-neutral-50"
      }`}
    >
      {label}
    </button>
  );
}

//==================================================
// STATUS
//==================================================

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles =
    status === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : status === "rejected"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-700";

  return (
    <div
      className={`rounded-full px-4 py-2 text-sm font-black capitalize ${styles}`}
    >
      {status}
    </div>
  );
}

//==================================================
// INFO
//==================================================

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

      <p className="mt-2 break-words text-sm font-bold text-neutral-800">
        {value}
      </p>
    </div>
  );
}

//==================================================
// DATE
//==================================================

function formatDate(
  value: string
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}