"use client";

export type UserRole = "customer" | "barber" | "salon";

export type AuthUser = {
  name: string;
  email: string;
  role: UserRole;
  barberId?: string;
};

const STORAGE_KEY = "cutato_auth_user_v1";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const parsed = safeJsonParse<AuthUser>(localStorage.getItem(STORAGE_KEY));
  if (!parsed?.email || !parsed?.role) return null;

  return {
    name: String(parsed.name ?? ""),
    email: String(parsed.email),
    role:
      parsed.role === "customer" ||
      parsed.role === "barber" ||
      parsed.role === "salon"
        ? parsed.role
        : "customer",
    barberId: parsed.barberId ? String(parsed.barberId) : undefined,
  };
}

export function isLoggedIn(): boolean {
  return !!getAuthUser();
}

export function signIn(user: AuthUser): void {
  if (typeof window === "undefined") return;

  const normalized: AuthUser = {
    name: String(user.name ?? ""),
    email: String(user.email ?? "").trim().toLowerCase(),
    role: user.role,
    barberId: user.barberId ? String(user.barberId) : undefined,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function login(user: AuthUser): void {
  signIn(user);
}

export function signUp(input: {
  name: string;
  email: string;
  role?: UserRole;
  barberId?: string;
}): AuthUser {
  const user: AuthUser = {
    name: String(input.name ?? ""),
    email: String(input.email ?? "").trim().toLowerCase(),
    role: input.role ?? "customer",
    barberId: input.barberId ? String(input.barberId) : undefined,
  };

  signIn(user);
  return user;
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function logout(): void {
  signOut();
}

export function hasRole(role: UserRole): boolean {
  return getAuthUser()?.role === role;
}