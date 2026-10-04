"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  MapPin,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Users,
  Wallet,
} from "lucide-react";

import WebShell from "@/app/Components/WebShell";
import ChatBot from "@/app/Components/ChatBot";
import { supabase } from "@/app/lib/supabase";

type SalonRow = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  active?: boolean | null;
};

type BarberRatingRow = {
  id: string;
  name?: string | null;
  area?: string | null;
  salon_id?: string | null;
  rating?: number | null;
  reviews?: number | null;
  active?: boolean | null;
};

type IndependentBarber = {
  id: string;
  name: string;
  city: string;
  rating: number;
  reviews: number;
};

type FeaturedSalon = {
  id: string;
  name: string;
  city: string;
  address: string;
  rating: number;
  reviews: number;
  barberCount: number;
};

export default function HomePage() {
  const [salons, setSalons] = useState<FeaturedSalon[]>([]);
  const [loadingSalons, setLoadingSalons] = useState(true);

  const [independentBarbers, setIndependentBarbers] = useState<IndependentBarber[]>([]);
  const [loadingIndependentBarbers, setLoadingIndependentBarbers] = useState(true);

  const [salonsFailed, setSalonsFailed] = useState(false);
  const [barbersFailed, setBarbersFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadTopSalons() {
      try {
        setLoadingSalons(true);
        setSalonsFailed(false);

        // 1. Load active salons.
        const { data: salonRows, error: salonError } = await supabase
          .from("salons")
          .select("id, name, city, address, active")
          .eq("active", true);

        if (salonError) {
          throw new Error(salonError.message);
        }

        // 2. Load barber ratings so we can calculate a real-data salon score.
        // For now, salon rating = review-weighted rating of active barbers
        // belonging to that salon.
        const { data: barberRows, error: barberError } = await supabase
          .from("barbers")
          .select("id, salon_id, rating, reviews, active")
          .eq("active", true)
          .not("salon_id", "is", null);

        if (barberError) {
          throw new Error(barberError.message);
        }

        if (cancelled) {
          return;
        }

        const typedSalons = (salonRows ?? []) as SalonRow[];
        const typedBarbers = (barberRows ?? []) as BarberRatingRow[];

        const ranked: FeaturedSalon[] = typedSalons
          .map((salon) => {
            const salonBarbers = typedBarbers.filter((barber) => barber.salon_id === salon.id);

            const ratedBarbers = salonBarbers.filter((barber) => Number(barber.reviews ?? 0) > 0);

            const totalReviews = ratedBarbers.reduce(
              (sum, barber) => sum + Number(barber.reviews ?? 0),
              0
            );

            const weightedRating =
              totalReviews > 0
                ? ratedBarbers.reduce(
                    (sum, barber) => sum + Number(barber.rating ?? 0) * Number(barber.reviews ?? 0),
                    0
                  ) / totalReviews
                : 0;

            return {
              id: salon.id,
              name: salon.name,
              city: salon.city || "Dresden",
              address: salon.address || salon.city || "Address not added yet",
              rating: weightedRating,
              reviews: totalReviews,
              barberCount: salonBarbers.length,
            };
          })
          .sort((first, second) => {
            // Primary ranking: rating.
            if (second.rating !== first.rating) {
              return second.rating - first.rating;
            }

            // Tie-breaker: number of real reviews.
            if (second.reviews !== first.reviews) {
              return second.reviews - first.reviews;
            }

            return second.barberCount - first.barberCount;
          })
          .slice(0, 4);

        setSalons(ranked);
      } catch (error) {
        console.error("Failed to load homepage salons:", error);
        if (!cancelled) {
          setSalons([]);
          setSalonsFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingSalons(false);
        }
      }
    }

    void loadTopSalons();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadIndependentBarbers() {
      try {
        setLoadingIndependentBarbers(true);
        setBarbersFailed(false);

        const { data, error } = await supabase
          .from("barbers")
          .select("id, name, area, salon_id, rating, reviews, active")
          .eq("active", true)
          .is("salon_id", null)
          .order("rating", { ascending: false })
          .order("reviews", { ascending: false });

        if (error) {
          throw new Error(error.message);
        }

        if (cancelled) {
          return;
        }

        const rows = (data ?? []) as BarberRatingRow[];

        setIndependentBarbers(
          rows.map((barber) => ({
            id: barber.id,
            name: barber.name || "CUTATO Barber",
            city: barber.area || "Dresden",
            rating: Number(barber.rating ?? 0),
            reviews: Number(barber.reviews ?? 0),
          }))
        );
      } catch (error) {
        console.error("Failed to load independent homepage barbers:", error);
        if (!cancelled) {
          setIndependentBarbers([]);
          setBarbersFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingIndependentBarbers(false);
        }
      }
    }

    void loadIndependentBarbers();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const ratedSalonCount = useMemo(
    () => salons.filter((salon) => salon.rating > 0).length,
    [salons]
  );

  return (
    <>
      <WebShell>
        <div className="mx-auto max-w-7xl px-4 pb-20">
          <HeroSection salonCount={salons.length} ratedSalonCount={ratedSalonCount} />

          <HowItWorks />

          <section id="featured-salons" className="mt-24">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <SectionHeader
                eyebrow="Top-rated salons"
                title="Top salons on CUTATO"
                subtitle="Discover salons ranked by real barber-review data, with higher-rated salons shown first."
              />

              <Link
                href="/book"
                className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50"
              >
                Open booking flow
              </Link>
            </div>

            {loadingSalons ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SalonSkeleton key={index} />
                ))}
              </div>
            ) : salonsFailed ? (
              <LoadError label="salons" onRetry={() => setReloadKey((key) => key + 1)} />
            ) : salons.length === 0 ? (
              <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
                <div className="text-xl font-black">No salons available yet</div>
                <p className="mt-2 text-sm text-neutral-500">
                  Approved salons will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {salons.map((salon, index) => (
                  <FeaturedSalonCard key={salon.id} salon={salon} rank={index + 1} />
                ))}
              </div>
            )}
          </section>

          <section id="independent-barbers" className="mt-24">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <SectionHeader
                eyebrow="Independent & home-service barbers"
                title="Book a barber directly"
                subtitle="Prefer a more flexible experience? Discover independent CUTATO barbers for direct appointments and home-service grooming."
              />

              <Link
                href="/book"
                className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50"
              >
                Explore booking
              </Link>
            </div>

            {loadingIndependentBarbers ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <BarberSkeleton key={index} />
                ))}
              </div>
            ) : barbersFailed ? (
              <LoadError label="barbers" onRetry={() => setReloadKey((key) => key + 1)} />
            ) : independentBarbers.length === 0 ? (
              <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
                <div className="text-xl font-black">No independent barbers available yet</div>
                <p className="mt-2 text-sm text-neutral-500">
                  Approved independent barbers will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {independentBarbers.map((barber) => (
                  <IndependentBarberCard key={barber.id} barber={barber} />
                ))}
              </div>
            )}
          </section>

          <AudienceSection />
          <FinalCTA />
        </div>
      </WebShell>

      <ChatBot />
    </>
  );
}

