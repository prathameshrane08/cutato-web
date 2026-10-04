"use client";

import Link from "next/link";
import { useMemo } from "react";
import PortalShell from "@/app/Components/portal/PortalShell";
import DashboardSkeleton from "@/app/Components/portal/DashboardSkeleton";
import type { AuthUser } from "@/app/Components/auth";
import { requireRole } from "@/app/portal/_lib/portalAuth";
import { useHydrated } from "@/app/lib/useHydrated";

type PortalRole = "salon" | "barber";

// The local session lives in localStorage, so it is only readable after hydration.
// Rendering a skeleton on the server and first client pass avoids hydration mismatches
// and keeps hook order stable in the pages that sit behind this gate.
export function useRoleAuth(role: PortalRole) {
  const hydrated = useHydrated();

  return useMemo(() => (hydrated ? requireRole(role) : null), [hydrated, role]);
}

type Props = {
  role: PortalRole;
  title: string;
  children: (user: AuthUser) => React.ReactNode;
};

export default function RoleGate({ role, title, children }: Props) {
  const auth = useRoleAuth(role);

  if (!auth) {
    return (
      <PortalShell role={role} title={title} subtitle="Loading...">
        <DashboardSkeleton />
      </PortalShell>
    );
  }

  if (!auth.ok) {
    return (
      <PortalShell
        role={role}
        title="Access denied"
        subtitle={`${role === "salon" ? "Salon" : "Barber"} account required.`}
      >
        <div className="mx-auto max-w-4xl rounded-[28px] border border-black/10 bg-white p-8">
          <h2 className="text-xl font-black">
            {auth.reason === "not_logged_in" ? "Please log in" : "Wrong account type"}
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            This page is only available for {role} accounts.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/portal/${role}`)}`}
            className="mt-6 inline-flex rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white"
          >
            Log in
          </Link>
        </div>
      </PortalShell>
    );
  }

  return <>{children(auth.user)}</>;
}
