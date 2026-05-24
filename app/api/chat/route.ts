import { NextResponse } from "next/server";

async function callOpenAI(payload: any, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();

    if (res.ok) {
      return JSON.parse(raw);
    }

    console.error("OPENAI STATUS:", res.status);
    console.error("OPENAI RAW ERROR:", raw);

    if (res.status < 500 || attempt === retries) {
      throw new Error(`OpenAI error ${res.status}`);
    }

    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
}

function fallbackReply(message: string, pathname: string) {
  const m = message.toLowerCase();

  if (m.includes("my booking") || m.includes("bookings")) {
    return "OPEN_BOOKINGS\nYou can view and manage your appointments from My bookings.";
  }

  if (
    m.includes("cheapest") ||
    m.includes("lowest price") ||
    m.includes("cheap barber") ||
    m.includes("budget barber")
  ) {
    return "For cheapest barber, I compare active barbers by their lowest assigned service price. Please check the current services list or barber cards for the latest result.";
  }

  if (
    m.includes("show barbers") ||
    m.includes("list barbers") ||
    m.includes("open barbers") ||
    m.includes("home")
  ) {
    return "OPEN_HOME\nI’ll take you to the barber discovery page.";
  }

  if (m.includes("salon portal")) {
    return "OPEN_SALON_PORTAL\nOpening the salon portal.";
  }

  if (m.includes("barber portal")) {
    return "OPEN_BARBER_PORTAL\nOpening the barber portal.";
  }

  if (m.includes("book") || m.includes("appointment") || m.includes("haircut")) {
    return [
      "BOOKING_INTENT",
      "date=any",
      "time=any",
      "service=haircut",
      "barber=any",
      "",
      "I can help you start a haircut booking. Choose a barber and available slot to confirm.",
    ].join("\n");
  }

  if (m.includes("cancel")) {
    return "To cancel a booking, open My bookings, find the appointment, and click Cancel if the booking is still pending or confirmed.";
  }

  if (m.includes("payment") || m.includes("pay")) {
    return "Cutato supports online payment and pay-at-salon. Online bookings are confirmed immediately, while salon payments can stay pending.";
  }

  if (m.includes("salon")) {
    return "Salon owners can manage staff, services, bookings, assignments, availability, and booking statuses from the salon portal.";
  }

  if (
    m.includes("barber portal") ||
    m.includes("barber dashboard") ||
    m.includes("barber login")
  ) {
    return "OPEN_BARBER_PORTAL\nOpening the barber portal.";
  }
  return "I can help with booking, payments, cancellations, barber profiles, salon tools, and your appointments.";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = String(body?.message || "");
    const pathname = String(body?.pathname || "/");

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        text: fallbackReply(message, pathname),
      });
    }

    try {
      const data = await callOpenAI({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: `
You are Cutato Assistant, a helpful AI assistant inside a barber booking web app.

Cutato features:
- Customers can discover barbers, view services, choose time slots, select payment, and confirm bookings.
- Customers can view, cancel, reschedule, and add bookings to calendar.
- Barbers can view their dashboard, schedule, bookings, revenue, and booking statuses.
- Salon owners can manage staff, services, bookings, assignments, availability, and statuses.
- Cutato supports Supabase Auth, realtime updates, conflict-safe booking, and role-based portals.

Rules:
- Keep replies short, practical, and friendly.
- You can answer general questions like ChatGPT, but for Cutato bookings, prices, services, slots, and user-specific data, only use available app data or say what you can help the user check.
- If the user asks to navigate, include exactly one command at the top:
- If the user asks a general non-Cutato question, answer normally like a helpful assistant.
OPEN_BOOKINGS
OPEN_HOME
OPEN_BARBER_PORTAL
OPEN_SALON_PORTAL

When the user wants to create or start a booking, respond in this exact format:

BOOKING_INTENT
date=...
time=...
service=...
barber=...

Then add one short helpful sentence.

Examples:
User: Book me a haircut tomorrow evening
Assistant:
BOOKING_INTENT
date=tomorrow
time=evening
service=haircut
barber=any

I can help you start this booking.

User: Take me to my bookings
Assistant:
OPEN_BOOKINGS
Opening your bookings page.
            `.trim(),
          },
          {
            role: "user",
            content: `Current page: ${pathname}\nUser message: ${message}`,
          },
        ],
      });

      return NextResponse.json({
        text: data.output_text || fallbackReply(message, pathname),
      });
    } catch (err) {
      console.error("AI fallback used:", err);

      return NextResponse.json({
        text: fallbackReply(message, pathname),
      });
    }
  } catch (error) {
    console.error("CHAT ROUTE ERROR:", error);

    return NextResponse.json({
      text: "Something went wrong in chat. Please try again.",
    });
  }
}