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
  Users,
  Wallet,
} from "lucide-react";
import HairstyleAI from "@/app/Components/HairstyleAI";
import WebShell from "@/app/Components/WebShell";
import ChatBot from "@/app/Components/ChatBot";
import type { CustomerBarber } from "@/app/lib/barbersStore";
import {
  getBarbersFromSupabase,
  type SupabaseBarber,
} from "@/app/lib/barbersSupabase";
import { generateSlotsForDate } from "@/app/lib/availabilityStore";
import { readSalonSettings } from "@/app/lib/salonSettingsStore";
import { fmtMoney } from "@/app/lib/formatters";
import {
  getServicesFromSupabase,
  type Service,
} from "@/app/lib/servicesStore";

function dayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function demandForTime(time: string): "quiet" | "normal" | "busy" {
  const [h] = time.split(":").map(Number);
  if (h >= 17) return "busy";
  if (h < 11) return "quiet";
  return "normal";
}

function calcDynamicPriceEuro(
  base: number,
  demand: "quiet" | "normal" | "busy"
) {
  const mult = demand === "busy" ? 1.2 : demand === "quiet" ? 0.85 : 1;
  return Math.round(base * mult * 100) / 100;
}

export default function HomePage() {
  const [barbers, setBarbers] = useState<CustomerBarber[]>([]);
  const [tick] = useState(0);

  async function loadBarbers() {
    try {
      const rows = await getBarbersFromSupabase();
      console.log("SUPABASE BARBERS:", rows);

      const mapped: CustomerBarber[] = rows.map((b: SupabaseBarber) => ({
      id: b.id,
      name: b.name,
      area: b.area,
      address: b.address,
      distKm: Number(b.dist_km ?? 0),
      rating: Number(b.rating ?? 0),
      reviews: Number(b.reviews ?? 0),

      tagline: b.tagline ?? undefined,
      about: b.about ?? undefined,

      imageUrl: b.image_url ?? undefined,
      speciality: b.speciality ?? undefined,

      active: b.active ?? true,
    }));

      setBarbers(mapped);
    } catch (error) {
      console.error("Failed to load homepage barbers:", error);
    }
  }

  useEffect(() => {
    loadBarbers();
  }, []);

  const salon = useMemo(() => readSalonSettings(), []);
  const today = useMemo(() => dayKey(new Date()), []);

  const visibleBarbers = useMemo(
    () =>
      barbers
        .filter((b) => b.active !== false && b.name)
        .slice()
        .sort((a, b) => {
          const ratingDiff = Number(b.rating ?? 0) - Number(a.rating ?? 0);
          if (ratingDiff !== 0) return ratingDiff;
          return Number(a.distKm ?? 0) - Number(b.distKm ?? 0);
        }),
    [barbers]
  );

  const featuredBarbers = visibleBarbers.slice(0, 4);

  return (
    <>
      <WebShell
        title={salon.salonName || "Cutato"}
        subtitle="Premium barber booking for customers, barbers and salons."
      >
        <main className="mx-auto max-w-7xl px-4 pb-20">
          <HeroSection
            barberCount={visibleBarbers.length}
            currency={salon.currency || "EUR"}
            timezone={salon.timezone || "Europe/Berlin"}
          />

          <div className="mt-8">
            <HairstyleAI />
          </div>

          <HowItWorks />

          <section id="featured-barbers" className="mt-24">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <SectionHeader
                eyebrow="Featured professionals"
                title="Top barbers available today"
                subtitle="Browse live barber profiles, prices, ratings and available slots."
              />

              <Link
                href="/book"
                className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50"
              >
                Open booking flow
              </Link>
            </div>

            {featuredBarbers.length === 0 ? (
              <div className="rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
                <div className="text-xl font-black">No barbers available yet</div>
                <p className="mt-2 text-sm text-neutral-500">
                  A salon owner needs to add barbers first.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {featuredBarbers.map((barber) => (
                  <FeaturedBarberCard
                    key={`${barber.id}_${tick}`}
                    barber={barber}
                    today={today}
                    currency={salon.currency}
                    tick={tick}
                  />
                ))}
              </div>
            )}
          </section>

          <AudienceSection />

          <FinalCTA />
        </main>
      </WebShell>

      <ChatBot />
    </>
  );
}

