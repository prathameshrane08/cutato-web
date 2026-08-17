"use client";

export type UserRole =
  | "customer"
  | "barber"
  | "salon";

export type AuthUser = {
  name: string;
  email: string;
  role: UserRole;

  barberId?: string;
  salonId?: string;

  supabaseUserId?: string;
};

const STORAGE_KEY =
  "cutato_auth_user_v1";

function safeJsonParse<T>(
  raw: string | null
): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getAuthUser():
  | AuthUser
  | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const parsed =
    safeJsonParse<AuthUser>(
      localStorage.getItem(
        STORAGE_KEY
      )
    );

  if (
    !parsed?.email ||
    !parsed?.role
  ) {
    return null;
  }

  const role: UserRole =
    parsed.role === "customer" ||
    parsed.role === "barber" ||
    parsed.role === "salon"
      ? parsed.role
      : "customer";

  return {
    name: String(
      parsed.name ?? ""
    ),

    email: String(
      parsed.email
    )
      .trim()
      .toLowerCase(),

    role,

    barberId:
      parsed.barberId
        ? String(
            parsed.barberId
          )
        : undefined,

    salonId:
      parsed.salonId
        ? String(
            parsed.salonId
          )
        : undefined,

    supabaseUserId:
      parsed.supabaseUserId
        ? String(
            parsed.supabaseUserId
          )
        : undefined,
  };
}

export function isLoggedIn(): boolean {
  return Boolean(
    getAuthUser()
  );
}

export function signIn(
  user: AuthUser
): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const normalized: AuthUser = {
    name: String(
      user.name ?? ""
    ),

    email: String(
      user.email ?? ""
    )
      .trim()
      .toLowerCase(),

    role: user.role,

    barberId:
      user.barberId
        ? String(
            user.barberId
          )
        : undefined,

    salonId:
      user.salonId
        ? String(
            user.salonId
          )
        : undefined,

    supabaseUserId:
      user.supabaseUserId
        ? String(
            user.supabaseUserId
          )
        : undefined,
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      normalized
    )
  );
}

export function login(
  user: AuthUser
): void {
  signIn(user);
}

export function signUp(
  input: {
    name: string;
    email: string;
    role?: UserRole;

    barberId?: string;
    salonId?: string;

    supabaseUserId?: string;
  }
): AuthUser {
  const user: AuthUser = {
    name: String(
      input.name ?? ""
    ),

    email: String(
      input.email ?? ""
    )
      .trim()
      .toLowerCase(),

    role:
      input.role ??
      "customer",

    barberId:
      input.barberId
        ? String(
            input.barberId
          )
        : undefined,

    salonId:
      input.salonId
        ? String(
            input.salonId
          )
        : undefined,

    supabaseUserId:
      input.supabaseUserId
        ? String(
            input.supabaseUserId
          )
        : undefined,
  };

  signIn(user);

  return user;
}

export function signOut(): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    STORAGE_KEY
  );
}

export function logout(): void {
  signOut();
}

export function hasRole(
  role: UserRole
): boolean {
  return (
    getAuthUser()?.role ===
    role
  );
}