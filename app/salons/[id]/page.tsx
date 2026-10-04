"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { ArrowLeft, Clock3, MapPin, Scissors, Store, Users } from "lucide-react";

import WebShell from "@/app/Components/WebShell";
import { supabase } from "@/app/lib/supabase";

import { getBarbersForSalonFromSupabase } from "@/app/lib/barbersSupabase";

import { getServicesFromSupabase, type Service } from "@/app/lib/servicesStore";

type Salon = {
  id: string;
  name: string;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  active?: boolean | null;
};

type Barber = {
  id: string;
  name: string;
  area?: string | null;
  address?: string | null;
  rating?: number | null;
  reviews?: number | null;
  image_url?: string | null;
  speciality?: string | null;
  tagline?: string | null;
  active?: boolean | null;
};

function fmtEUR(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function SalonDetailsPage() {
  const params = useParams();

  const salonId = useMemo(() => {
    const raw = params?.id;

    if (Array.isArray(raw)) {
      return raw[0] ?? "";
    }

    return typeof raw === "string" ? raw : "";
  }, [params]);

  const [salon, setSalon] = useState<Salon | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSalon() {
      if (!salonId) {
        setLoadError("Salon ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError("");

        const { data: salonRow, error: salonError } = await supabase
          .from("salons")
          .select("id, name, owner_name, email, phone, city, address, active")
          .eq("id", salonId)
          .maybeSingle();

        if (salonError) {
          throw new Error(salonError.message);
        }

        if (!salonRow) {
          throw new Error("Salon not found.");
        }

        const barberRows = await getBarbersForSalonFromSupabase(salonId);

        const allServices = await getServicesFromSupabase();

        if (cancelled) {
          return;
        }

        const mappedBarbers: Barber[] = (barberRows ?? []).map((barber) => ({
          id: barber.id,
          name: barber.name,
          area: barber.area,
          address: barber.address,
          rating: Number(barber.rating ?? 0),
          reviews: Number(barber.reviews ?? 0),
          image_url: barber.image_url ?? null,
          speciality: barber.speciality ?? null,
          tagline: barber.tagline ?? null,
          active: barber.active ?? true,
        }));

        const activeBarberIds = new Set(
          mappedBarbers.filter((barber) => barber.active !== false).map((barber) => barber.id)
        );

        const salonServices = (allServices ?? []).filter((service) =>
          service.barberIds?.some((id) => activeBarberIds.has(id))
        );

        setSalon(salonRow as Salon);
        setBarbers(mappedBarbers.filter((barber) => barber.active !== false));
        setServices(salonServices);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load salon.";

        console.error("SALON DETAILS LOAD ERROR:", error);

        setSalon(null);
        setBarbers([]);
        setServices([]);
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSalon();

    return () => {
      cancelled = true;
    };
  }, [salonId]);

  const ratingSummary = useMemo(() => {
    const rated = barbers.filter((barber) => Number(barber.reviews ?? 0) > 0);

    const reviews = rated.reduce((sum, barber) => sum + Number(barber.reviews ?? 0), 0);

    const rating =
      reviews > 0
        ? rated.reduce(
            (sum, barber) => sum + Number(barber.rating ?? 0) * Number(barber.reviews ?? 0),
            0
          ) / reviews
        : 0;

    return {
      rating,
      reviews,
    };
  }, [barbers]);

  const cheapestService = useMemo(() => {
    if (services.length === 0) {
      return null;
    }

    return services.reduce((best, current) =>
      Number(current.basePriceEuro ?? 0) < Number(best.basePriceEuro ?? 0) ? current : best
    );
  }, [services]);

  if (loading) {
    return (
      <WebShell title="Salon" subtitle="Loading salon details...">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse rounded-[34px] bg-neutral-950 p-10">
            <div className="h-4 w-40 rounded bg-white/10" />
            <div className="mt-5 h-12 w-80 max-w-full rounded bg-white/10" />
            <div className="mt-4 h-4 w-96 max-w-full rounded bg-white/10" />
          </div>
        </div>
      </WebShell>
    );
  }

  if (loadError || !salon) {
    return (
      <WebShell title="Salon" subtitle="We could not load this salon.">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-red-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Salon error</p>

          <h2 className="mt-3 text-2xl font-black">Salon could not be loaded</h2>

          <p className="mt-3 text-sm text-neutral-500">{loadError || "Salon not found."}</p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-black text-white"
          >
            <ArrowLeft size={16} />
            Back home
          </Link>
        </div>
      </WebShell>
    );
  }

  return (
    <WebShell title={salon.name} subtitle="Explore this salon, its barbers and available services.">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/#featured-salons"
          className="mb-5 inline-flex items-center gap-2 text-sm font-black text-neutral-500 transition hover:text-[#ff355d]"
        >
          <ArrowLeft size={16} />
          Back to top salons
        </Link>

        <section className="relative overflow-hidden rounded-[38px] bg-neutral-950 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-10">
          <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#ff355d]/30 blur-3xl" />

          <div className="relative flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff355d]">
                CUTATO salon
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] md:text-6xl">
                {salon.name}
              </h1>

              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-white/60">
                {salon.city ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={15} />
                    {salon.city}
                  </span>
                ) : null}

                <span className="inline-flex items-center gap-2">
                  <Users size={15} />
                  {barbers.length} barber
                  {barbers.length === 1 ? "" : "s"}
                </span>

                <span className="inline-flex items-center gap-2">
                  <Scissors size={15} />
                  {services.length} service
                  {services.length === 1 ? "" : "s"}
                </span>
              </div>

              {salon.address ? <p className="mt-4 text-sm text-white/45">{salon.address}</p> : null}
            </div>

            <div className="grid min-w-[250px] gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-wide text-white/40">Rating</p>

                <p className="mt-2 text-3xl font-black">
                  {ratingSummary.rating > 0 ? `${ratingSummary.rating.toFixed(1)} ★` : "New"}
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {ratingSummary.reviews} review
                  {ratingSummary.reviews === 1 ? "" : "s"}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-wide text-white/40">
                  Starting from
                </p>

                <p className="mt-2 text-3xl font-black">
                  {cheapestService ? fmtEUR(Number(cheapestService.basePriceEuro ?? 0)) : "—"}
                </p>

                <p className="mt-1 truncate text-xs text-white/40">
                  {cheapestService?.name ?? "No service yet"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader
            eyebrow="Salon team"
            title="Choose your barber"
            subtitle="Only active barbers belonging to this salon are shown."
          />

          {barbers.length === 0 ? (
            <EmptyState
              title="No barbers yet"
              text="This salon has not added any active barbers yet."
            />
          ) : (
            <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {barbers.map((barber) => (
                <BarberCard key={barber.id} barber={barber} salonId={salon.id} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-14">
          <SectionHeader
            eyebrow="Services"
            title="Services available at this salon"
            subtitle="These services are linked to active barbers in this salon."
          />

          {services.length === 0 ? (
            <EmptyState
              title="No services yet"
              text="This salon has not published any services yet."
            />
          ) : (
            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} salonId={salon.id} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-14 rounded-[34px] bg-neutral-950 p-8 text-white md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff355d]">
                Ready to book?
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Book at {salon.name}</h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
                Choose a barber or continue into the booking flow with this salon selected.
              </p>
            </div>

            <Link
              href={`/book?salonId=${encodeURIComponent(salon.id)}`}
              className="rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/20 transition hover:bg-[#ff1f4c]"
            >
              Continue to booking
            </Link>
          </div>
        </section>
      </div>
    </WebShell>
  );
}

function BarberCard({ barber, salonId }: { barber: Barber; salonId: string }) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-52 overflow-hidden bg-neutral-900">
        <img
          src={
            barber.image_url ||
            `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(barber.name)}`
          }
          alt={barber.name}
          className="h-full w-full object-cover opacity-90"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-white">{barber.name}</h3>

              {barber.speciality ? (
                <p className="mt-1 text-sm font-bold text-white/65">{barber.speciality}</p>
              ) : null}
            </div>

            <span className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-neutral-950">
              {Number(barber.reviews ?? 0) > 0
                ? `⭐ ${Number(barber.rating ?? 0).toFixed(1)}`
                : "New"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <p className="min-h-12 text-sm leading-6 text-neutral-500">
          {barber.tagline || "Professional barber available at this salon."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href={`/barbers/${encodeURIComponent(barber.id)}`}
            className="rounded-full border border-black/10 px-4 py-3 text-center text-sm font-black transition hover:bg-neutral-50"
          >
            View profile
          </Link>

          <Link
            href={`/book?salonId=${encodeURIComponent(
              salonId
            )}&barberId=${encodeURIComponent(barber.id)}`}
            className="rounded-full bg-[#ff355d] px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-[#ff355d]/20"
          >
            Book
          </Link>
        </div>
      </div>
    </article>
  );
}

function ServiceCard({ service, salonId }: { service: Service; salonId: string }) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff355d]">Service</p>

          <h3 className="mt-2 text-xl font-black">{service.name}</h3>
        </div>

        <div className="rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">
          <Scissors size={18} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-neutral-500">
          <Clock3 size={15} />
          {service.durationMin} min
        </span>

        <span className="text-xl font-black">{fmtEUR(Number(service.basePriceEuro ?? 0))}</span>
      </div>

      <Link
        href={`/book?salonId=${encodeURIComponent(
          salonId
        )}&serviceId=${encodeURIComponent(service.id)}`}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-black/10 px-5 py-3 text-sm font-black transition hover:bg-neutral-50"
      >
        Choose service
      </Link>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-7 rounded-[28px] border border-dashed border-black/10 bg-white p-8">
      <div className="inline-flex rounded-2xl bg-neutral-100 p-3 text-neutral-400">
        <Store size={20} />
      </div>

      <h3 className="mt-4 text-xl font-black">{title}</h3>

      <p className="mt-2 text-sm text-neutral-500">{text}</p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff355d]">{eyebrow}</p>

      <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-4xl">{title}</h2>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">{subtitle}</p>
    </div>
  );
}
