import { NextResponse } from "next/server";
import Stripe from "stripe";

import { adminSupabase, requireUser } from "@/app/lib/supabase/serverAuth";
import { calcDynamicPriceEuro, demandForTime } from "@/app/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const bookingId = String(body?.bookingId ?? "").trim();

    if (!bookingId) {
      return NextResponse.json({ error: "Missing booking." }, { status: 400 });
    }

    // The price is always derived on the server from the stored booking and the
    // service catalogue; amounts sent by the browser are never trusted.
    const { data: booking } = await adminSupabase
      .from("bookings")
      .select("id, user_id, user_email, service_id, barber_name, time, stripe_paid")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking || booking.user_id !== auth.value.id) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.stripe_paid) {
      return NextResponse.json({ error: "This booking is already paid." }, { status: 409 });
    }

    const { data: service } = await adminSupabase
      .from("services")
      .select("id, name, base_price_euro")
      .eq("id", booking.service_id)
      .maybeSingle();

    if (!service) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    const priceEuro = calcDynamicPriceEuro(
      Number(service.base_price_euro || 0),
      demandForTime(String(booking.time || "12:00"))
    );

    if (!(priceEuro > 0)) {
      return NextResponse.json({ error: "This service has no online price." }, { status: 400 });
    }

    await adminSupabase
      .from("bookings")
      .update({ service_price_euro: priceEuro, total_euro: priceEuro })
      .eq("id", booking.id);

    const origin = process.env.NEXT_PUBLIC_APP_URL || req.headers.get("origin") || "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: booking.user_email || auth.value.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            product_data: {
              name: `${service.name} • ${booking.barber_name || "Cutato"}`,
              description: "Barber appointment booking",
            },
            unit_amount: Math.round(priceEuro * 100),
          },
        },
      ],
      metadata: { bookingId: booking.id },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bookings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("STRIPE CHECKOUT ERROR:", err);

    return NextResponse.json({ error: "Stripe checkout failed." }, { status: 500 });
  }
}
