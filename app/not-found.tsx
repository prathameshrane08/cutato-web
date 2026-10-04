import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f6f7] px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff355d]">404</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-neutral-950">
          Page not found
        </h1>
        <p className="mt-3 text-neutral-500">
          The page you are looking for does not exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white transition hover:bg-neutral-800"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
