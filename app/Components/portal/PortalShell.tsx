"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getAuthUser, signOut } from "@/app/Components/auth";

import { signOutCustomer } from "@/app/lib/authSupabase";

import { useHydrated } from "@/app/lib/useHydrated";

type PortalRole = "salon" | "barber";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  tone?: "default" | "warning" | "success";
};

type Props = {
  role: PortalRole;
  title: string;
  subtitle?: string;
  children: React.ReactNode;

  todayBookings?: number;
  pendingBookings?: number;
  upcomingBookings?: number;
  cancellationRate?: number;

  hideHeader?: boolean;
};

function navForRole(role: PortalRole): NavItem[] {
  if (role === "salon") {
    return [
      {
        href: "/portal/salon",
        label: "Overview",
        icon: <LayoutDashboard size={18} />,
      },
      {
        href: "/portal/salon/bookings",
        label: "Bookings",
        icon: <CalendarDays size={18} />,
      },
      {
        href: "/portal/salon/staff",
        label: "Staff",
        icon: <Users size={18} />,
      },
      {
        href: "/portal/salon/services",
        label: "Services",
        icon: <Scissors size={18} />,
      },
      {
        href: "/portal/salon/availability",
        label: "Availability",
        icon: <Clock3 size={18} />,
      },
      {
        href: "/portal/salon/settings",
        label: "Settings",
        icon: <Settings size={18} />,
      },
    ];
  }

  return [
    {
      href: "/portal/barber",
      label: "Overview",
      icon: <LayoutDashboard size={18} />,
    },
    {
      href: "/portal/barber/bookings",
      label: "Bookings",
      icon: <CalendarDays size={18} />,
    },
    {
      href: "/portal/barber/schedule",
      label: "Schedule",
      icon: <Clock3 size={18} />,
    },
    {
      href: "/portal/barber/availability",
      label: "Availability",
      icon: <Settings size={18} />,
    },
    {
      href: "/portal/barber/services",
      label: "Services",
      icon: <Scissors size={18} />,
    },
    {
      href: "/portal/barber/earnings",
      label: "Earnings",
      icon: <WalletCards size={18} />,
    },
  ];
}

function isActive(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  if (href === "/portal/salon" || href === "/portal/barber") {
    return false;
  }

  return pathname.startsWith(`${href}/`);
}

