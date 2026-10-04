"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f6f7] px-4">
      <div className="max-w-md text-center">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff355d]">
          Something went wrong
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-neutral-950">
          We hit a snag
        </h1>
        <p className="mt-3 text-neutral-500">
          Please try again. If the problem continues, come back in a few minutes.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white transition hover:bg-neutral-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-black"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
