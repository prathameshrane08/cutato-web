// app/lib/requireAuth.ts
"use client";

import { getAuthUser } from "@/app/Components/auth";

export function requireAuth(nextUrl: string) {
  const u = getAuthUser();
  if (u) return { ok: true as const, user: u };

  const next = encodeURIComponent(nextUrl);
  return { ok: false as const, redirectTo: `/login?next=${next}` };
}