function HeroSection({
  barberCount,
  currency,
  timezone,
}: {
  barberCount: number;
  currency: string;
  timezone: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[44px] bg-neutral-950 px-6 py-10 text-white shadow-[0_28px_90px_rgba(0,0,0,0.22)] md:px-12 md:py-16">
      <div className="absolute right-[-140px] top-[-140px] h-96 w-96 rounded-full bg-[#ff355d]/35 blur-3xl" />
      <div className="absolute bottom-[-140px] left-[-140px] h-96 w-96 rounded-full bg-white/10 blur-3xl" />

      <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white/80 backdrop-blur">
            <Sparkles size={15} className="text-[#ff355d]" />
            Live slots • Smart pricing • Barber discovery
          </div>

          <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.06em] md:text-7xl">
            Find and book your perfect barber.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
            Compare trusted barbers, check live availability, see transparent
            prices and confirm your next haircut in minutes.
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
                href="#featured-barbers"
                className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]"
              >
                Search <ArrowRight size={17} />
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
  <Link
    href="/book-ai"
    className="rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c]"
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

<div className="mt-5 flex flex-wrap gap-2">
  {["Haircut", "Beard trim", "Fade", "Styling", "Premium cut"].map(
    (item) => (
      <Link
        key={item}
        href="#featured-barbers"
        className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-white/70 transition hover:bg-white hover:text-neutral-950"
      >
        {item}
      </Link>
    )
  )}