function LoadError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
      <div>
        <div className="text-xl font-black">We couldn&apos;t load {label} right now</div>
        <p className="mt-2 text-sm text-neutral-500">Please check your connection and try again.</p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-black text-white transition hover:bg-neutral-800"
      >
        Try again
      </button>
    </div>
  );
}

function HeroSection({
  salonCount,
  ratedSalonCount,
}: {
  salonCount: number;
  ratedSalonCount: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-[44px] bg-neutral-950 px-6 py-10 text-white shadow-[0_28px_90px_rgba(0,0,0,0.22)] md:px-12 md:py-16">
      <div className="absolute right-[-140px] top-[-140px] h-96 w-96 rounded-full bg-[#ff355d]/35 blur-3xl" />
      <div className="absolute bottom-[-140px] left-[-140px] h-96 w-96 rounded-full bg-white/10 blur-3xl" />

      <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white/80 backdrop-blur">
            <Sparkles size={15} className="text-[#ff355d]" />
            Top-rated salons • Live booking • Smart discovery
          </div>

          <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.06em] md:text-7xl">
            Find your perfect salon.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
            Compare trusted salons, discover their barbers, check availability and book your next
            grooming appointment in minutes.
          </p>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-white p-2 shadow-2xl">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <div className="flex items-center gap-3 rounded-[22px] bg-neutral-50 px-4 py-4 text-neutral-950">
                <Scissors size={19} className="text-[#ff355d]" />
                <div>
                  <p className="text-xs font-bold text-neutral-400">Service</p>
                  <p className="text-sm font-black">Haircut, beard, styling</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[22px] bg-neutral-50 px-4 py-4 text-neutral-950">
                <MapPin size={19} className="text-[#ff355d]" />
                <div>
                  <p className="text-xs font-bold text-neutral-400">Location</p>
                  <p className="text-sm font-black">Near you</p>
                </div>
              </div>

              <Link
                href="#featured-salons"
                className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]"
              >
                Search <ArrowRight size={17} />
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/hairstyle-advisor"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-black text-neutral-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-neutral-100"
            >
              <Sparkles size={17} className="text-[#ff355d]" />
              Find my hairstyle
            </Link>

            <Link
              href="/book-ai"
              className="rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:-translate-y-0.5 hover:bg-[#ff1f4c]"
            >
              Book with AI
            </Link>

            <Link
              href="/portal/barber/apply"
              className="rounded-full border border-white/15 bg-white/10 px-6 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white hover:text-neutral-950"
            >
              Become a barber
            </Link>

            <Link
              href="/portal/salon/apply"
              className="rounded-full border border-white/15 bg-white/10 px-6 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white hover:text-neutral-950"
            >
              Register salon
            </Link>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            <MiniStatDark label="Top salons" value={String(salonCount)} />
            <MiniStatDark label="Rated" value={String(ratedSalonCount)} />
            <MiniStatDark label="Booking" value="Live" />
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[38px] border border-white/10 bg-white/10 p-4 backdrop-blur">
            <div className="rounded-[32px] bg-white p-5 text-neutral-950 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#ff355d]">
                    Discover
                  </p>
                  <h3 className="mt-1 text-2xl font-black">Top-rated salons</h3>
                </div>

                <div className="rounded-full bg-[#ff355d]/10 p-3 text-[#ff355d]">
                  <Store />
                </div>
              </div>

              <div className="grid gap-3">
                <HeroFeature
                  icon={<Star size={18} />}
                  title="Ratings first"
                  text="Highest-rated salons are promoted first."
                />

                <HeroFeature
                  icon={<Users size={18} />}
                  title="Salon teams"
                  text="Discover the barbers working inside each salon."
                />

                <HeroFeature
                  icon={<CalendarCheck size={18} />}
                  title="Live booking"
                  text="Continue directly into CUTATO's booking flow."
                />
              </div>

              <div className="mt-5 rounded-[28px] bg-neutral-950 p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3 text-[#ff355d]">
                    <Star className="fill-[#ff355d]" />
                  </div>

                  <div>
                    <p className="text-sm text-white/50">Ranked by</p>
                    <p className="font-black">Rating + review confidence</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: <Store size={22} />,
      title: "Choose salon",
      text: "Compare top-rated salons and their locations.",
    },
    {
      icon: <Users size={22} />,
      title: "Select barber",
      text: "Choose a professional from the salon team.",
    },
    {
      icon: <Clock size={22} />,
      title: "Pick live slot",
      text: "Choose from available appointment times.",
    },
    {
      icon: <ShieldCheck size={22} />,
      title: "Confirm booking",
      text: "Review the appointment and confirm instantly.",
    },
  ];

  return (
    <section className="mt-24">
      <SectionHeader
        eyebrow="How it works"
        title="From salon discovery to confirmed appointment"
        subtitle="A smoother booking journey designed around salons and their teams."
      />

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="group rounded-[28px] border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">{step.icon}</div>

              <span className="text-sm font-black text-neutral-300">0{index + 1}</span>
            </div>

            <h3 className="text-xl font-black">{step.title}</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-500">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedSalonCard({ salon, rank }: { salon: FeaturedSalon; rank: number }) {
  return (
    <article className="group overflow-hidden rounded-[34px] border border-black/10 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
      <div className="relative h-44 overflow-hidden bg-neutral-950 p-5 text-white">
        <div className="absolute right-[-40px] top-[-40px] h-40 w-40 rounded-full bg-[#ff355d]/25 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black backdrop-blur">
              #{rank} Top salon
            </span>

            <span className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-neutral-950">
              {salon.rating > 0 ? `⭐ ${salon.rating.toFixed(1)}` : "New"}
            </span>
          </div>

          <div>
            <h3 className="text-2xl font-black">{salon.name}</h3>

            <div className="mt-2 flex items-center gap-2 text-sm text-white/60">
              <MapPin size={14} />
              {salon.city}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <p className="line-clamp-2 text-sm font-semibold leading-6 text-neutral-500">
          {salon.address}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] bg-neutral-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-neutral-400">Barbers</p>
            <p className="mt-1 text-2xl font-black">{salon.barberCount}</p>
          </div>

          <div className="rounded-[20px] bg-neutral-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-neutral-400">Reviews</p>
            <p className="mt-1 text-2xl font-black">{salon.reviews}</p>
          </div>
        </div>

        <div className="mt-5 rounded-[20px] border border-black/10 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-neutral-500">Salon rating</span>

            <span className="font-black">
              {salon.rating > 0 ? `${salon.rating.toFixed(1)} / 5` : "Not rated yet"}
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-neutral-400">
            Currently calculated from review-weighted ratings of this salon&apos;s active barbers.
          </p>
        </div>

        <Link
          href={`/book?salonId=${encodeURIComponent(salon.id)}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#ff355d] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#ff355d]/20 transition hover:bg-[#ff1f4c]"
        >
          Book at this salon
        </Link>
      </div>
    </article>
  );
}

function IndependentBarberCard({ barber }: { barber: IndependentBarber }) {
  return (
    <article className="group overflow-hidden rounded-[34px] border border-black/10 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
      <div className="relative h-44 overflow-hidden bg-neutral-950 p-5 text-white">
        <div className="absolute right-[-40px] top-[-40px] h-40 w-40 rounded-full bg-[#ff355d]/25 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-full bg-[#ff355d] px-3 py-2 text-xs font-black">
              Independent barber
            </span>

            <span className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-neutral-950">
              {barber.rating > 0 ? `⭐ ${barber.rating.toFixed(1)}` : "New"}
            </span>
          </div>

          <div>
            <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-3 text-[#ff355d]">
              <Scissors size={22} />
            </div>

            <h3 className="text-2xl font-black">{barber.name}</h3>

            <div className="mt-2 flex items-center gap-2 text-sm text-white/60">
              <MapPin size={14} />
              {barber.city}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <p className="text-sm font-semibold leading-6 text-neutral-500">
          Flexible direct appointments with an independent CUTATO professional. Ideal for customers
          looking for a more personal or home-service grooming experience.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] bg-neutral-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-neutral-400">Reviews</p>
            <p className="mt-1 text-2xl font-black">{barber.reviews}</p>
          </div>

          <div className="rounded-[20px] bg-neutral-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-neutral-400">Type</p>
            <p className="mt-1 text-sm font-black">Direct booking</p>
          </div>
        </div>

        <Link
          href={`/book?barberId=${encodeURIComponent(barber.id)}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#ff355d] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#ff355d]/20 transition hover:bg-[#ff1f4c]"
        >
          View & book
        </Link>
      </div>
    </article>
  );
}

function BarberSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[34px] border border-black/10 bg-white shadow-sm">
      <div className="h-44 bg-neutral-200" />
      <div className="p-5">
        <div className="h-4 w-3/4 rounded bg-neutral-200" />
        <div className="mt-4 h-20 rounded-[20px] bg-neutral-100" />
        <div className="mt-4 h-12 rounded-full bg-neutral-100" />
      </div>
    </div>
  );
}

function SalonSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[34px] border border-black/10 bg-white shadow-sm">
      <div className="h-44 bg-neutral-200" />
      <div className="p-5">
        <div className="h-4 w-3/4 rounded bg-neutral-200" />
        <div className="mt-4 h-20 rounded-[20px] bg-neutral-100" />
        <div className="mt-4 h-12 rounded-full bg-neutral-100" />
      </div>
    </div>
  );
}

function HeroFeature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-black/10 bg-neutral-50 p-4">
      <div className="rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">{icon}</div>

      <div>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-xs leading-5 text-neutral-500">{text}</p>
      </div>
    </div>
  );
}

function AudienceSection() {
  const audiences = [
    {
      icon: <Users />,
      title: "For customers",
      text: "Book faster with live slots, transparent prices and clean appointment history.",
      href: "/login",
      label: "Customer login",
    },
    {
      icon: <Scissors />,
      title: "For barbers",
      text: "Manage schedule, bookings, availability and daily appointments.",
      href: "/portal/barber/login",
      label: "Barber login",
    },
    {
      icon: <Wallet />,
      title: "For salon owners",
      text: "Control staff, services, analytics, salon settings and platform operations.",
      href: "/portal/salon/login",
      label: "Salon login",
    },
  ];

  return (
    <section className="mt-24">
      <SectionHeader
        eyebrow="Multi-role platform"
        title="Built for every side of the business"
        subtitle="Customers book. Barbers manage time. Salon owners control operations."
      />

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {audiences.map((item) => (
          <div
            key={item.title}
            className="rounded-[30px] border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="mb-5 inline-flex rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">
              {item.icon}
            </div>

            <h3 className="text-xl font-black">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-500">{item.text}</p>

            <Link
              href={item.href}
              className="mt-6 inline-flex rounded-full border border-black/10 px-5 py-3 text-sm font-black transition hover:bg-neutral-50"
            >
              {item.label}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="mt-24 overflow-hidden rounded-[36px] bg-neutral-950 p-8 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-14">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-[#ff355d]">
          Ready when you are
        </p>

        <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] md:text-6xl">
          Your next haircut is one booking away.
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-white/60">
          Explore top salons, discover their barbers and book your appointment in a few clicks.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/hairstyle-advisor"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-black text-neutral-950 transition hover:bg-neutral-100"
          >
            <Sparkles size={17} className="text-[#ff355d]" />
            Find my hairstyle
          </Link>

          <Link
            href="#featured-salons"
            className="rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white transition hover:bg-[#ff1f4c]"
          >
            Explore salons
          </Link>

          <Link
            href="/book"
            className="rounded-full border border-white/15 bg-white/10 px-6 py-4 text-sm font-black text-white transition hover:bg-white hover:text-neutral-950"
          >
            Book now
          </Link>
        </div>
      </div>
    </section>
  );
}

function MiniStatDark({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-bold text-white/40">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
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
      <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">{eyebrow}</p>

      <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em] text-neutral-950 md:text-5xl">
        {title}
      </h2>

      <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-500">{subtitle}</p>
    </div>
  );
}
