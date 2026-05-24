"use client";

import { readCustomerBarbers, type CustomerBarber } from "@/app/lib/barbersStore";
import { readAllServices, type Service } from "@/app/lib/servicesStore";
import { readSalonSettings } from "@/app/lib/salonSettingsStore";
import { generateSlotsForDate } from "@/app/lib/availabilityStore";

export type ChatRole = "user" | "bot";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
};

export type ChatQuickAction = {
  label: string;
  prompt: string;
};

export type ChatBotResponse = {
  text: string;
  actions?: ChatQuickAction[];
};

function uid(prefix = "msg") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function tokenize(s: string) {
  return normalize(s)
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function includesAny(haystack: string, words: string[]) {
  const tokens = tokenize(haystack);

  return words.some((word) => {
    const target = normalize(word);

    if (target.includes(" ")) {
      return normalize(haystack).includes(target);
    }

    return tokens.includes(target);
  });
}

function formatMoney(v: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
    }).format(v);
  } catch {
    return `€${v.toFixed(2)}`;
  }
}

function findBarberFromQuery(q: string, barbers: CustomerBarber[]) {
  const nq = normalize(q);

  for (const barber of barbers) {
    const candidates = [barber.id, barber.name, barber.area, barber.tagline ?? ""];
    if (candidates.some((c) => normalize(c).includes(nq) || nq.includes(normalize(c)))) {
      return barber;
    }
  }

  const tokens = tokenize(q);
  for (const barber of barbers) {
    const blob = normalize(`${barber.id} ${barber.name} ${barber.area} ${barber.tagline ?? ""}`);
    if (tokens.some((t) => blob.includes(t))) return barber;
  }

  return null;
}

function cheapestBarber(barbers: CustomerBarber[], services: Service[]) {
  const activeBarbers = barbers.filter((b) => b.active !== false);

  let best:
    | {
        barber: CustomerBarber;
        service: Service;
      }
    | null = null;

  for (const barber of activeBarbers) {
    const barberServices = services
      .filter((s) => s.active)
      .filter((s) => s.barberIds.includes(barber.id));

    if (!barberServices.length) continue;

    const cheapestService = barberServices.reduce((a, b) =>
      Number(a.basePriceEuro) <= Number(b.basePriceEuro) ? a : b
    );

    if (!best || Number(cheapestService.basePriceEuro) < Number(best.service.basePriceEuro)) {
      best = { barber, service: cheapestService };
    }
  }

  return best;
}

