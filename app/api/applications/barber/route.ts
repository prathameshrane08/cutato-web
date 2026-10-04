import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendBarberApplicationEmail } from "@/app/lib/email";
import { rateLimit } from "@/app/lib/rateLimit";
import { cleanEmail, cleanText } from "@/app/lib/validation";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const limited = rateLimit(req, "apply-barber", { limit: 5, windowMs: 600_000 });
  if (limited) return limited;

  try {
    const raw = await req.json();
    const body = {
      name: cleanText(raw?.name),
      email: cleanEmail(raw?.email),
      phone: cleanText(raw?.phone, 40),
      city: cleanText(raw?.city, 100),
      experience: cleanText(raw?.experience, 2000),
      instagram: cleanText(raw?.instagram, 100),
    };

    if (!body.name || !body.email) {
      return NextResponse.json({ error: "Name and a valid email are required." }, { status: 400 });
    }

    const { error: insertError } = await adminSupabase.from("applications").insert({
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
      console.error("BARBER APPLICATION INSERT ERROR:", insertError);
      return NextResponse.json({ error: "Application failed." }, { status: 500 });
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
  } catch (err) {
    console.error("BARBER APPLICATION ERROR:", err);

    return NextResponse.json(
      {
        error: "Application failed.",
      },
      { status: 500 }
    );
  }
}
