"use client";

import { getAuthUser } from "@/app/Components/auth";

export function requireRole(expectedRole: "customer" | "barber" | "salon") {
  const user = getAuthUser();

  if (!user) {
    return { ok: false as const, reason: "not_logged_in" as const, user: null };
  }

  if (user.role !== expectedRole) {
    return { ok: false as const, reason: "wrong_role" as const, user };
  }

  return { ok: true as const, reason: null, user };
}

export function requireSalonAuth() {
  return requireRole("salon");
}

export function requireBarberAuth() {
  return requireRole("barber");
}

export function requireCustomerAuth() {
  return requireRole("customer");
}

export function requirePortalSalonAuth() {
  return requireSalonAuth();
}