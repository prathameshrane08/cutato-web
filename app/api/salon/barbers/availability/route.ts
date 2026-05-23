import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.barberId && body?.barberId !== "") {
      return NextResponse.json({ error: "Missing barberId" }, { status: 400 });
    }

    if (body?.dayOfWeek === undefined) {
      return NextResponse.json({ error: "Missing dayOfWeek" }, { status: 400 });
    }

    const { error } = await adminSupabase
      .from("barber_working_hours")
      .upsert(
        {
          barber_id: body.barberId,
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Could not save availability." },
      { status: 500 }
    );
  }
}