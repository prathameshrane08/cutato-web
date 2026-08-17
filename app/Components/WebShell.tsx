"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  User,
} from "lucide-react";

import { getCurrentUser, signOutCustomer } from "@/app/lib/authSupabase";
import ThemeSwitcher from "./ThemeSwitcher";
import {
  getAuthUser,
  signIn,
  signOut,
  type UserRole,
} from "@/app/Components/auth";
import { getProfileByUserId } from "@/app/lib/profilesSupabase";
import { supabase } from "@/app/lib/supabase";

type HeaderUser = {
  name?: string;
  email: string;
  role: UserRole;
  barberId?: string;
  salonId?: string;
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
    let cancelled = false;

    async function syncUser() {
      try {
        const localUser = getAuthUser();

        //------------------------------------------------
        // If CUTATO local auth already exists, use it,
        // but repair missing barberId/salonId if needed.
        //------------------------------------------------

        if (localUser) {
          const needsPortalRepair =
            (localUser.role === "salon" && !localUser.salonId) ||
            (localUser.role === "barber" && !localUser.barberId);

          if (
            !needsPortalRepair ||
            !localUser.supabaseUserId
          ) {
            if (!cancelled) {
              setUser(localUser);
            }

            return;
          }

          const {
            data: profileRow,
            error: profileError,
          } = await supabase
            .from("profiles")
            .select(
              "id, name, email, role, barber_id, salon_id"
            )
            .eq(
              "id",
              localUser.supabaseUserId
            )
            .maybeSingle();

          if (profileError) {
            console.error(
              "WEBSHELL PROFILE REPAIR ERROR:",
              profileError
            );

            if (!cancelled) {
              setUser(localUser);
            }

            return;
          }

          if (profileRow) {
            const repairedUser = {
              name:
                profileRow.name ||
                localUser.name ||
                localUser.email.split("@")[0],

              email:
                profileRow.email ||
                localUser.email,

              role:
                (profileRow.role ||
                  localUser.role) as UserRole,

              barberId:
                profileRow.barber_id ||
                localUser.barberId ||
                undefined,

              salonId:
                profileRow.salon_id ||
                localUser.salonId ||
                undefined,

              supabaseUserId:
                localUser.supabaseUserId,
            };

            signIn(repairedUser);

            if (!cancelled) {
              setUser(repairedUser);
            }

            return;
          }

          if (!cancelled) {
            setUser(localUser);
          }

          return;
        }

        //------------------------------------------------
        // No CUTATO local auth:
        // restore from the current Supabase session.
        //------------------------------------------------

        const { data } =
          await getCurrentUser();

        const supabaseUser =
          data.user;

        if (!supabaseUser?.email) {
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        //------------------------------------------------
        // Existing helper is still useful for normal
        // profile fields.
        //------------------------------------------------

        const profile =
          await getProfileByUserId(
            supabaseUser.id
          );

        //------------------------------------------------
        // Load portal IDs directly because the current
        // profile helper does not expose salon_id.
        //------------------------------------------------

        const {
          data: portalProfile,
          error: portalProfileError,
        } = await supabase
          .from("profiles")
          .select(
            "barber_id, salon_id"
          )
          .eq(
            "id",
            supabaseUser.id
          )
          .maybeSingle();

        if (portalProfileError) {
          console.error(
            "WEBSHELL PORTAL PROFILE ERROR:",
            portalProfileError
          );
        }

        const restoredUser = {
          name:
            profile?.name ||
            supabaseUser.user_metadata?.name ||
            supabaseUser.email.split("@")[0] ||
            "Customer",

          email:
            supabaseUser.email,

          role:
            (profile?.role ||
              "customer") as UserRole,

          barberId:
            portalProfile?.barber_id ||
            profile?.barber_id ||
            undefined,

          salonId:
            portalProfile?.salon_id ||
            undefined,

          supabaseUserId:
            supabaseUser.id,
        };

        signIn(restoredUser);

        if (!cancelled) {
          setUser(restoredUser);
        }
      } catch (error) {
        console.error(
          "WEBSHELL AUTH SYNC ERROR:",
          error
        );

        if (!cancelled) {
          setUser(
            getAuthUser()
          );
        }
      }
    }

    void syncUser();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onLogout() {
    await signOutCustomer();
    signOut();

    setUser(null);
    router.replace("/");
    router.refresh();
  }

  const portalHref = useMemo(() => {
    if (!user) return null;
    if (user.role === "salon") return "/portal/salon";
    if (user.role === "barber") return "/portal/barber";
    return null;
  }, [user]);

  const displayName =
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "";

  const isPortalUser =
    user?.role === "salon" ||
    user?.role === "barber";

  return (
    <main className="min-h-screen bg-[#f6f6f7] text-neutral-950">
      <div className="hidden h-9 items-center justify-between bg-black px-6 text-xs font-bold text-white md:flex">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Live booking active
        </div>

        <div className="text-neutral-400">
          AI-powered grooming platform
        </div>

        <div className="text-neutral-400">
          Support • Dresden, Germany
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-5 px-4 py-3 md:px-6">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff355d] text-white shadow-lg shadow-[#ff355d]/20 transition group-hover:scale-105">
              <Scissors size={22} />
            </span>

            <div className="leading-none">
              <span className="block text-2xl font-black tracking-[-0.06em]">
                CUTATO
              </span>
              <span className="mt-1 hidden text-xs font-bold text-neutral-400 sm:block">
                AI-powered platform
              </span>
            </div>
          </Link>

          <nav className="hidden min-w-0 items-center justify-center gap-5 lg:flex">
            {user?.role === "salon" ? (
              <>
                <NavLink href="/portal/salon">Dashboard</NavLink>
                <NavLink href="/portal/salon/bookings">Bookings</NavLink>
                <NavLink href="/portal/salon/staff">Staff</NavLink>
                <NavLink href="/portal/salon/services">Services</NavLink>
                <NavLink href="/portal/salon/availability">Availability</NavLink>
              </>
            ) : user?.role === "barber" ? (
              <>
                <NavLink href="/portal/barber">Dashboard</NavLink>
                <NavLink href="/portal/barber/bookings">Bookings</NavLink>
                <NavLink href="/portal/barber/schedule">Schedule</NavLink>
                <NavLink href="/portal/barber/availability">Availability</NavLink>
              </>
            ) : (
              <>
                <NavLink href="/">Home</NavLink>
                <NavLink href="/#featured-barbers">Barbers</NavLink>
                <NavLink href="/portal/barber/apply">Become Barber</NavLink>
                <NavLink href="/portal/salon/apply">For Salons</NavLink>

                {user?.role === "customer" ? (
                  <NavLink href="/bookings">Bookings</NavLink>
                ) : null}
              </>
            )}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {!isPortalUser ? <ThemeSwitcher /> : null}

            {user ? (
              <>
                <UserPill name={displayName} role={user.role} />

                {user.role === "customer" ? (
                  <HeaderButton
                    href="/bookings"
                    icon={<CalendarCheck size={16} />}
                  >
                    My bookings
                  </HeaderButton>
                ) : null}

                {portalHref ? (
                  <HeaderButton
                    href={portalHref}
                    icon={<LayoutDashboard size={16} />}
                  >
                    Portal
                  </HeaderButton>
                ) : null}

                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-black shadow-sm transition hover:bg-neutral-50"
                >
                  <LogOut size={16} />
                  <span className="hidden xl:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-black shadow-sm"
                >
                  Login
                </Link>

                <Link
                  href="/signup"
                  className="rounded-full bg-[#ff355d] px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-[#ff355d]/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm md:hidden"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-black/5 bg-white px-4 py-4 md:hidden">
            <div className="grid gap-2">
              {user?.role === "salon" ? (
                <>
                  <MobileLink href="/portal/salon" onClick={() => setMobileOpen(false)}>
                    Dashboard
                  </MobileLink>
                  <MobileLink href="/portal/salon/bookings" onClick={() => setMobileOpen(false)}>
                    Bookings
                  </MobileLink>
                  <MobileLink href="/portal/salon/staff" onClick={() => setMobileOpen(false)}>
                    Staff
                  </MobileLink>
                  <MobileLink href="/portal/salon/services" onClick={() => setMobileOpen(false)}>
                    Services
                  </MobileLink>
                  <MobileLink href="/portal/salon/availability" onClick={() => setMobileOpen(false)}>
                    Availability
                  </MobileLink>
                  <MobileLink href="/portal/salon/settings" onClick={() => setMobileOpen(false)}>
                    Settings
                  </MobileLink>
                </>
              ) : user?.role === "barber" ? (
                <>
                  <MobileLink href="/portal/barber" onClick={() => setMobileOpen(false)}>
                    Dashboard
                  </MobileLink>
                  <MobileLink href="/portal/barber/bookings" onClick={() => setMobileOpen(false)}>
                    Bookings
                  </MobileLink>
                  <MobileLink href="/portal/barber/schedule" onClick={() => setMobileOpen(false)}>
                    Schedule
                  </MobileLink>
                  <MobileLink href="/portal/barber/availability" onClick={() => setMobileOpen(false)}>
                    Availability
                  </MobileLink>
                </>
              ) : (
                <>
                  <MobileLink href="/" onClick={() => setMobileOpen(false)}>
                    Home
                  </MobileLink>
                  <MobileLink href="/#featured-barbers" onClick={() => setMobileOpen(false)}>
                    Barbers
                  </MobileLink>
                  <MobileLink href="/portal/barber/apply" onClick={() => setMobileOpen(false)}>
                    Become Barber
                  </MobileLink>
                  <MobileLink href="/portal/salon/apply" onClick={() => setMobileOpen(false)}>
                    For Salons
                  </MobileLink>
                </>
              )}

              <div className="my-2 border-t border-black/10" />

              {user ? (
                <>
                  <div className="rounded-2xl bg-neutral-50 p-4">
                    <p className="font-black">{displayName}</p>
                    <p className="mt-1 text-xs font-bold capitalize text-[#ff355d]">
                      {user.role}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void onLogout()}
                    className="flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-3 font-black"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              ) : (
                <MobileLink href="/login" onClick={() => setMobileOpen(false)}>
                  Login
                </MobileLink>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <section className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 md:py-10">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff355d]">
            CUTATO
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-5xl">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-500 md:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>

        {children}
      </section>
    </main>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="whitespace-nowrap text-sm font-black text-neutral-600 transition hover:text-[#ff355d]"
    >
      {children}
    </Link>
  );
}

function UserPill({
  name,
  role,
}: {
  name: string;
  role: UserRole;
}) {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-neutral-50 px-3 py-2 lg:flex">
      <User size={15} className="text-[#ff355d]" />

      <span className="max-w-28 truncate text-sm font-black">
        {name}
      </span>

      <span className="rounded-full bg-[#ff355d]/10 px-2 py-1 text-[11px] font-black capitalize text-[#ff355d]">
        {role}
      </span>
    </div>
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
      className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-black shadow-sm transition hover:bg-neutral-50"
    >
      {icon}
      <span className="hidden xl:inline">{children}</span>
    </Link>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-2xl px-4 py-3 font-black hover:bg-neutral-50"
    >
      {children}
    </Link>
  );
}
