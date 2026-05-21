"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Scissors,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";

import WebShell from "@/app/Components/WebShell";
import ChatBot from "@/app/Components/ChatBot";
import { getAuthUser } from "@/app/Components/auth";
import type { Booking } from "@/app/lib/bookingStore";
import type { CustomerBarber } from "@/app/lib/barbersStore";
import { getBarberByIdFromSupabase } from "@/app/lib/barbersSupabase";
import { getServicesFromSupabase, type Service } from "@/app/lib/servicesStore";
import { generateSlotsForDate } from "@/app/lib/availabilityStore";
import { getReservedTimesForBarber } from "@/app/lib/availabilitySupabase";
import { readSalonSettings } from "@/app/lib/salonSettingsStore";
import { fmtMoney } from "@/app/lib/formatters";
import { subscribeStoreUpdates } from "@/app/lib/storeEvents";
import { createBookingInSupabase } from "@/app/lib/bookingsSupabase";
import { getCurrentUser } from "@/app/lib/authSupabase";

type Step = 1 | 2 | 3;
type PaymentMethod = "online" | "salon";
type Demand = "quiet" | "normal" | "busy";

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
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

function demandForTime(time: string): Demand {
  const [h] = time.split(":").map(Number);
  if (h >= 17) return "busy";
  if (h < 11) return "quiet";
  return "normal";
}

function demandLabel(d: Demand) {
  if (d === "busy") return "Busy";
  if (d === "quiet") return "Quiet";
  return "Normal";
}

function calcDynamicPriceEuro(base: number, demand: Demand) {
  const mult = demand === "busy" ? 1.2 : demand === "quiet" ? 0.85 : 1;
  return Math.round(base * mult * 100) / 100;
}

