import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendSalonApplicationEmail } from "@/app/lib/email";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.salonName || !body?.ownerName || !body?.email) {
      return NextResponse.json(
        {
          error: "Salon name, owner name and email are required.",
        },
        { status: 400 }
      );
    }

    const { error: insertError } = await adminSupabase
      .from("applications")
      .insert({
        type: "salon",
        status: "pending",

        salon_name: body.salonName,
        owner_name: body.ownerName,

        email: body.email,
        phone: body.phone,

        city: body.city,
        address: body.address,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    await sendSalonApplicationEmail({
      salonName: body.salonName,
      ownerName: body.ownerName,

      email: body.email,
      phone: body.phone,

      city: body.city,
      address: body.address,
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || "Application failed.",
      },
      { status: 500 }
    );
  }
}