function slotsPreview(barberId: string, durationMin: number, label: "today" | "tomorrow") {
  const date =
    label === "today"
      ? dayKey(new Date())
      : dayKey(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const slots = generateSlotsForDate(barberId, date, durationMin).slice(0, 6);
  return { date, slots };
}

function topBarbersText(barbers: CustomerBarber[]) {
  const visible = barbers
    .filter((b) => b.active !== false)
    .slice()
    .sort((a, b) => {
      const r = Number(b.rating ?? 0) - Number(a.rating ?? 0);
      if (r !== 0) return r;
      return Number(a.distKm ?? 0) - Number(b.distKm ?? 0);
    })
    .slice(0, 5);

  if (!visible.length) {
    return "I couldn’t find any active barbers right now.";
  }

  return visible
    .map(
      (b, i) =>
        `${i + 1}. ${b.name} — ⭐ ${Number(b.rating ?? 0).toFixed(1)} • ${Number(
          b.distKm ?? 0
        ).toFixed(1)} km • ${b.area}`
    )
    .join("\n");
}

export function getDefaultQuickActions(): ChatQuickAction[] {
  return [
    { label: "Show barbers", prompt: "show barbers" },
    { label: "Cheapest barber", prompt: "which barber is cheapest?" },
    { label: "Today’s slots", prompt: "show me available slots today" },
    { label: "Services", prompt: "what services do you have?" },
    { label: "Cancellation policy", prompt: "what is the cancellation policy?" },
  ];
}

export function getWelcomeMessage(): ChatMessage {
  return {
    id: uid("welcome"),
    role: "bot",
    text:
      "Hi! I’m the Cutato assistant. I can help you find barbers, compare services, check slots, explain booking, and guide barber/salon users too.",
    createdAt: new Date().toISOString(),
  };
}

export function replyToChatTry(input: string): ChatBotResponse {
  const text = input.toLowerCase().trim();
  const q = normalize(input);
  const salon = readSalonSettings();
  const barbers = readCustomerBarbers().filter((b) => b.active !== false);
  const services = readAllServices().filter((s) => s.active);

  if (!q) {
    return {
      text: "Ask me something like “show barbers”, “which barber is cheapest”, or “what services does Abhi offer?”.",
      actions: getDefaultQuickActions(),
    };
  }

  if (includesAny(q, ["hello", "hi", "hey", "hii", "yo", "good morning", "good evening"])) {
    return {
      text: `Hi! Welcome to ${salon.salonName}. I can help you discover barbers, services, slots, payments, and booking steps.`,
      actions: getDefaultQuickActions(),
    };
  }

  if (q.includes("book this barber")) {
    return {
      text: "Opening booking for this barber ",
    };
  }

  if (includesAny(q, ["show barber", "barbers", "list barbers", "featured barber"])) {
    return {
      text: `Here are some active barbers:\n\n${topBarbersText(barbers)}`,
      actions: [
        { label: "Open home", prompt: "show barbers" },
        { label: "Cheapest barber", prompt: "which barber is cheapest?" },
      ],
    };
  }

  if (includesAny(q, ["cheapest barber", "lowest price", "budget barber", "cheap barber"])) {
    const best = cheapestBarber(barbers, services);

    if (!best) {
      return {
        text: "I couldn’t find any active barber with assigned services yet.",
      };
    }

    return {
      text: `${best.barber.name} looks like the cheapest option right now. The lowest listed service is ${best.service.name} for ${formatMoney(
        Number(best.service.basePriceEuro),
        salon.currency
      )}.`,
      actions: [
        { label: "View profile", prompt: `open_profile_${best.barber.id}` },
        { label: "Book now", prompt: `open_booking_${best.barber.id}` },
      ],
    };
  }

  if (includesAny(q, ["services", "what services", "service list", "what do you offer"])) {
    if (!services.length) {
      return {
        text: "There are no active services configured right now.",
      };
    }

    const grouped = new Map<string, Service[]>();
    for (const s of services) {
      const key = s.category || "Other";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(s);
    }

    const text = Array.from(grouped.entries())
      .map(([cat, list]) => {
        const lines = list
          .slice()
          .sort((a, b) => Number(a.basePriceEuro) - Number(b.basePriceEuro))
          .map(
            (s) =>
              `• ${s.name} — ${s.durationMin} min — ${formatMoney(
                Number(s.basePriceEuro),
                salon.currency
              )}`
          )
          .join("\n");
        return `${cat}\n${lines}`;
      })
      .join("\n\n");

    return {
      text: `Here are the current services:\n\n${text}`,
      actions: [
        { label: "Cheapest barber", prompt: "which barber is cheapest?" },
        { label: "Show barbers", prompt: "show barbers" },
      ],
    };
  }

  if (includesAny(q, ["today slot", "today slots", "available today", "slots today", "free today"])) {
    const candidates = barbers
      .map((barber) => {
        const barberServices = services.filter((s) => s.active && s.barberIds.includes(barber.id));
        const cheapest = barberServices.length
          ? barberServices.reduce((a, b) =>
              Number(a.basePriceEuro) <= Number(b.basePriceEuro) ? a : b
            )
          : null;

        const duration = cheapest?.durationMin ?? 30;
        const preview = slotsPreview(barber.id, duration, "today");
        return { barber, preview, cheapest };
      })
      .filter((x) => x.preview.slots.length > 0)
      .slice(0, 5);

    if (!candidates.length) {
      return {
        text: "I couldn’t find any available slots today right now.",
      };
    }

    const text = candidates
      .map(
        (x) =>
          `${x.barber.name}: ${x.preview.slots.join(", ")}${
            x.cheapest ? ` • from ${formatMoney(Number(x.cheapest.basePriceEuro), salon.currency)}` : ""
          }`
      )
      .join("\n");

    return {
      text: `Here are some available slots today:\n\n${text}`,
      actions: [
        { label: "Tomorrow’s slots", prompt: "show me available slots tomorrow" },
        { label: "Show barbers", prompt: "show barbers" },
      ],
    };
  }

  if (
    includesAny(q, [
      "tomorrow slot",
      "tomorrow slots",
      "available tomorrow",
      "slots tomorrow",
      "free tomorrow",
    ])
  ) {
    const candidates = barbers
      .map((barber) => {
        const barberServices = services.filter((s) => s.active && s.barberIds.includes(barber.id));
        const cheapest = barberServices.length
          ? barberServices.reduce((a, b) =>
              Number(a.basePriceEuro) <= Number(b.basePriceEuro) ? a : b
            )
          : null;

        const duration = cheapest?.durationMin ?? 30;
        const preview = slotsPreview(barber.id, duration, "tomorrow");
        return { barber, preview, cheapest };
      })
      .filter((x) => x.preview.slots.length > 0)
      .slice(0, 5);

    if (!candidates.length) {
      return {
        text: "I couldn’t find any available slots for tomorrow right now.",
      };
    }

    const text = candidates
      .map(
        (x) =>
          `${x.barber.name}: ${x.preview.slots.join(", ")}${
            x.cheapest ? ` • from ${formatMoney(Number(x.cheapest.basePriceEuro), salon.currency)}` : ""
          }`
      )
      .join("\n");

    return {
      text: `Here are some available slots for tomorrow:\n\n${text}`,
      actions: [
        { label: "Today’s slots", prompt: "show me available slots today" },
        { label: "Show barbers", prompt: "show barbers" },
      ],
    };
  }

  if (includesAny(q, ["slot for", "slots for", "show slots for", "availability for"])) {
    const barber = findBarberFromQuery(q, barbers);

    if (!barber) {
      return {
        text: "I couldn’t figure out which barber you meant. Try something like “show slots for Abhi”.",
      };
    }

    const barberServices = services.filter((s) => s.active && s.barberIds.includes(barber.id));
    const cheapest = barberServices.length
      ? barberServices.reduce((a, b) =>
          Number(a.basePriceEuro) <= Number(b.basePriceEuro) ? a : b
        )
      : null;

    const duration = cheapest?.durationMin ?? 30;
    const todayPreview = slotsPreview(barber.id, duration, "today");
    const tomorrowPreview = slotsPreview(barber.id, duration, "tomorrow");

    return {
      text:
        `${barber.name} availability preview:\n\n` +
        `Today: ${todayPreview.slots.length ? todayPreview.slots.join(", ") : "No slots"}\n` +
        `Tomorrow: ${tomorrowPreview.slots.length ? tomorrowPreview.slots.join(", ") : "No slots"}`,
      actions: [
        { label: "View profile", prompt: `open_profile_${barber.id}` },
        { label: "Book now", prompt: `open_booking_${barber.id}` },
      ],
    };
  }

  if (includesAny(q, ["tell me about", "who is", "barber profile", "profile of", "about barber"])) {
    const barber = findBarberFromQuery(q, barbers);

    if (!barber) {
      return {
        text: "I couldn’t match that barber. Try using the barber name, like “tell me about Abhi”.",
      };
    }

    const barberServices = services.filter((s) => s.active && s.barberIds.includes(barber.id));
    const cheapest = barberServices.length
      ? barberServices.reduce((a, b) =>
          Number(a.basePriceEuro) <= Number(b.basePriceEuro) ? a : b
        )
      : null;

    return {
      text:
        `${barber.name}\n` +
        `⭐ ${Number(barber.rating ?? 0).toFixed(1)} • ${Number(barber.distKm ?? 0).toFixed(
          1
        )} km • ${barber.area}\n` +
        `${barber.address}\n` +
        `${barber.tagline ? `${barber.tagline}\n` : ""}` +
        `${barber.about ? `${barber.about}\n` : ""}` +
        `${cheapest ? `Starting from ${formatMoney(Number(cheapest.basePriceEuro), salon.currency)}.` : ""}`,
      actions: [
        { label: "View profile", prompt: `open_profile_${barber.id}` },
        { label: "Book now", prompt: `open_booking_${barber.id}` },
      ],
    };
  }

  if (includesAny(q, ["what services does", "services of", "services for", "offer"])) {
    const barber = findBarberFromQuery(q, barbers);

    if (!barber) {
      return {
        text: "I couldn’t identify the barber. Try “what services does Abhi offer?”.",
      };
    }

    const barberServices = services.filter((s) => s.active && s.barberIds.includes(barber.id));

    if (!barberServices.length) {
      return {
        text: `${barber.name} does not have active services assigned yet.`,
      };
    }

    const text = barberServices
      .slice()
      .sort((a, b) => Number(a.basePriceEuro) - Number(b.basePriceEuro))
      .map(
        (s) =>
          `• ${s.name} — ${s.durationMin} min — ${formatMoney(Number(s.basePriceEuro), salon.currency)}`
      )
      .join("\n");

    return {
      text: `${barber.name} currently offers:\n\n${text}`,
      actions: [
        { label: "View profile", prompt: `open_profile_${barber.id}` },
        { label: "Book now", prompt: `open_booking_${barber.id}` },
      ],
    };
  }

  if (includesAny(q, ["how do i book", "how to book", "book haircut", "book appointment"])) {
    return {
      text:
        "Booking is simple:\n" +
        "1. Choose a barber.\n" +
        "2. Select a service.\n" +
        "3. Pick an available time slot.\n" +
        "4. Pay online or choose pay at salon.\n" +
        "5. Confirm your booking.",
      actions: [
        { label: "Show barbers", prompt: "show barbers" },
        { label: "Today’s slots", prompt: "show me available slots today" },
      ],
    };
  }

  if (includesAny(q, ["cancellation policy", "cancel booking", "refund", "how can i cancel"])) {
    return {
      text:
        salon.cancellationPolicy ||
        "Please cancel at least 2 hours before your appointment.",
      actions: [{ label: "My bookings", prompt: "my bookings" }],
    };
  }

  if (includesAny(q, ["my bookings", "manage bookings", "where are my bookings"])) {
    return {
      text:
        "You can manage your bookings from the “My bookings” page. There you can review upcoming bookings, open past ones, reschedule eligible appointments, cancel active bookings, and add them to your calendar.",
      actions: [{ label: "Open my bookings", prompt: "my bookings" }],
    };
  }

  if (includesAny(q, ["pay online", "payment", "pay at salon", "card"])) {
    return {
      text:
        "Cutato supports two payment modes in the current flow: pay online or pay at salon. Online bookings are usually confirmed immediately, while pay-at-salon bookings can remain pending until the salon confirms them.",
    };
  }

  if (includesAny(q, ["barber login", "login as barber", "how do i login as barber"])) {
    return {
      text:
        "To log in as a barber, use the barber portal login. The login email should match the barber ID pattern, for example barber ID “abhi” becomes “abhi@cutato.com”.",
      actions: [{ label: "Open barber login", prompt: "login as barber" }],
    };
  }

  if (includesAny(q, ["salon login", "login as salon", "how do i login as salon"])) {
    return {
      text:
        "Salon owners can use the salon portal login to manage staff, services, availability, bookings, and settings.",
      actions: [{ label: "Open salon login", prompt: "login as salon" }],
    };
  }

  if (
    includesAny(q, [
      "add services",
      "manage services",
      "where can i manage services",
      "services page",
    ])
  ) {
    return {
      text:
        "Salon owners can manage services from the salon services page. There you can create services, edit price and duration, and assign them to specific barbers.",
    };
  }

  if (
    includesAny(q, [
      "change availability",
      "manage availability",
      "availability page",
      "working hours",
    ])
  ) {
    return {
      text:
        "Availability can be managed from the portal availability pages. Salon owners can define overall availability rules, while individual barbers can manage their own working hours, breaks, and time off.",
    };
  }

  if (includesAny(q, ["where are bookings", "salon bookings", "manage booking in salon"])) {
    return {
      text:
        "Salon owners can manage all appointments from the salon bookings page. There you can filter bookings, assign barbers, and update statuses like confirmed, completed, cancelled, or no-show.",
    };
  }

  if (includesAny(q, ["hello salon", "about salon", "salon info", "contact", "address", "phone"])) {
    return {
      text:
        `${salon.salonName}\n` +
        `${salon.address}\n` +
        `${salon.phone}\n` +
        `${salon.email}\n` +
        `${salon.website ? salon.website : ""}`.trim(),
    };
  }

  return {
    text:
      "I’m not fully sure what you mean yet, but I can help with barbers, services, slots, booking steps, payments, cancellation, barber login, and salon management pages.",
    actions: getDefaultQuickActions(),
  };
}

export function replyToChat(input: string): string {
  const text = input.toLowerCase().trim();

  /* ---------- BOOK + SUGGEST ---------- */
  if (
    (text.includes("book") || text.includes("appointment")) &&
    (text.includes("suggest") ||
      text.includes("recommend") ||
      text.includes("near") ||
      text.includes("barber"))
  ) {
    return " I got you!\nHere are some top barbers near you 👇\n(Scroll down or click 'Show barbers')";
  }

  
  /* ---------- DEFAULT ---------- */
  return " Try asking:\n• Book a barber\n• Show cheapest\n• Today slots\n• My bookings";
}