function hmToMin(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function minToHm(v: number) {
  const h = Math.floor(v / 60);
  const m = v % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function reservedTimesFromStart(start: string, durationMin: number, stepMin = 30) {
  const startMin = hmToMin(start);
  const count = Math.max(1, Math.ceil(durationMin / stepMin));
  return Array.from({ length: count }, (_, i) => minToHm(startMin + i * stepMin));
}

function makeLocalBookingId() {
  return `bk_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export default function BookPage() {
  const params = useSearchParams();

  const barberId = params.get("barberId") || "";
  const initialServiceId = params.get("serviceId") || "";
  const initialDate = params.get("date") || "";
  const initialTime = params.get("time") || "";

  const [barber, setBarber] = useState<CustomerBarber | null>(null);
  const [barberLoading, setBarberLoading] = useState(true);

  const [step, setStep] = useState<Step>(1);
  const [date, setDate] = useState(initialDate || dayKey(new Date()));
  const [time, setTime] = useState(initialTime || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("online");

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [service, setService] = useState<Service | null>(null);

  const [reservedFromDb, setReservedFromDb] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeStoreUpdates(() => setTick((v) => v + 1));
    return unsub;
  }, []);

  useEffect(() => {
    async function loadBarber() {
      try {
        setBarberLoading(true);

        if (!barberId) {
          setBarber(null);
          return;
        }

        const b = await getBarberByIdFromSupabase(barberId);

        if (!b) {
          setBarber(null);
          return;
        }

        setBarber({
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
        });
      } catch (err) {
        console.error("Failed to load booking barber:", err);
        setBarber(null);
      } finally {
        setBarberLoading(false);
      }
    }

    loadBarber();
  }, [barberId]);

  useEffect(() => {
    async function loadServices() {
      try {
        if (!barberId) {
          setServices([]);
          return;
        }

        const all = await getServicesFromSupabase();
        const filtered = all.filter((s) => s.barberIds.includes(barberId));

        setServices(filtered);
      } catch (err) {
        console.error("Failed to load booking services:", err);
        setServices([]);
      }
    }

    loadServices();
  }, [barberId, tick]);

  useEffect(() => {
    async function loadReservedTimes() {
      if (!barberId || !date) {
        setReservedFromDb([]);
        return;
      }

      const taken = await getReservedTimesForBarber(barberId, date);
      setReservedFromDb(taken);
    }

    loadReservedTimes();
  }, [barberId, date, tick]);

  useEffect(() => {
    if (!services.length) {
      setService(null);
      return;
    }

    if (initialServiceId) {
      const found = services.find((s) => s.id === initialServiceId) ?? null;
      if (found) {
        setService(found);
        return;
      }
    }

    setService((prev) => {
      if (prev && services.some((s) => s.id === prev.id)) return prev;
      return services[0] ?? null;
    });
  }, [services, initialServiceId]);

  const salon = useMemo(() => readSalonSettings(), [tick]);

  const slots = useMemo(() => {
    if (!service || !barberId || !date) return [];

    const generated = generateSlotsForDate(barberId, date, service.durationMin);
    const taken = new Set(reservedFromDb);

    return generated.filter((slot) => !taken.has(slot));
  }, [barberId, date, service, reservedFromDb, tick]);

  useEffect(() => {
    if (!time) return;
    if (!slots.includes(time)) setTime("");
  }, [slots, time]);

  useEffect(() => {
    if (initialTime && slots.includes(initialTime)) setTime(initialTime);
  }, [initialTime, slots]);

  const today = useMemo(() => dayKey(new Date()), []);
  const tomorrow = useMemo(() => dayKey(addDays(new Date(), 1)), []);

  const selectedDemand = useMemo<Demand>(
    () => demandForTime(time || "12:00"),
    [time]
  );

  const serviceBasePrice = Number(service?.basePriceEuro || 0);

  const finalServicePrice = useMemo(
    () => calcDynamicPriceEuro(serviceBasePrice, selectedDemand),
    [serviceBasePrice, selectedDemand]
  );

  const reservedTimes = useMemo(
    () => (service && time ? reservedTimesFromStart(time, service.durationMin, 30) : []),
    [service, time]
  );

  const currentUser = getAuthUser();

  function validatePayment() {
    if (paymentMethod === "salon") return true;
    if (!cardName.trim()) return "Enter cardholder name.";
    if (cardNumber.replace(/\s/g, "").length < 12) return "Enter a valid card number.";
    if (!cardExpiry.includes("/")) return "Enter expiry like MM/YY.";
    if (cardCvc.trim().length < 3) return "Enter a valid CVC.";
    return true;
  }

  function goToLogin() {
    const next = `/book?barberId=${encodeURIComponent(barberId)}${
      service ? `&serviceId=${encodeURIComponent(service.id)}` : ""
    }${date ? `&date=${encodeURIComponent(date)}` : ""}${
      time ? `&time=${encodeURIComponent(time)}` : ""
    }`;

    window.location.href = `/login?next=${encodeURIComponent(next)}`;
  }

  async function handleConfirm() {
  if (!currentUser?.email) {
    goToLogin();
    return;
  }

  if (!barber || !service) {
    alert("Please select a barber and service.");
    return;
  }

  if (!time) {
    alert("Please select a time slot.");
    setStep(2);
    return;
  }

  if (!slots.includes(time)) {
    alert("That slot is no longer available. Please choose another time.");
    setStep(2);
    return;
  }

  const paymentCheck = validatePayment();
  if (paymentCheck !== true) {
    alert(paymentCheck);
    return;
  }

  try {
    setIsSubmitting(true);

    const latestReserved = await getReservedTimesForBarber(barber.id, date);
    const latestTaken = new Set(latestReserved);

    if (reservedTimes.some((t) => latestTaken.has(t))) {
      alert("That slot was just booked by someone else. Please choose another time.");
      setReservedFromDb(latestReserved);
      setTime("");
      setStep(2);
      setIsSubmitting(false);
      return;
    }

    const { data } = await getCurrentUser();
    const authUser = data.user;

    if (!authUser?.id || !authUser.email) {
      setIsSubmitting(false);
      goToLogin();
      return;
    }

    const bookingId = makeLocalBookingId();

    const aiHairRaw = sessionStorage.getItem("cutato_ai_hair_reference");
    const aiHair = aiHairRaw ? JSON.parse(aiHairRaw) : null;

    const bookingPayload = {
      id: bookingId,
      createdAt: new Date().toISOString(),

      barberId: barber.id,
      barberName: barber.name,

      serviceId: service.id,
      serviceName: service.name,
      durationMin: service.durationMin,

      date,
      time,
      reservedTimes,

      demand: selectedDemand,

      basePriceEuro: Number(service.basePriceEuro || 0),
      servicePriceEuro: Number(finalServicePrice || 0),
      tipEuro: 0,
      totalEuro: Number(finalServicePrice || 0),

      paymentMethod,
      userEmail: authUser.email,
      userId: authUser.id,

      status: "pending",

      assignedBarberId: barber.id,

      referenceImage: aiHair?.image,
      haircutBrief: aiHair?.barberBrief,
      aiStyle: aiHair?.style,
    } as Booking & { userId: string };

    await createBookingInSupabase(bookingPayload);

    sessionStorage.removeItem("cutato_ai_hair_reference");

    if (paymentMethod === "online") {
      const stripeRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceName: service.name,
          amountEuro: finalServicePrice,
          barberName: barber.name,
          bookingId,
          customerEmail: authUser.email,
        }),
      });

      const stripeData = await stripeRes.json();

      if (!stripeRes.ok || !stripeData.url) {
        alert(stripeData.error || "Stripe checkout failed.");
        setIsSubmitting(false);
        return;
      }

      window.location.href = stripeData.url;
      return;
    }

    window.location.href = `/booking-success?bookingId=${encodeURIComponent(bookingId)}`;
  } catch (err) {
    setIsSubmitting(false);
    alert(err instanceof Error ? err.message : "Could not complete booking.");
  }
}

  if (barberLoading) {
    return (
      <WebShell title="Book appointment" subtitle="Loading barber...">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
          <div className="font-black">Loading barber...</div>
        </div>
      </WebShell>
    );
  }

  if (!barber) {
    return (
      <WebShell title="Book appointment" subtitle="Barber not found">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-black/10 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black">Invalid barber</h2>
          <p className="mt-2 text-neutral-500">
            We could not find the barber profile for this booking link.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-[#ff355d] px-6 py-3 text-sm font-black text-white"
          >
            Back to home
          </Link>
        </div>
      </WebShell>
    );
  }

  return (
    <>
      <WebShell title="Book appointment" subtitle={barber.name}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <BookingStepper step={step} />

            <Link
              href={`/barbers/${encodeURIComponent(barber.id)}`}
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-black shadow-sm transition hover:bg-neutral-50"
            >
              View profile
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="grid gap-6">
              <BarberHero barber={barber} />

              {step === 1 ? (
                <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
                  <SectionTitle
                    icon={<Scissors />}
                    title="Choose your service"
                    subtitle="Select what you want to book today."
                  />

                  <div className="mt-6 grid gap-4">
                    {services.length === 0 ? (
                      <p className="text-neutral-500">
                        No services available for this barber yet.
                      </p>
                    ) : (
                      services.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setService(s)}
                          className={`rounded-[26px] border p-5 text-left transition hover:-translate-y-0.5 ${
                            service?.id === s.id
                              ? "border-[#ff355d] bg-[#ff355d]/5 shadow-lg shadow-[#ff355d]/10"
                              : "border-black/10 bg-white hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-black">{s.name}</h3>
                              <p className="mt-1 text-sm font-bold text-neutral-500">
                                {s.durationMin} min • {s.category}
                              </p>
                              {s.description ? (
                                <p className="mt-2 text-sm leading-6 text-neutral-500">
                                  {s.description}
                                </p>
                              ) : null}
                            </div>

                            <div className="text-right text-xl font-black">
                              {fmtMoney(s.basePriceEuro, salon.currency)}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      className="rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 transition hover:bg-[#ff1f4c] disabled:opacity-50"
                      disabled={!service}
                      onClick={() => setStep(2)}
                    >
                      Continue to time
                    </button>
                  </div>
                </section>
              ) : null}

              {step === 2 ? (
                <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <SectionTitle
                      icon={<Clock />}
                      title="Pick your time"
                      subtitle={
                        service
                          ? `${service.name} • ${service.durationMin} min`
                          : "Choose a service first"
                      }
                    />

                    <div className="flex flex-wrap gap-2">
                      <DateButton
                        active={date === today}
                        onClick={() => setDate(today)}
                        label={`Today • ${prettyDayLabel(today)}`}
                      />
                      <DateButton
                        active={date === tomorrow}
                        onClick={() => setDate(tomorrow)}
                        label={`Tomorrow • ${prettyDayLabel(tomorrow)}`}
                      />
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {slots.length === 0 ? (
                      <p className="col-span-full text-neutral-500">
                        No slots available for the selected day.
                      </p>
                    ) : (
                      slots.map((t) => {
                        const d = demandForTime(t);

                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTime(t)}
                            className={`rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 ${
                              time === t
                                ? "border-[#ff355d] bg-[#ff355d] text-white shadow-lg shadow-[#ff355d]/25"
                                : "border-black/10 bg-neutral-50 hover:bg-white"
                            }`}
                          >
                            <div className="text-lg font-black">{t}</div>
                            <div
                              className={`mt-1 text-xs font-black ${
                                time === t
                                  ? "text-white/75"
                                  : d === "busy"
                                  ? "text-[#ff355d]"
                                  : d === "quiet"
                                  ? "text-emerald-600"
                                  : "text-neutral-400"
                              }`}
                            >
                              {demandLabel(d)}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-6 flex justify-between gap-3">
                    <button
                      className="rounded-full border border-black/10 bg-white px-6 py-4 text-sm font-black shadow-sm"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>

                    <button
                      className="rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 disabled:opacity-50"
                      disabled={!time}
                      onClick={() => setStep(3)}
                    >
                      Continue to payment
                    </button>
                  </div>
                </section>
              ) : null}

              {step === 3 ? (
                <section className="rounded-[34px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
                  <SectionTitle
                    icon={<CreditCard />}
                    title="Payment method"
                    subtitle="Choose how you want to pay."
                  />

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <PaymentButton
                      active={paymentMethod === "online"}
                      icon={<CreditCard />}
                      title="Pay online"
                      text="Instant confirmed booking"
                      onClick={() => setPaymentMethod("online")}
                    />

                    <PaymentButton
                      active={paymentMethod === "salon"}
                      icon={<Wallet />}
                      title="Pay at salon"
                      text="Booking will be pending"
                      onClick={() => setPaymentMethod("salon")}
                    />
                  </div>

                  {paymentMethod === "online" ? (
                    <div className="mt-6 rounded-[28px] bg-neutral-50 p-5">
                      <h3 className="font-black">Card details</h3>

                      <div className="mt-4 grid gap-3">
                        <Input placeholder="Cardholder name" value={cardName} onChange={setCardName} />
                        <Input placeholder="Card number" value={cardNumber} onChange={setCardNumber} />

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input placeholder="MM/YY" value={cardExpiry} onChange={setCardExpiry} />
                          <Input placeholder="CVC" value={cardCvc} onChange={setCardCvc} />
                        </div>

                        <p className="text-xs font-bold text-neutral-400">
                          Demo payment only — no real charge is made.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6 flex justify-between gap-3">
                    <button
                      className="rounded-full border border-black/10 bg-white px-6 py-4 text-sm font-black shadow-sm"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </button>

                    {!currentUser?.email ? (
                      <button
                        className="rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25"
                        onClick={goToLogin}
                      >
                        Login to continue
                      </button>
                    ) : (
                      <button
                        className="rounded-full bg-[#ff355d] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#ff355d]/25 disabled:opacity-50"
                        disabled={isSubmitting}
                        onClick={handleConfirm}
                      >
                        {isSubmitting
                          ? "Processing..."
                          : paymentMethod === "online"
                          ? "Pay & confirm"
                          : "Confirm booking"}
                      </button>
                    )}
                  </div>
                </section>
              ) : null}
            </div>

            <BookingSummary
              barberName={barber.name}
              serviceName={service?.name ?? "—"}
              date={prettyDayLabel(date)}
              time={time || "—"}
              demand={time ? demandLabel(selectedDemand) : "—"}
              reserved={reservedTimes.length ? reservedTimes.join(", ") : "—"}
              payment={paymentMethod === "online" ? "Online" : "At salon"}
              price={fmtMoney(finalServicePrice, salon.currency)}
            />
          </div>
        </div>
      </WebShell>

      <ChatBot />
    </>
  );
}

function BookingStepper({ step }: { step: Step }) {
  const items = [
    { id: 1, label: "Service", icon: <Scissors size={16} /> },
    { id: 2, label: "Time", icon: <Clock size={16} /> },
    { id: 3, label: "Payment", icon: <CreditCard size={16} /> },
  ];

  return (
    <div className="flex flex-wrap gap-2 rounded-full border border-black/10 bg-white p-2 shadow-sm">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
            step === item.id ? "bg-[#ff355d] text-white" : "text-neutral-500"
          }`}
        >
          {item.icon}
          {item.label}
        </div>
      ))}
    </div>
  );
}

function BarberHero({ barber }: { barber: CustomerBarber }) {
  return (
    <section className="relative overflow-hidden rounded-[34px] bg-neutral-950 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)] md:p-8">
      <div className="absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full bg-[#ff355d]/30 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/70">
            <Sparkles size={15} />
            Selected barber
          </div>

          <h2 className="mt-4 text-4xl font-black tracking-[-0.05em]">
            {barber.name}
          </h2>

          <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-white/60">
            <span className="flex items-center gap-1">
              <Star size={15} className="fill-[#ff355d] text-[#ff355d]" />
              {Number(barber.rating ?? 0).toFixed(1)}
            </span>

            <span className="flex items-center gap-1">
              <MapPin size={15} />
              {Number(barber.distKm ?? 0).toFixed(1)} km
            </span>

            <span>{barber.area}</span>
          </div>

          {barber.speciality ? (
            <p className="mt-3 font-bold text-white/70">{barber.speciality}</p>
          ) : null}

          {barber.tagline ? (
            <p className="mt-4 max-w-xl text-white/70">{barber.tagline}</p>
          ) : null}
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/10 p-5 backdrop-blur">
          <CheckCircle2 className="text-[#ff355d]" />
          <p className="mt-3 text-sm font-black">Live availability enabled</p>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff355d]/10 text-[#ff355d]">
        {icon}
      </div>

      <div>
        <h2 className="text-2xl font-black tracking-[-0.03em]">{title}</h2>
        <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      </div>
    </div>
  );
}

function DateButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-3 text-sm font-black transition ${
        active
          ? "bg-[#ff355d] text-white shadow-lg shadow-[#ff355d]/20"
          : "border border-black/10 bg-white hover:bg-neutral-50"
      }`}
    >
      <CalendarDays className="mr-2 inline" size={15} />
      {label}
    </button>
  );
}

function PaymentButton({
  active,
  icon,
  title,
  text,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[26px] border p-5 text-left transition hover:-translate-y-0.5 ${
        active
          ? "border-[#ff355d] bg-[#ff355d]/5"
          : "border-black/10 bg-neutral-50 hover:bg-white"
      }`}
    >
      <div className="mb-4 inline-flex rounded-2xl bg-[#ff355d]/10 p-3 text-[#ff355d]">
        {icon}
      </div>

      <h3 className="font-black">{title}</h3>
      <p className="mt-1 text-sm text-neutral-500">{text}</p>
    </button>
  );
}

function Input({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#ff355d]"
    />
  );
}

function BookingSummary({
  barberName,
  serviceName,
  date,
  time,
  demand,
  reserved,
  payment,
  price,
}: {
  barberName: string;
  serviceName: string;
  date: string;
  time: string;
  demand: string;
  reserved: string;
  payment: string;
  price: string;
}) {
  return (
    <aside className="h-fit rounded-[34px] border border-black/10 bg-white p-6 shadow-sm lg:sticky lg:top-28">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-[#ff355d]">
        Summary
      </p>

      <h2 className="mt-3 text-2xl font-black">Your booking</h2>

      <p className="mt-2 text-sm text-neutral-500">
        Review all details before confirming.
      </p>

      <div className="my-6 h-px bg-black/10" />

      <div className="grid gap-4">
        <SummaryRow label="Barber" value={barberName} />
        <SummaryRow label="Service" value={serviceName} />
        <SummaryRow label="Date" value={date} />
        <SummaryRow label="Time" value={time} />
        <SummaryRow label="Reserved" value={reserved} />
        <SummaryRow label="Demand" value={demand} />
        <SummaryRow label="Payment" value={payment} />
      </div>

      <div className="my-6 h-px bg-black/10" />

      <div className="flex items-center justify-between">
        <span className="font-black">Total</span>
        <span className="text-3xl font-black text-[#ff355d]">{price}</span>
      </div>

      <div className="mt-6 rounded-[24px] bg-neutral-50 p-4 text-sm leading-6 text-neutral-500">
        Online bookings are auto-confirmed. Pay-at-salon bookings are created as pending.
      </div>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm font-bold text-neutral-500">{label}</span>
      <span className="max-w-[190px] text-right text-sm font-black">{value}</span>
    </div>
  );
}