</div>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            <MiniStatDark label="Barbers" value={String(barberCount)} />
            <MiniStatDark label="Currency" value={currency} />
            <MiniStatDark label="Timezone" value={timezone.replace("Europe/", "")} />
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[38px] border border-white/10 bg-white/10 p-4 backdrop-blur">
            <div className="rounded-[32px] bg-white p-5 text-neutral-950 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#ff355d]">
                    Live preview
                  </p>
                  <h3 className="mt-1 text-2xl font-black">Available today</h3>
                </div>
                <div className="rounded-full bg-[#ff355d]/10 p-3 text-[#ff355d]">
                  <CalendarCheck />
                </div>
              </div>

              <div className="grid gap-3">
                <HeroSlot time="10:30" name="Classic haircut" price="€18.00" quiet />
                <HeroSlot time="14:00" name="Haircut + beard" price="€28.00" />
                <HeroSlot time="18:30" name="Premium styling" price="€36.00" busy />
              </div>

              <div className="mt-5 rounded-[28px] bg-neutral-950 p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3 text-[#ff355d]">
                    <Star className="fill-[#ff355d]" />
                  </div>
                  <div>
                    <p className="text-sm text-white/50">Recommended</p>
                    <p className="font-black">Top-rated barber near you</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-5 -left-5 hidden rounded-3xl border border-black/10 bg-white p-4 text-neutral-950 shadow-xl md:block">
            <div className="flex items-center gap-2">
              <Star className="fill-[#ff355d] text-[#ff355d]" size={18} />
              <span className="font-black">4.9 average rating</span>
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
      icon: <Scissors size={22} />,
      title: "Choose service",
      text: "Pick haircut, beard trim, styling or a combo service.",
    },
    {
      icon: <Users size={22} />,
      title: "Select barber",
      text: "Compare ratings, distance, pricing and available professionals.",
    },
    {
      icon: <Clock size={22} />,
      title: "Pick live slot",
      text: "Choose from generated availability without double booking.",
    },
    {
      icon: <ShieldCheck size={22} />,
      title: "Confirm booking",
      text: "Get a clean summary and confirm instantly.",
    },
  ];

  return (
    <section className="mt-24">
      <SectionHeader
        eyebrow="How it works"
        title="From search to confirmed appointment"
        subtitle="A smoother booking journey designed for modern salons."
      />

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="group rounded-[28px] border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">
                {step.icon}
              </div>
              <span className="text-sm font-black text-neutral-300">
                0{index + 1}
              </span>
            </div>

            <h3 className="text-xl font-black">{step.title}</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-500">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedBarberCard({
  
  barber,
  today,
  currency,
  tick,
}: {
  barber: CustomerBarber;
  today: string;
  currency: string;
  tick: number;
}
)
 {
  const [services, setServices] = useState<Service[]>([]);

useEffect(() => {
  async function loadServices() {
    try {
      const all = await getServicesFromSupabase();

      setServices(
        all.filter((s) => s.barberIds.includes(barber.id))
      );
    } catch (err) {
      console.error(err);
    }
  }

  loadServices();
}, [barber.id]);

const cheapest = useMemo(() => {
    if (!services.length) return null;
    return services.reduce((a, b) =>
      Number(a.basePriceEuro) < Number(b.basePriceEuro) ? a : b
    );
  }, [services]);

  const previewDuration = cheapest?.durationMin ?? 30;

  const slots = useMemo(
    () => generateSlotsForDate(barber.id, today, previewDuration),
    [barber.id, today, previewDuration, tick]
  );

  const previewSlots = slots.slice(0, 3);

  return (
    <div className="group overflow-hidden rounded-[34px] border border-black/10 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
      <div className="relative h-56 overflow-hidden bg-neutral-900">
        <img
          src={
            barber.imageUrl ||
            `https://api.dicebear.com/7.x/notionists/svg?seed=${barber.name}`
          }
          alt={barber.name}
          className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-black text-neutral-900 backdrop-blur">
          {barber.area}
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <h3 className="text-2xl font-black text-white">
              {barber.name}
            </h3>

            {barber.speciality ? (
              <p className="mt-1 text-sm font-bold text-white/70">
                {barber.speciality}
              </p>
            ) : null}

            <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
              <MapPin size={14} />
              {Number(barber.distKm ?? 0).toFixed(1)} km away
            </div>
          </div>

          <div className="rounded-2xl bg-white/90 px-3 py-2 text-sm font-black text-neutral-950 backdrop-blur">
            ⭐ {Number(barber.rating ?? 0).toFixed(1)}
          </div>
        </div>
      </div>

      <div className="p-5">
        {barber.tagline ? (
          <p className="line-clamp-2 text-sm font-bold leading-6 text-neutral-600">
            {barber.tagline}
          </p>
        ) : (
          <p className="text-sm text-neutral-500">
            Premium barber experience with modern grooming services.
          </p>
        )}

        <div className="mt-5 rounded-[24px] bg-neutral-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            Starting from
          </p>

          <div className="mt-1 text-3xl font-black text-neutral-950">
            {fmtMoney(cheapest?.basePriceEuro ?? 0, currency)}
          </div>

          <p className="mt-1 text-sm text-neutral-500">
            {cheapest
              ? `${cheapest.name} • ${cheapest.durationMin} min`
              : "No service available"}
          </p>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400">
            Available today
          </p>

          {previewSlots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm text-neutral-500">
              No slots available today
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {previewSlots.map((time) => (
                <Link
                  key={time}
                  href={`/book?barberId=${encodeURIComponent(
                    barber.id
                  )}&date=${encodeURIComponent(today)}&time=${encodeURIComponent(
                    time
                  )}`}
                  className="rounded-full border border-black/10 bg-neutral-50 px-4 py-2 text-sm font-black transition hover:border-[#ff355d]/30 hover:bg-[#ff355d] hover:text-white"
                >
                  {time}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href={`/barbers/${encodeURIComponent(barber.id)}`}
            className="rounded-full border border-black/10 bg-white px-4 py-3 text-center text-sm font-black transition hover:bg-neutral-50"
          >
            View profile
          </Link>

          <Link
            href={`/book?barberId=${encodeURIComponent(barber.id)}`}
            className="rounded-full bg-[#ff355d] px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-[#ff355d]/20 transition hover:bg-[#ff1f4c]"
          >
            Book now
          </Link>
        </div>
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
          Explore barbers, compare services, preview live availability and lock
          your appointment in a few clicks.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="#featured-barbers"
            className="rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white transition hover:bg-[#ff1f4c]"
          >
            Explore barbers
          </Link>

          <Link
            href="/book"
            className="rounded-full bg-white px-6 py-4 text-sm font-black text-neutral-950 transition hover:bg-neutral-100"
          >
            Book now
          </Link>
        </div>
      </div>
    </section>
  );
}

function HeroSlot({
  time,
  name,
  price,
  quiet,
  busy,
}: {
  time: string;
  name: string;
  price: string;
  quiet?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-black/10 bg-white p-4">
      <div>
        <p className="text-sm font-black">{time}</p>
        <p className="text-xs text-neutral-500">{name}</p>
      </div>

      <div className="text-right">
        <p className="text-sm font-black">{price}</p>
        <p
          className={`text-xs font-bold ${
            busy ? "text-[#ff355d]" : quiet ? "text-emerald-600" : "text-neutral-400"
          }`}
        >
          {busy ? "Busy" : quiet ? "Quiet" : "Normal"}
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-neutral-50 p-4">
      <p className="text-xs font-bold text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
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
      <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
        {eyebrow}
      </p>
      <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em] text-neutral-950 md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-500">
        {subtitle}
      </p>
    </div>
  );
}