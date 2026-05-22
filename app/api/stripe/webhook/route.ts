import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  sendBarberNewBookingEmail,
  sendBookingConfirmationEmail,
} from "@/app/lib/email";

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

      if (fetchError || !booking) {
        console.error("BOOKING FETCH ERROR:", fetchError);

        return NextResponse.json({
          received: true,
          warning: "Booking updated but could not fetch booking for email",
        });
      }

      const customerEmail = booking.user_email || booking.userEmail || "";
      const barberId =
        booking.barber_id ||
        booking.barberId ||
        booking.assigned_barber_id ||
        booking.assignedBarberId ||
        "";

      const barberName =
        booking.barber_name || booking.barberName || "Your barber";

      const serviceName =
        booking.service_name || booking.serviceName || "Your service";

      const totalEuro = Number(
        booking.total_euro ?? booking.totalEuro ?? booking.service_price_euro ?? 0
      );

      if (customerEmail) {
        await sendBookingConfirmationEmail({
          to: customerEmail,
          customerName: customerEmail.split("@")[0] || "there",
          barberName,
          serviceName,
          date: booking.date || "",
          time: booking.time || "",
          totalEuro,
        });
      }

      let barberEmail = booking.barber_email || booking.barberEmail || "";

      if (!barberEmail && barberId) {
        const { data: barberProfile, error: profileError } = await adminSupabase
          .from("profiles")
          .select("email")
          .eq("barber_id", barberId)
          .eq("role", "barber")
          .maybeSingle();

        if (profileError) {
          console.error("BARBER PROFILE EMAIL FETCH ERROR:", profileError);
        }

        barberEmail = barberProfile?.email || "";
      }

      if (barberEmail) {
        await sendBarberNewBookingEmail({
          to: barberEmail,
          barberName,
          customerEmail: customerEmail || "Customer",
          serviceName,
          date: booking.date || "",
          time: booking.time || "",
          totalEuro,
          paymentMethod: booking.payment_method || booking.paymentMethod,
          aiStyle: booking.ai_style || booking.aiStyle,
          haircutBrief: booking.haircut_brief || booking.haircutBrief,
        });
      } else {
        console.log("BARBER EMAIL SKIPPED: No barber email found");
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