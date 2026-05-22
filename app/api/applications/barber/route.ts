import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendBarberApplicationEmail } from "@/app/lib/email";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.name || !body?.email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    const { error: insertError } = await adminSupabase
      .from("applications")
      .insert({
        type: "barber",
        status: "pending",

        name: body.name,
        email: body.email,

        phone: body.phone,
        city: body.city,

        experience: body.experience,
        instagram: body.instagram,
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    await sendBarberApplicationEmail({
      name: body.name,
      email: body.email,

      phone: body.phone,
      city: body.city,

      experience: body.experience,
      instagram: body.instagram,
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