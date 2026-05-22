import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendApprovalEmail } from "@/app/lib/email";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generatePassword() {
  return Math.random().toString(36).slice(-10) + "A1!";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const applicationId = body.applicationId;

    if (!applicationId) {
      return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
    }

    const { data: application, error: fetchError } = await adminSupabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const email = String(application.email || "").trim().toLowerCase();

    if (!email || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Invalid application email." }, { status: 400 });
    }

    const role = application.type === "salon" ? "salon" : "barber";
    const tempPassword = generatePassword();

    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Could not create auth user" },
        { status: 500 }
      );
    }

    let barberId: string | null = null;
    let salonId: string | null = null;

    if (role === "salon") {
      const { data: salonRow, error: salonError } = await adminSupabase
        .from("salons")
        .insert({
          name: application.salon_name || application.name || email.split("@")[0],
          owner_name: application.owner_name || application.name || null,
          email,
          phone: application.phone || null,
          city: application.city || null,
          address: application.address || null,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (salonError || !salonRow) {
        return NextResponse.json(
          { error: salonError?.message || "Could not create salon profile" },
          { status: 500 }
        );
      }

      salonId = salonRow.id;
    }

    if (role === "barber") {
      const { data: barberRow, error: barberError } = await adminSupabase
        .from("barbers")
        .insert({
          name: application.name || email.split("@")[0],
          area: application.city || "Unknown",
          address: application.address || application.city || "Unknown",
          dist_km: 0,
          rating: 5,
          reviews: 0,
          tagline: "New Cutato barber",
          about: application.experience || "Professional barber on Cutato.",
          active: true,
          salon_id: null,
        })
        .select()
        .single();

      if (barberError || !barberRow) {
        return NextResponse.json(
          { error: barberError?.message || "Could not create barber profile" },
          { status: 500 }
        );
      }

      barberId = barberRow.id;
    }

    const profilePayload: any = {
      id: authData.user.id,
      email,
      role,
      name:
        application.name ||
        application.owner_name ||
        application.salon_name ||
        email.split("@")[0],
      barber_id: barberId,
    };

    if (salonId) {
      profilePayload.salon_id = salonId;
    }

    const { error: profileError } = await adminSupabase
      .from("profiles")
      .insert(profilePayload);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const { error: updateError } = await adminSupabase
      .from("applications")
      .update({ status: "approved" })
      .eq("id", applicationId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await sendApprovalEmail({
      to: email,
      role,
      temporaryPassword: tempPassword,
    });

    return NextResponse.json({
      ok: true,
      email,
      temporaryPassword: tempPassword,
      role,
      barberId,
      salonId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Approval failed" },
      { status: 500 }
    );
  }
}