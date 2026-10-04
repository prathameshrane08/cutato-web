import Link from "next/link";
import { Scissors } from "lucide-react";

// Highlights details the operator still has to fill in, so missing legal
// information is impossible to overlook before launch.
export function Placeholder({ children }: { children: React.ReactNode }) {
  return <mark className="rounded bg-amber-100 px-1 text-amber-900">[{children}]</mark>;
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-black tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 grid gap-3 text-sm leading-7 text-neutral-600">{children}</div>
    </section>
  );
}

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f6f6f7] px-4 py-10 text-neutral-950">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff355d] text-white">
            <Scissors size={18} />
          </span>
          <span className="text-xl font-black tracking-[-0.06em]">CUTATO</span>
        </Link>

        <article className="mt-8 rounded-[32px] border border-black/10 bg-white p-8 shadow-sm md:p-12">
          <h1 className="text-4xl font-black tracking-[-0.04em]">{title}</h1>
          <p className="mt-2 text-sm font-bold text-neutral-400">Last updated: {updated}</p>
          {children}
        </article>
      </div>
    </main>
  );
}
