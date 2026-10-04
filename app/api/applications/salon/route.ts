import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendSalonApplicationEmail } from "@/app/lib/email";
import { rateLimit } from "@/app/lib/rateLimit";
import { cleanEmail, cleanText } from "@/app/lib/validation";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const limited = rateLimit(req, "apply-salon", { limit: 5, windowMs: 600_000 });
  if (limited) return limited;

  try {
    const raw = await req.json();
    const body = {
      salonName: cleanText(raw?.salonName),
      ownerName: cleanText(raw?.ownerName),
      email: cleanEmail(raw?.email),
      phone: cleanText(raw?.phone, 40),
      city: cleanText(raw?.city, 100),
      address: cleanText(raw?.address, 300),
    };

    if (!body.salonName || !body.ownerName || !body.email) {
      return NextResponse.json(
        {
          error: "Salon name, owner name and a valid email are required.",
        },
        { status: 400 }
      );
    }

    const { error: insertError } = await adminSupabase.from("applications").insert({
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
      console.error("SALON APPLICATION INSERT ERROR:", insertError);
      return NextResponse.json({ error: "Application failed." }, { status: 500 });
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
  } catch (err) {
    console.error("SALON APPLICATION ERROR:", err);

    return NextResponse.json(
      {
        error: "Application failed.",
      },
      { status: 500 }
    );
  }
}
