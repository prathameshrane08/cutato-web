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
      return NextResponse.json(
        {
          error: "Missing applicationId",
        },
        {
          status: 400,
        }
      );
    }

    const { data: application, error: fetchError } =
      await adminSupabase
        .from("applications")
        .select("*")
        .eq("id", applicationId)
        .single();

    if (fetchError || !application) {
      return NextResponse.json(
        {
          error: "Application not found",
        },
        {
          status: 404,
        }
      );
    }

    const tempPassword = generatePassword();

    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email: application.email,
        password: tempPassword,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error: authError?.message || "Could not create auth user",
        },
        {
          status: 500,
        }
      );
    }

    const role =
      application.type === "salon"
        ? "salon"
        : "barber";

    const { error: profileError } = await adminSupabase
      .from("profiles")
      .insert({
        id: authData.user.id,

        email: application.email,
        role,

        name:
          application.name ||
          application.owner_name ||
          application.salon_name,

        barber_id: null,
      });

    if (profileError) {
      return NextResponse.json(
        {
          error: profileError.message,
        },
        {
          status: 500,
        }
      );
    }

    const { error: updateError } = await adminSupabase
      .from("applications")
      .update({
        status: "approved",
      })
      .eq("id", applicationId);

      await sendApprovalEmail({
        to: application.email,
        role,
        temporaryPassword: tempPassword,
      });

    if (updateError) {
      return NextResponse.json(
        {
          error: updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      email: application.email,
      temporaryPassword: tempPassword,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || "Approval failed",
      },
      {
        status: 500,
      }
    );
  }
}