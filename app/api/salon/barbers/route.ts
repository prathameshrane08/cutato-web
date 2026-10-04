import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendApprovalEmail } from "@/app/lib/email";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function generateTemporaryPassword() {
  const randomPart = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  return `Cutato!${randomPart}9`;
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization");

  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return header.slice(7).trim();
}

export async function POST(req: Request) {
  let createdAuthUserId = "";
  let createdBarberId = "";

  try {
    const token = bearerToken(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Please login again." }, { status: 401 });
    }

    const { data: authData, error: authError } = await adminSupabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error: "Your session is invalid or expired. Please login again.",
        },
        { status: 401 }
      );
    }

    const salonOwner = authData.user;

    const { data: ownerProfile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("id, role, salon_id")
      .eq("id", salonOwner.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        {
          error: `Could not verify salon account: ${profileError.message}`,
        },
        { status: 500 }
      );
    }

    if (!ownerProfile || ownerProfile.role !== "salon" || !ownerProfile.salon_id) {
      return NextResponse.json(
        {
          error: "This account is not linked to a valid salon.",
        },
        { status: 403 }
      );
    }

    const salonId = String(ownerProfile.salon_id);

    const { data: salon, error: salonError } = await adminSupabase
      .from("salons")
      .select("id, name, city, address")
      .eq("id", salonId)
      .maybeSingle();

    if (salonError || !salon) {
      return NextResponse.json(
        {
          error: salonError?.message || "Salon not found.",
        },
        { status: 404 }
      );
    }

    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const area = String(body?.area ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const speciality = String(body?.speciality ?? "").trim();
    const tagline = String(body?.tagline ?? "").trim();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    const { data: existingBarber, error: existingBarberError } = await adminSupabase
      .from("barbers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingBarberError) {
      return NextResponse.json({ error: existingBarberError.message }, { status: 500 });
    }

    if (existingBarber) {
      return NextResponse.json(
        {
          error: "A barber with this email already exists.",
        },
        { status: 409 }
      );
    }

    const temporaryPassword = generateTemporaryPassword();

    const { data: createdAuth, error: createAuthError } = await adminSupabase.auth.admin.createUser(
      {
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          name,
          role: "barber",
        },
      }
    );

    if (createAuthError || !createdAuth.user) {
      const duplicate = createAuthError?.message?.toLowerCase().includes("already");

      return NextResponse.json(
        {
          error: duplicate
            ? "A CUTATO login already exists for this email."
            : createAuthError?.message || "Could not create barber login.",
        },
        { status: duplicate ? 409 : 500 }
      );
    }

    createdAuthUserId = createdAuth.user.id;
    createdBarberId = crypto.randomUUID();

    const { error: barberError } = await adminSupabase.from("barbers").insert({
      id: createdBarberId,
      name,
      email,
      area: area || salon.city || "Unknown",
      address: address || salon.address || area || "Unknown",
      speciality: speciality || null,
      tagline: tagline || null,
      dist_km: 0,
      rating: 5,
      reviews: 0,
      active: true,
      salon_id: salonId,
    });

    if (barberError) {
      await adminSupabase.auth.admin.deleteUser(createdAuthUserId);

      return NextResponse.json({ error: barberError.message }, { status: 500 });
    }

    const { error: cutatoProfileError } = await adminSupabase.from("profiles").upsert(
      {
        id: createdAuthUserId,
        name,
        email,
        role: "barber",
        barber_id: createdBarberId,
        salon_id: salonId,
      },
      {
        onConflict: "id",
      }
    );

    if (cutatoProfileError) {
      await adminSupabase.from("barbers").delete().eq("id", createdBarberId);

      await adminSupabase.auth.admin.deleteUser(createdAuthUserId);

      return NextResponse.json(
        {
          error: `Barber account mapping failed: ${cutatoProfileError.message}`,
        },
        { status: 500 }
      );
    }

    let emailSent = false;

    try {
      const result = await sendApprovalEmail({
        to: email,
        role: "barber",
        temporaryPassword,
      });

      emailSent = Boolean(result);
    } catch (emailError) {
      console.error("SALON BARBER LOGIN EMAIL ERROR:", emailError);
    }

    return NextResponse.json({
      ok: true,
      barberId: createdBarberId,
      authUserId: createdAuthUserId,
      name,
      email,
      salonId,
      salonName: salon.name,
      emailSent,
    });
  } catch (err: unknown) {
    console.error("CREATE SALON BARBER ERROR:", err);

    if (createdBarberId) {
      await adminSupabase.from("barbers").delete().eq("id", createdBarberId);
    }

    if (createdAuthUserId) {
      await adminSupabase.auth.admin.deleteUser(createdAuthUserId);
    }

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not add barber.",
      },
      { status: 500 }
    );
  }
}
