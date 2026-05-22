import { NextResponse } from "next/server";
import { sendBarberApplicationEmail } from "@/app/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.name || !body?.email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
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

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Application failed." },
      { status: 500 }
    );
  }
}