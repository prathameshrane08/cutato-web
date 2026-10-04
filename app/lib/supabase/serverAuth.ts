import "server-only";

import { NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS, so every route that uses it must
// authorize the caller first with one of the helpers below.
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export type CallerProfile = {
  id: string;
  role: "customer" | "barber" | "salon" | null;
  salon_id: string | null;
  barber_id: string | null;
};

type AuthResult<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

function deny(status: 401 | 403, error: string): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function requireUser(request: Request): Promise<AuthResult<User>> {
  const token = bearerToken(request);
  if (!token) return deny(401, "Please log in again.");

  const { data, error } = await adminSupabase.auth.getUser(token);
  if (error || !data.user) return deny(401, "Your session has expired. Please log in again.");

  return { ok: true, value: data.user };
}

export async function requireProfile(
  request: Request
): Promise<AuthResult<{ user: User; profile: CallerProfile }>> {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("id, role, salon_id, barber_id")
    .eq("id", auth.value.id)
    .maybeSingle<CallerProfile>();

  if (!profile) return deny(403, "Your account has no Cutato profile.");

  return { ok: true, value: { user: auth.value, profile } };
}

function adminEmails() {
  return (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(request: Request): Promise<AuthResult<User>> {
  const auth = await requireUser(request);
  if (!auth.ok) return auth;

  const email = auth.value.email?.toLowerCase() ?? "";
  if (!email || !adminEmails().includes(email)) {
    return deny(403, "This account is not authorized for Cutato administration.");
  }

  return auth;
}
