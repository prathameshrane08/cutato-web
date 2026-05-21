import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      serviceName,
      amountEuro,
      barberName,
      bookingId,
      customerEmail,
    } = body;

    if (!amountEuro || !serviceName) {
      return NextResponse.json(
        { error: "Missing payment details." },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      customer_email: customerEmail || undefined,

      line_items: [
        {
          quantity: 1,

          price_data: {
            currency: "eur",

            product_data: {
              name: `${serviceName} • ${barberName || "Cutato"}`,
              description: "Barber appointment booking",
            },

            unit_amount: Math.round(Number(amountEuro) * 100),
          },
        },
      ],

      metadata: {
        bookingId: bookingId || "",
      },

      success_url: `${req.headers.get(
        "origin"
      )}/payment-success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${req.headers.get("origin")}/bookings`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (err: any) {
    console.error("STRIPE CHECKOUT ERROR:", err);

    return NextResponse.json(
      {
        error: err?.message || "Stripe checkout failed.",
      },
      { status: 500 }
    );
  }
}