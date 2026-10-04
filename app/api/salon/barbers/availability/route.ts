import { NextResponse } from "next/server";

import { adminSupabase, requireProfile } from "@/app/lib/supabase/serverAuth";

// Only the barber themself, or the owner of the salon the barber belongs to,
// may change that barber's working hours.
async function canEditBarber(
  profile: { role: string | null; salon_id: string | null; barber_id: string | null },
  barberId: string
) {
  if (profile.role === "barber") return profile.barber_id === barberId;
  if (profile.role !== "salon" || !profile.salon_id) return false;

  const { data } = await adminSupabase
    .from("barbers")
    .select("id")
    .eq("id", barberId)
    .eq("salon_id", profile.salon_id)
    .maybeSingle();

  return Boolean(data);
}

export async function POST(req: Request) {
  const auth = await requireProfile(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const barberId = String(body?.barberId ?? "").trim();

    if (!barberId) {
      return NextResponse.json({ error: "Missing barberId" }, { status: 400 });
    }

    if (!(await canEditBarber(auth.value.profile, barberId))) {
      return NextResponse.json(
        { error: "You cannot edit this barber's availability." },
        { status: 403 }
      );
    }

    if (body?.dayOfWeek === undefined) {
      return NextResponse.json({ error: "Missing dayOfWeek" }, { status: 400 });
    }

    const { error } = await adminSupabase.from("barber_working_hours").upsert(
      {
        barber_id: barberId,
        day_of_week: body.dayOfWeek,
        start_time: body.startTime || "09:00",
        end_time: body.endTime || "18:00",
        break_start: body.breakStart || null,
        break_end: body.breakEnd || null,
        active: body.active ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "barber_id,day_of_week" }
    );

    if (error) {
      console.error("SALON AVAILABILITY UPSERT ERROR:", error);
      return NextResponse.json({ error: "Could not save availability." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("SALON AVAILABILITY ERROR:", err);

    return NextResponse.json({ error: "Could not save availability." }, { status: 500 });
  }
}
