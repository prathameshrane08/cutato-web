import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendBookingConfirmationEmail } from "@/app/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const sig = (await headers()).get("stripe-signature");

    if (!sig) {
      return NextResponse.json(
        { error: "Missing stripe signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
      console.error("WEBHOOK VERIFY ERROR:", err.message);

      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;

      if (!bookingId) {
        console.error("WEBHOOK ERROR: Missing bookingId in Stripe metadata");

        return NextResponse.json({
          received: true,
          warning: "Missing bookingId",
        });
      }

      const { error: updateError } = await adminSupabase
        .from("bookings")
        .update({
          status: "confirmed",
          stripe_paid: true,
          stripe_session_id: session.id,
        })
        .eq("id", bookingId);

      if (updateError) {
        console.error("BOOKING UPDATE ERROR:", updateError);

        return NextResponse.json(
          { error: "Booking update failed" },
          { status: 500 }
        );
      }

      console.log("BOOKING CONFIRMED:", bookingId);

      const { data: booking, error: fetchError } = await adminSupabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (fetchError) {
        console.error("BOOKING FETCH ERROR:", fetchError);
      }

      if (booking?.user_email) {
        await sendBookingConfirmationEmail({
          to: booking.user_email,
          customerName:
            booking.user_email?.split("@")[0] || "there",
          barberName: booking.barber_name || "Your barber",
          serviceName: booking.service_name || "Your service",
          date: booking.date || "",
          time: booking.time || "",
          totalEuro: Number(booking.total_euro || 0),
        });
      }
    }

    return NextResponse.json({
      received: true,
    });
  } catch (err: any) {
    console.error("STRIPE WEBHOOK ERROR:", err);

    return NextResponse.json(
      {
        error: err?.message || "Webhook failed",
      },
      { status: 500 }
    );
  }
}