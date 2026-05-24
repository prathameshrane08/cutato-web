import { NextResponse } from "next/server";

export const runtime = "edge";

function fallbackReply(message: string) {
  const m = message.toLowerCase();

  if (
    m.includes("cheapest") ||
    m.includes("cheap barber") ||
    m.includes("lowest price")
  ) {
    return "I can help compare barbers based on pricing and services.";
  }

  if (
    m.includes("barber portal") ||
    m.includes("barber dashboard") ||
    m.includes("barber login")
  ) {
    return "OPEN_BARBER_PORTAL\nOpening barber portal.";
  }

  if (
    m.includes("salon portal") ||
    m.includes("salon dashboard") ||
    m.includes("salon login")
  ) {
    return "OPEN_SALON_PORTAL\nOpening salon portal.";
  }

  if (m.includes("bookings") || m.includes("my booking")) {
    return "OPEN_BOOKINGS\nOpening your bookings.";
  }

  if (
    m.includes("book") ||
    m.includes("appointment") ||
    m.includes("haircut")
  ) {
    return [
      "BOOKING_INTENT",
      "date=any",
      "time=any",
      "service=haircut",
      "barber=any",
      "",
      "I can help you start this booking.",
    ].join("\n");
  }

  return "I can help with bookings, haircare, grooming, barber discovery, and general questions.";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = String(body?.message || "");
    const pathname = String(body?.pathname || "/");

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        text: fallbackReply(message),
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          stream: true,
          messages: [
            {
              role: "system",
              content: `
You are Cutato Assistant, an AI assistant inside a modern barber booking platform.

You can:
- answer like ChatGPT
- answer general questions
- help with grooming and haircare
- explain hairstyles and beard styles
- help users discover barbers
- explain services and pricing
- guide users through bookings
- answer casually and naturally

Cutato platform features:
- barber discovery
- appointment booking
- online/salon payment
- booking management
- salon dashboards
- barber dashboards

Rules:
- Keep answers useful, modern, and conversational.
- Keep answers concise unless user asks for detail.
- Do not invent private booking data.
- For grooming/haircare questions, answer normally like an expert assistant.
- For general knowledge questions, behave like ChatGPT.

Navigation commands:
OPEN_BOOKINGS
OPEN_HOME
OPEN_BARBER_PORTAL
OPEN_SALON_PORTAL

Booking format:
BOOKING_INTENT
date=...
time=...
service=...
barber=...

Then continue with a helpful sentence.
              `.trim(),
            },
            {
              role: "user",
              content: `
Current page: ${pathname}

User message:
${message}
              `,
            },
          ],
        }),
      }
    );

    if (!response.ok || !response.body) {
      console.error("OpenAI streaming failed");

      return NextResponse.json({
        text: fallbackReply(message),
      });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("CHAT ROUTE ERROR:", error);

    return NextResponse.json({
      text: "Something went wrong. Please try again.",
    });
  }
}