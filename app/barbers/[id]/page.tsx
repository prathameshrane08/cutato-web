"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  Clock,
  MapPin,
  Scissors,
  Sparkles,
  Star,
} from "lucide-react";

import WebShell from "@/app/Components/WebShell";
import MapCard from "@/app/Components/MapCard";
import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";
import { servicesForBarberStore, type Service } from "@/app/lib/servicesStore";
import { generateSlotsForDate } from "@/app/lib/availabilityStore";
import { readSalonSettings } from "@/app/lib/salonSettingsStore";
import { fmtMoney } from "@/app/lib/formatters";

function dayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function prettyDayLabel(yyyyMmDd: string) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function demandForTime(time: string): "quiet" | "normal" | "busy" {
  const [h] = time.split(":").map(Number);
  if (h >= 17) return "busy";
  if (h < 11) return "quiet";
  return "normal";
}

function demandLabel(d: "quiet" | "normal" | "busy") {
  if (d === "busy") return "Busy";
  if (d === "quiet") return "Quiet";
  return "Normal";
}

function calcDynamicPriceEuro(baseEuro: number, demand: "quiet" | "normal" | "busy") {
  const mult = demand === "busy" ? 1.2 : demand === "quiet" ? 0.85 : 1;
  return Math.round(baseEuro * mult * 100) / 100;
}

