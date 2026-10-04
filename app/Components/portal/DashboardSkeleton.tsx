"use client";

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-neutral-200/70 ${className}`} />;
}

export default function DashboardSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="rounded-[36px] bg-neutral-950 p-8 md:p-10">
        <Block className="h-4 w-36 bg-white/10" />
        <Block className="mt-5 h-12 w-64 bg-white/10" />
        <Block className="mt-4 h-4 w-96 max-w-full bg-white/10" />
      </div>

      <div className="mt-6 rounded-[28px] border border-black/10 bg-white p-3">
        <Block className="h-11 w-full" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({
          length: cards,
        }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-black/10 bg-white p-5">
            <Block className="h-3 w-24" />
            <Block className="mt-4 h-9 w-28" />
            <Block className="mt-4 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
        <div className="rounded-[30px] border border-black/10 bg-white p-6">
          <Block className="h-4 w-36" />
          <Block className="mt-4 h-[300px] w-full" />
        </div>

        <div className="rounded-[30px] border border-black/10 bg-white p-6">
          <Block className="h-4 w-32" />
          <Block className="mx-auto mt-8 h-48 w-48 rounded-full" />
        </div>
      </div>
    </div>
  );
}
