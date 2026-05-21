import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-white/10 bg-neutral-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-b from-fuchsia-600 to-rose-900" />
          <span className="text-lg font-semibold text-white">CUTATO</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-xl px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            Home
          </Link>
          <Link
            href="/bookings"
            className="rounded-xl px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            Bookings
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white/90"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}