export default function BarberProfilePage() {
  const params = useParams<{ id: string }>();
  const barberId = decodeURIComponent(params?.id ?? "");

  const [barber, setBarber] = useState<CustomerBarber | null>(null);
  const [loading, setLoading] = useState(true);

  const salon = useMemo(() => readSalonSettings(), []);
  const services = useMemo(() => servicesForBarberStore(barberId), [barberId]);

  const today = dayKey(new Date());
  const tomorrow = dayKey(addDays(new Date(), 1));

  useEffect(() => {
    let mounted = true;

    async function loadBarber() {
      try {
        if (!barberId) {
          if (mounted) {
            setBarber(null);
            setLoading(false);
          }
          return;
        }

        const row = await getBarberByIdFromSupabase(barberId);

        if (!mounted) return;

        if (!row) {
          setBarber(null);
          setLoading(false);
          return;
        }

        const mapped: CustomerBarber = {
          id: row.id,
          name: row.name,
          area: row.area,
          address: row.address,
          distKm: Number(row.dist_km ?? 0),
          rating: Number(row.rating ?? 0),
          reviews: Number(row.reviews ?? 0),
          tagline: row.tagline ?? undefined,
          about: row.about ?? undefined,
          active: row.active ?? true,
          imageUrl: row.image_url ?? undefined,
          speciality: row.speciality ?? undefined,
        };

        setBarber(mapped);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load barber profile:", error);
        if (mounted) {
          setBarber(null);
          setLoading(false);
        }
      }
    }

    loadBarber();

    return () => {
      mounted = false;
    };
  }, [barberId]);

  const cheapestService = useMemo(() => {
    if (!services.length) return null;
    return services.reduce((best, current) =>
      Number(current.basePriceEuro) < Number(best.basePriceEuro) ? current : best
    );
  }, [services]);

  const previewDuration = cheapestService?.durationMin ?? 30;

  const todaySlots = useMemo(
    () => (barberId ? generateSlotsForDate(barberId, today, previewDuration) : []),
    [barberId, today, previewDuration]
  );

  const tomorrowSlots = useMemo(
    () => (barberId ? generateSlotsForDate(barberId, tomorrow, previewDuration) : []),
    [barberId, tomorrow, previewDuration]
  );

  if (loading) {
    return (
      <WebShell title="Loading barber" subtitle="Please wait...">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
          <div className="font-black">Loading barber profile...</div>
        </div>
      </WebShell>
    );
  }

  if (!barber) {
    return (
      <WebShell title="Barber not found" subtitle="We couldn't find this barber profile.">
        <div className="mx-auto max-w-5xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">Barber not found</h2>
          <p className="mt-2 text-neutral-500">
            The profile may have been removed or the link is invalid.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25"
          >
            Back to home
          </Link>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell title={barber.name} subtitle="Barber profile">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50"
          >
            ← Back
          </Link>

          <Link
            href={`/book?barberId=${encodeURIComponent(barber.id)}`}
            className="rounded-full bg-[#ff355d] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]"
          >
            Book now
          </Link>
        </div>

        <section className="relative mb-6 overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-12">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />
          <div className="absolute bottom-[-120px] left-[-120px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/80">
                <Sparkles size={15} />
                Featured barber
              </div>

              <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.05em] md:text-7xl">
                {barber.name}
              </h1>

              <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-white/60">
                <span className="flex items-center gap-1">
                  <Star size={16} className="fill-[#ff355d] text-[#ff355d]" />
                  {Number(barber.rating ?? 0).toFixed(1)}
                </span>

                <span>{barber.reviews ?? 0} reviews</span>

                <span className="flex items-center gap-1">
                  <MapPin size={16} />
                  {Number(barber.distKm ?? 0).toFixed(1)} km
                </span>

                <span>{barber.area}</span>
              </div>

              {barber.tagline ? (
                <p className="mt-5 max-w-2xl text-lg font-bold text-white/80">
                  {barber.tagline}
                </p>
              ) : null}

              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/50">
                {barber.address}
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/10 p-6 backdrop-blur">
              <p className="text-sm font-bold text-white/50">Starting from</p>
              <p className="mt-2 text-4xl font-black text-white">
                {fmtMoney(cheapestService?.basePriceEuro ?? 0, salon.currency)}
              </p>
              <p className="mt-2 text-sm text-white/50">
                {cheapestService
                  ? `${cheapestService.name} • ${cheapestService.durationMin} min`
                  : "No service yet"}
              </p>

              <Link
                href={`/book?barberId=${encodeURIComponent(barber.id)}`}
                className="mt-6 inline-flex w-full justify-center rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]"
              >
                Book appointment
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-6">
            {barber.about ? (
              <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
                <SectionTitle title="About" subtitle="A quick introduction" />
                <p className="mt-5 max-w-3xl leading-7 text-neutral-500">
                  {barber.about}
                </p>
              </section>
            ) : null}

            <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
              <SectionTitle
                title="Services"
                subtitle="Services assigned to this barber"
              />

              {services.length === 0 ? (
                <p className="mt-5 text-neutral-500">No services available yet.</p>
              ) : (
                <div className="mt-6 grid gap-4">
                  {services.map((s: Service) => (
                    <ServiceCard
                      key={s.id}
                      service={s}
                      barberId={barber.id}
                      currency={salon.currency}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
              <SectionTitle
                title="Availability preview"
                subtitle="Based on current availability settings"
              />

              <div className="mt-6 grid gap-6">
                <AvailabilityBlock
                  title={`Today • ${prettyDayLabel(today)}`}
                  date={today}
                  barberId={barber.id}
                  slots={todaySlots}
                  basePriceEuro={cheapestService?.basePriceEuro ?? 0}
                  currency={salon.currency}
                />

                <AvailabilityBlock
                  title={`Tomorrow • ${prettyDayLabel(tomorrow)}`}
                  date={tomorrow}
                  barberId={barber.id}
                  slots={tomorrowSlots}
                  basePriceEuro={cheapestService?.basePriceEuro ?? 0}
                  currency={salon.currency}
                />
              </div>

              <Link
                href={`/book?barberId=${encodeURIComponent(barber.id)}`}
                className="mt-7 inline-flex w-full justify-center rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]"
              >
                Open full booking flow
              </Link>
            </section>
          </div>

          <aside className="grid h-fit gap-4 lg:sticky lg:top-28">
            <MapCard title="Directions" name={barber.name} address={barber.address} />

            <div className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">
                <CalendarDays />
              </div>
              <h3 className="text-xl font-black">Book with confidence</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Live availability, transparent pricing and fast confirmation.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </WebShell>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
        {title}
      </p>
      <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
        {subtitle}
      </h2>
    </div>
  );
}

function ServiceCard({
  service,
  barberId,
  currency,
}: {
  service: Service;
  barberId: string;
  currency: string;
}) {
  return (
    <article className="rounded-[28px] border border-black/10 bg-neutral-50 p-5 transition hover:bg-white hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">
            <Scissors />
          </div>

          <div>
            <h3 className="text-xl font-black">{service.name}</h3>
            <p className="mt-1 text-sm font-bold text-neutral-500">
              {service.category} • {service.durationMin} min
            </p>

            {service.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
                {service.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-2xl font-black">
            {fmtMoney(service.basePriceEuro, currency)}
          </p>

          <Link
            href={`/book?barberId=${encodeURIComponent(
              barberId
            )}&serviceId=${encodeURIComponent(service.id)}`}
            className="mt-4 inline-flex rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50"
          >
            Select
          </Link>
        </div>
      </div>
    </article>
  );
}

function AvailabilityBlock({
  title,
  date,
  barberId,
  slots,
  basePriceEuro,
  currency,
}: {
  title: string;
  date: string;
  barberId: string;
  slots: string[];
  basePriceEuro: number;
  currency: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 font-black">
        <Clock size={18} className="text-[#ff355d]" />
        {title}
      </div>

      {!slots.length ? (
        <p className="mt-4 text-neutral-500">No slots available.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {slots.slice(0, 8).map((time) => {
            const demand = demandForTime(time);
            return (
              <Link
                key={`${date}_${time}`}
                href={`/book?barberId=${encodeURIComponent(
                  barberId
                )}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`}
                className="rounded-[24px] border border-black/10 bg-neutral-50 p-4 text-inherit no-underline transition hover:-translate-y-0.5 hover:border-[#ff355d]/30 hover:bg-[#ff355d]/5"
              >
                <div className="text-lg font-black">{time}</div>

                <div className="mt-2">
                  <DemandPill demand={demand} />
                </div>

                <div className="mt-3 text-sm font-bold text-neutral-500">
                  {fmtMoney(calcDynamicPriceEuro(basePriceEuro, demand), currency)}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {slots.length > 8 ? (
        <p className="mt-3 text-xs font-bold text-neutral-400">
          + {slots.length - 8} more slot(s) in full booking view
        </p>
      ) : null}
    </div>
  );
}

function DemandPill({
  demand,
}: {
  demand: "quiet" | "normal" | "busy";
}) {
  const styles =
    demand === "busy"
      ? "bg-[#ff355d]/10 text-[#ff355d]"
      : demand === "quiet"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-neutral-200 text-neutral-600";

  return (
    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${styles}`}>
      {demandLabel(demand)}
    </span>
  );
}