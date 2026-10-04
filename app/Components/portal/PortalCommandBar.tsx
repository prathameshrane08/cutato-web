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
  Scissors,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { signOut } from "@/app/Components/auth";

import { signOutCustomer } from "@/app/lib/authSupabase";

type PortalRole = "salon" | "barber";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  tone?: "default" | "warning" | "success";
};

type Props = {
  role: PortalRole;
  name: string;
  email?: string;
  todayBookings?: number;
  pendingBookings?: number;
  upcomingBookings?: number;
  cancellationRate?: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function getNav(role: PortalRole): NavItem[] {
  if (role === "salon") {
    return [
      {
        href: "/portal/salon",
        label: "Overview",
        icon: <LayoutDashboard size={16} />,
      },
      {
        href: "/portal/salon/bookings",
        label: "Bookings",
        icon: <CalendarDays size={16} />,
      },
      {
        href: "/portal/salon/staff",
        label: "Staff",
        icon: <Users size={16} />,
      },
      {
        href: "/portal/salon/services",
        label: "Services",
        icon: <Scissors size={16} />,
      },
      {
        href: "/portal/salon/availability",
        label: "Availability",
        icon: <Clock3 size={16} />,
      },
      {
        href: "/portal/salon/settings",
        label: "Settings",
        icon: <Settings size={16} />,
      },
    ];
  }

  return [
    {
      href: "/portal/barber",
      label: "Overview",
      icon: <LayoutDashboard size={16} />,
    },
    {
      href: "/portal/barber/bookings",
      label: "Bookings",
      icon: <CalendarDays size={16} />,
    },
    {
      href: "/portal/barber/schedule",
      label: "Schedule",
      icon: <Clock3 size={16} />,
    },
    {
      href: "/portal/barber/availability",
      label: "Availability",
      icon: <Settings size={16} />,
    },
    {
      href: "/portal/barber/earnings",
      label: "Earnings",
      icon: <WalletCards size={16} />,
    },
  ];
}

function isCurrentRoute(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  if (href === "/portal/salon" || href === "/portal/barber") {
    return false;
  }

  return pathname.startsWith(`${href}/`);
}

export default function PortalCommandBar({
  role,
  name,
  email,
  todayBookings = 0,
  pendingBookings = 0,
  upcomingBookings = 0,
  cancellationRate = 0,
}: Props) {
  const pathname = usePathname();

  const [notificationOpen, setNotificationOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement | null>(null);

  const profileRef = useRef<HTMLDivElement | null>(null);

  const nav = useMemo(() => getNav(role), [role]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const result: NotificationItem[] = [];

    if (todayBookings > 0) {
      result.push({
        id: "today",
        title: `${todayBookings} booking${todayBookings === 1 ? "" : "s"} today`,
        description:
          role === "salon"
            ? "Your salon has appointments scheduled today."
            : "You have appointments scheduled today.",
        tone: "success",
      });
    }

    if (pendingBookings > 0) {
      result.push({
        id: "pending",
        title: `${pendingBookings} pending booking${pendingBookings === 1 ? "" : "s"}`,
        description: "Review bookings that may need confirmation.",
        tone: "warning",
      });
    }

    if (upcomingBookings > 0) {
      result.push({
        id: "upcoming",
        title: `${upcomingBookings} upcoming`,
        description: "Upcoming appointments are ready to review.",
      });
    }

    if (cancellationRate >= 10) {
      result.push({
        id: "cancellation",
        title: "Cancellation rate needs attention",
        description: `Cancellation / no-show rate is ${cancellationRate}%.`,
        tone: "warning",
      });
    }

    if (result.length === 0) {
      result.push({
        id: "quiet",
        title: "All caught up",
        description: "There are no operational alerts right now.",
        tone: "success",
      });
    }

    return result;
  }, [role, todayBookings, pendingBookings, upcomingBookings, cancellationRate]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);

    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function logout() {
    try {
      await signOutCustomer();
    } catch {
      // local auth is still cleared below
    }

    signOut();

    window.location.href = "/";
  }

  return (
    <section className="mb-6 rounded-[28px] border border-black/10 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* PORTAL NAV */}

        <nav className="flex max-w-full gap-1 overflow-x-auto">
          {nav.map((item) => {
            const active = isCurrentRoute(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                  active
                    ? "bg-neutral-950 text-white shadow-sm"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT CONTROLS */}

        <div className="ml-auto flex items-center gap-2">
          {/* NOTIFICATIONS */}

          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationOpen((current) => !current);

                setProfileOpen(false);
              }}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-neutral-50 text-neutral-700 transition hover:bg-white"
              aria-label="Notifications"
            >
              <Bell size={18} />

              {notifications.some((item) => item.id !== "quiet") ? (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#ff355d]" />
              ) : null}
            </button>

            {notificationOpen ? (
              <div className="absolute right-0 top-14 z-[70] w-[min(360px,calc(100vw-32px))] rounded-[24px] border border-black/10 bg-white p-3 shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
                <div className="px-2 pb-3 pt-1">
                  <p className="text-sm font-black">Notifications</p>

                  <p className="mt-1 text-xs font-bold text-neutral-400">
                    Operational alerts from this dashboard
                  </p>
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

                setNotificationOpen(false);
              }}
              className="flex items-center gap-3 rounded-2xl border border-black/10 bg-neutral-50 px-3 py-2 transition hover:bg-white"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#ff355d] text-sm font-black text-white">
                {name.trim().slice(0, 1).toUpperCase() || "C"}
              </span>

              <span className="hidden text-left sm:block">
                <span className="block max-w-[150px] truncate text-xs font-black">{name}</span>

                <span className="block text-[10px] font-black uppercase tracking-wide text-neutral-400">
                  {role}
                </span>
              </span>

              <ChevronDown size={15} className="text-neutral-400" />
            </button>

            {profileOpen ? (
              <div className="absolute right-0 top-14 z-[70] w-64 rounded-[24px] border border-black/10 bg-white p-3 shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
                <div className="rounded-[18px] bg-neutral-50 p-4">
                  <p className="truncate text-sm font-black">{name}</p>

                  {email ? (
                    <p className="mt-1 truncate text-xs font-semibold text-neutral-400">{email}</p>
                  ) : null}

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
    </section>
  );
}
