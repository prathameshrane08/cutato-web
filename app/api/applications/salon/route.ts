import { NextResponse } from "next/server";
import { sendSalonApplicationEmail } from "@/app/lib/email";

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