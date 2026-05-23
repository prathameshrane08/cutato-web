import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.name || !body?.salonId) {
      return NextResponse.json(
        { error: "Name and salonId are required." },
        { status: 400 }
      );
    }

    const { error } = await adminSupabase.from("barbers").insert({
      name: body.name,
      email: body.email,
      area: body.area || "Unknown",
      address: body.address || body.area || "Unknown",
      speciality: body.speciality,
      tagline: body.tagline,
      dist_km: 0,
      rating: 5,
      reviews: 0,
      active: true,
      salon_id: body.salonId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Could not add barber." },
      { status: 500 }
    );
  }
}