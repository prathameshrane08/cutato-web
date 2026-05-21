import Link from "next/link";

const Item = ({
  href,
  label,
}: {
  href: string;
  label: string;
}) => (
  <Link
    href={href}
    className="block rounded-xl px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white"
  >
    {label}
  </Link>
);

export default function Sidebar() {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="h-9 w-9 rounded-xl bg-white/10" />
        <div>
          <div className="text-sm font-semibold">CUTATO</div>
          <div className="text-xs text-white/60">Web App</div>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <Item href="/" label="Discover" />
        <Item href="/bookings" label="My Bookings" />
        <Item href="/login" label="Login" />
        <Item href="/signup" label="Sign up" />
      </div>

      <div className="mt-6 rounded-xl bg-white/5 p-3 text-xs text-white/60">
        Tip: Search salons, compare ratings, book instantly.
      </div>
    </div>
  );
}