export default function PortalShell({
  role,
  title,
  subtitle,
  children,

  todayBookings = 0,
  pendingBookings = 0,
  upcomingBookings = 0,
  cancellationRate = 0,

  hideHeader = false,
}: Props) {
  const pathname = usePathname();

  // IMPORTANT: do not read localStorage during the initial render.
  // The server renders this Client Component too, so browser-only auth data
  // must be loaded after hydration.
  const hydrated = useHydrated();

  const authUser = useMemo(() => (hydrated ? getAuthUser() : null), [hydrated]);

  const [mobileOpen, setMobileOpen] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement | null>(null);

  const profileRef = useRef<HTMLDivElement | null>(null);

  const nav = useMemo(() => navForRole(role), [role]);

  const displayName =
    authUser?.name?.trim() || authUser?.email || (role === "salon" ? "Salon" : "Barber");

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    if (todayBookings > 0) {
      items.push({
        id: "today",
        title: `${todayBookings} booking${todayBookings === 1 ? "" : "s"} today`,
        description:
          role === "salon"
            ? "Appointments are scheduled for your salon today."
            : "You have appointments scheduled today.",
        tone: "success",
      });
    }

    if (pendingBookings > 0) {
      items.push({
        id: "pending",
        title: `${pendingBookings} pending booking${pendingBookings === 1 ? "" : "s"}`,
        description: "Review bookings that may need confirmation.",
        tone: "warning",
      });
    }

    if (upcomingBookings > 0) {
      items.push({
        id: "upcoming",
        title: `${upcomingBookings} upcoming`,
        description: "Upcoming appointments are ready to review.",
      });
    }

    if (cancellationRate >= 10) {
      items.push({
        id: "cancellation",
        title: "Cancellation rate needs attention",
        description: `Cancellation / no-show rate is ${cancellationRate}%.`,
        tone: "warning",
      });
    }

    if (items.length === 0) {
      items.push({
        id: "clear",
        title: "All caught up",
        description: "There are no operational alerts right now.",
        tone: "success",
      });
    }

    return items;
  }, [role, todayBookings, pendingBookings, upcomingBookings, cancellationRate]);

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationsOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOutside);

    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  async function logout() {
    try {
      await signOutCustomer();
    } catch {
      // Local CUTATO auth is still cleared below.
    }

    signOut();

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#f6f6f7] text-neutral-950">
      {/* ==================================================
          DESKTOP SIDEBAR
      ================================================== */}

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[260px] border-r border-white/10 bg-neutral-950 text-white lg:flex lg:flex-col">
        <div className="flex h-24 items-center border-b border-white/10 px-6">
          <Link
            href={role === "salon" ? "/portal/salon" : "/portal/barber"}
            className="flex items-center gap-3"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff355d] shadow-lg shadow-[#ff355d]/20">
              <Scissors size={22} />
            </span>

            <div>
              <p className="text-2xl font-black tracking-[-0.06em]">CUTATO</p>

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                {role} workspace
              </p>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
            Workspace
          </p>

          <nav className="mt-3 grid gap-1">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-black transition ${
                    active
                      ? "bg-white text-neutral-950 shadow-lg"
                      : "text-white/55 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={active ? "text-[#ff355d]" : ""}>{item.icon}</span>

                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-[22px] bg-white/5 p-4">
            <p className="truncate text-sm font-black">{displayName}</p>

            <p className="mt-1 truncate text-xs font-semibold text-white/35">
              {authUser?.email ?? ""}
            </p>

            <button
              type="button"
              onClick={logout}
              className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black text-red-300 transition hover:bg-red-400/10"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ==================================================
          MOBILE TOP BAR
      ================================================== */}

      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-xl lg:hidden">
        <div className="flex h-[72px] items-center justify-between px-4">
          <Link
            href={role === "salon" ? "/portal/salon" : "/portal/barber"}
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff355d] text-white">
              <Scissors size={19} />
            </span>

            <div>
              <p className="text-xl font-black tracking-[-0.05em]">CUTATO</p>

              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400">
                {role} workspace
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* ==================================================
          MOBILE DRAWER
      ================================================== */}

      {mobileOpen ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />

          <aside className="absolute inset-y-0 left-0 w-[min(320px,86vw)] bg-neutral-950 p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between px-2 py-3">
              <div>
                <p className="text-xl font-black">{displayName}</p>

                <p className="mt-1 text-xs font-semibold text-white/35">{authUser?.email ?? ""}</p>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="mt-5 grid gap-1">
              {nav.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-black ${
                      active
                        ? "bg-white text-neutral-950"
                        : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={logout}
              className="mt-6 flex w-full items-center gap-3 rounded-2xl bg-red-400/10 px-4 py-3.5 text-sm font-black text-red-300"
            >
              <LogOut size={17} />
              Logout
            </button>
          </aside>
        </div>
      ) : null}

      {/* ==================================================
          APP CONTENT
      ================================================== */}

      <div className="lg:pl-[260px]">
        {/* TOP APP BAR */}

        <div className="sticky top-0 z-30 hidden h-20 items-center justify-end border-b border-black/5 bg-white/85 px-6 backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-2">
            {/* NOTIFICATIONS */}

            <div ref={notificationRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((current) => !current);

                  setProfileOpen(false);
                }}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-neutral-50 transition hover:bg-white"
              >
                <Bell size={18} />

                {notifications.some((item) => item.id !== "clear") ? (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#ff355d]" />
                ) : null}
              </button>

              {notificationsOpen ? (
                <div className="absolute right-0 top-14 w-[360px] rounded-[24px] border border-black/10 bg-white p-3 shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
                  <div className="px-2 pb-3 pt-1">
                    <p className="text-sm font-black">Notifications</p>

                    <p className="mt-1 text-xs font-bold text-neutral-400">Operational alerts</p>
                  </div>

                  <div className="grid gap-2">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-[18px] border p-4 ${
                          item.tone === "warning"
                            ? "border-amber-200 bg-amber-50"
                            : item.tone === "success"
                              ? "border-emerald-100 bg-emerald-50"
                              : "border-black/5 bg-neutral-50"
                        }`}
                      >
                        <p className="text-sm font-black">{item.title}</p>

                        <p className="mt-1 text-xs font-semibold leading-5 text-neutral-500">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* PROFILE */}

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((current) => !current);

                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-3 py-2 transition hover:bg-white"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#ff355d] text-sm font-black text-white">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>

                <span className="text-left">
                  <span className="block max-w-[160px] truncate text-xs font-black">
                    {displayName}
                  </span>

                  <span className="block text-[10px] font-black uppercase tracking-wide text-neutral-400">
                    {role}
                  </span>
                </span>

                <ChevronDown size={15} className="text-neutral-400" />
              </button>

              {profileOpen ? (
                <div className="absolute right-0 top-14 w-64 rounded-[24px] border border-black/10 bg-white p-3 shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
                  <div className="rounded-[18px] bg-neutral-50 p-4">
                    <p className="truncate text-sm font-black">{displayName}</p>

                    <p className="mt-1 truncate text-xs font-semibold text-neutral-400">
                      {authUser?.email ?? ""}
                    </p>

                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#ff355d]">
                      CUTATO {role}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={logout}
                    className="mt-2 flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* PAGE */}

        <div className="px-4 py-6 md:px-6 lg:px-8 lg:py-8">
          {!hideHeader ? (
            <div className="mb-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff355d]">
                CUTATO {role}
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] md:text-5xl">{title}</h1>

              {subtitle ? (
                <p className="mt-3 max-w-2xl text-base leading-7 text-neutral-500">{subtitle}</p>
              ) : null}
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </main>
  );
}
