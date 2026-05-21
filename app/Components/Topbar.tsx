"use client";

import Link from "next/link";
import { useState } from "react";

export default function Topbar({
  title = "Discover",
  showSearch = true,
}: {
  title?: string;
  showSearch?: boolean;
}) {
  const [q, setQ] = useState("");

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-white/60">Dresden • Nearby</p>
      </div>

      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
        {showSearch && (
          <div className="w-full md:w-[420px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search barber, salon, style..."
              className="w-full rounded-2xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/20"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Link
            href="/login"
            className="rounded-xl bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-white/90"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}