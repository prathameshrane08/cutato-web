"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, LayoutDashboard, LogOut, Menu, Scissors, User } from "lucide-react";
import { getCurrentUser, signOutCustomer } from "@/app/lib/authSupabase";
import ThemeSwitcher from "./ThemeSwitcher";
import { getAuthUser, signIn, signOut, type UserRole } from "@/app/Components/auth";
import { getProfileByUserId } from "@/app/lib/profilesSupabase";

type HeaderUser = {
  name?: string;
  email: string;
  role: UserRole;
  barberId?: string;
} | null;

export default function WebShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<HeaderUser>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
  async function syncUser() {
    const localUser = getAuthUser();

    if (localUser) {
      setUser(localUser);
      return;
    }

    const { data } = await getCurrentUser();
    const supabaseUser = data.user;

    if (supabaseUser?.email) {
  const profile = await getProfileByUserId(supabaseUser.id);

  const restoredUser = {
  name:
    profile?.name ||
    supabaseUser.user_metadata?.name ||
    supabaseUser.email.split("@")[0] ||
    "Customer",
  email: supabaseUser.email,
  role: profile?.role || "customer",
  barberId: profile?.barber_id || undefined,
};

signIn(restoredUser);
setUser(restoredUser);
} else {
  setUser(null);
}
  }

  syncUser();
}, []);

  async function onLogout() {
  await signOutCustomer();
  await signOut();

  setUser(null);
  router.push("/");
}

  const portalHref = useMemo(() => {
    if (!user) return null;
    if (user.role === "salon") return "/portal/salon";
    if (user.role === "barber") return "/portal/barber";
    return null;
  }, [user]);

  const displayName = user?.name?.trim() || user?.email || "";

  return (
    <main className="min-h-screen bg-[#f6f6f7] text-neutral-950">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff355d] text-white shadow-lg shadow-[#ff355d]/25 transition group-hover:scale-105">
              <Scissors size={20} />
            </span>

            <span>
              <span className="block text-lg font-black tracking-[-0.04em]">
                CUTATO
              </span>
              <span className="hidden text-xs font-bold text-neutral-400 sm:block">
                Barber booking platform
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/book">Book</NavLink>
            <NavLink href="/bookings">Bookings</NavLink>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeSwitcher />

            {user ? (
              <>
                <UserPill name={displayName} role={user.role} />

                {user.role === "customer" ? (
                  <HeaderButton href="/bookings" icon={<CalendarCheck size={16} />}>
                    My bookings
                  </HeaderButton>
                ) : null}

                {portalHref ? (
                  <HeaderButton href={portalHref} icon={<LayoutDashboard size={16} />}>
                    {user.role === "salon" ? "Salon portal" : "Barber portal"}
                  </HeaderButton>
                ) : null}

                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50"
                >
                  Login
                </Link>

                <Link
                  href="/signup"
                  className="rounded-full bg-[#ff355d] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:-translate-y-0.5 hover:bg-[#ff1f4c]"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-black/5 bg-white px-4 py-4 lg:hidden">
            <div className="grid gap-2">
              <MobileLink href="/" onClick={() => setMobileOpen(false)}>
                Home
              </MobileLink>
              <MobileLink href="/book" onClick={() => setMobileOpen(false)}>
                Book
              </MobileLink>
              <MobileLink href="/bookings" onClick={() => setMobileOpen(false)}>
                Bookings
              </MobileLink>

              <div className="my-2 border-t border-black/10" />

              {user ? (
                <>
                  <div className="rounded-3xl bg-neutral-50 p-4">
                    <p className="text-sm font-black">{displayName}</p>
                    <p className="mt-1 text-xs font-bold capitalize text-neutral-500">
                      {user.role}
                    </p>
                  </div>

                  {portalHref ? (
                    <MobileLink href={portalHref} onClick={() => setMobileOpen(false)}>
                      {user.role === "salon" ? "Salon portal" : "Barber portal"}
                    </MobileLink>
                  ) : null}

                  <button
                    onClick={onLogout}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-left text-sm font-black"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-center text-sm font-black"
                  >
                    Login
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-2xl bg-[#ff355d] px-4 py-3 text-center text-sm font-black text-white"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#ff355d]">
            Cutato
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] md:text-5xl">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">
              {subtitle}
            </p>
          ) : null}
        </div>

        {children}
      </div>
    </main>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-2.5 text-sm font-black text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
    >
      {children}
    </Link>
  );
}

function HeaderButton({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50"
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-black"
    >
      {children}
    </Link>
  );
}

function UserPill({ name, role }: { name: string; role: UserRole }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-black/10 bg-neutral-50 px-3 py-2">
      <User size={15} className="text-[#ff355d]" />
      <span className="max-w-[150px] truncate text-sm font-black">{name}</span>
      <span className="rounded-full bg-[#ff355d]/10 px-2 py-1 text-xs font-black capitalize text-[#ff355d]">
        {role}
      </span>
    </div>
  );
}