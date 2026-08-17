import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendApprovalEmail } from "@/app/lib/email";

export const runtime = "nodejs";

//--------------------------------------------------
// Supabase admin client
//--------------------------------------------------

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

//--------------------------------------------------
// Generate temporary password
//--------------------------------------------------

function generatePassword() {
  const randomPart = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 12);

  return `${randomPart}A1!`;
}

//==================================================
// GET
// Load all applications
//==================================================

export async function GET() {
  try {
    const { data, error } =
      await adminSupabase
        .from("applications")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      applications: data ?? [],
    });
  } catch (error) {
    console.error(
      "ADMIN APPLICATION GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load applications.",
      },
      {
        status: 500,
      }
    );
  }
}

//==================================================
// POST
// Approve application
//==================================================

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const applicationId =
      String(
        body.applicationId || ""
      ).trim();

    //------------------------------------------------
    // Validate application ID
    //------------------------------------------------

    if (!applicationId) {
      return NextResponse.json(
        {
          error:
            "Missing applicationId.",
        },
        {
          status: 400,
        }
      );
    }

    //------------------------------------------------
    // Get application
    //------------------------------------------------

    const {
      data: application,
      error: fetchError,
    } = await adminSupabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (
      fetchError ||
      !application
    ) {
      return NextResponse.json(
        {
          error:
            "Application not found.",
        },
        {
          status: 404,
        }
      );
    }

    //------------------------------------------------
    // Prevent duplicate approval
    //------------------------------------------------

    if (
      application.status ===
      "approved"
    ) {
      return NextResponse.json(
        {
          error:
            "This application has already been approved.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      application.status ===
      "rejected"
    ) {
      return NextResponse.json(
        {
          error:
            "This application has been rejected.",
        },
        {
          status: 409,
        }
      );
    }

    //------------------------------------------------
    // Validate email
    //------------------------------------------------

    const email =
      String(
        application.email || ""
      )
        .trim()
        .toLowerCase();

    if (
      !email ||
      !email.includes("@") ||
      !email.includes(".")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid application email.",
        },
        {
          status: 400,
        }
      );
    }

    //------------------------------------------------
    // Determine account role
    //------------------------------------------------

    const role:
      | "barber"
      | "salon" =
      application.type === "salon"
        ? "salon"
        : "barber";

    //------------------------------------------------
    // Check whether profile already exists
    //------------------------------------------------

    const {
      data: existingProfile,
      error: existingProfileError,
    } = await adminSupabase
      .from("profiles")
      .select(
        "id,email,role,barber_id,salon_id"
      )
      .eq("email", email)
      .maybeSingle();

    if (existingProfileError) {
      return NextResponse.json(
        {
          error:
            existingProfileError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (existingProfile) {
      return NextResponse.json(
        {
          error:
            "An account for this email already exists.",
        },
        {
          status: 409,
        }
      );
    }

    //------------------------------------------------
    // Generate temporary password
    //------------------------------------------------

    const temporaryPassword =
      generatePassword();

    //------------------------------------------------
    // Create Supabase Auth user
    //------------------------------------------------

    const {
      data: authData,
      error: authError,
    } =
      await adminSupabase.auth.admin.createUser(
        {
          email,

          password:
            temporaryPassword,

          email_confirm: true,
        }
      );

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Could not create authentication account.",
        },
        {
          status: 500,
        }
      );
    }

    //------------------------------------------------
    // IDs linked to profile
    //------------------------------------------------

    let barberId:
      | string
      | null = null;

    let salonId:
      | string
      | null = null;

    // Track created business record for rollback
    let createdBarberId:
      | string
      | null = null;

    let createdSalonId:
      | string
      | null = null;

    //------------------------------------------------
    // Create SALON
    //------------------------------------------------

    if (role === "salon") {
      const {
        data: salonRow,
        error: salonError,
      } = await adminSupabase
        .from("salons")
        .insert({
          name:
            application.salon_name ||
            application.name ||
            email.split("@")[0],

          owner_name:
            application.owner_name ||
            application.name ||
            null,

          email,

          phone:
            application.phone ||
            null,

          city:
            application.city ||
            null,

          address:
            application.address ||
            null,

          active: true,

          updated_at:
            new Date().toISOString(),
        })
        .select()
        .single();

      if (
        salonError ||
        !salonRow
      ) {
        //------------------------------------------------
        // Remove Auth user if salon creation failed
        //------------------------------------------------

        await adminSupabase.auth.admin.deleteUser(
          authData.user.id
        );

        return NextResponse.json(
          {
            error:
              salonError?.message ||
              "Could not create salon profile.",
          },
          {
            status: 500,
          }
        );
      }

      salonId =
        salonRow.id;

      createdSalonId =
        salonRow.id;
    }

    //------------------------------------------------
    // Create BARBER
    //------------------------------------------------

    if (role === "barber") {
      const generatedBarberId =
        crypto.randomUUID();

      const {
        data: barberRow,
        error: barberError,
      } = await adminSupabase
        .from("barbers")
        .insert({
          id:
            generatedBarberId,

          name:
            application.name ||
            email.split("@")[0],

          email,

          area:
            application.city ||
            "Unknown",

          address:
            application.address ||
            application.city ||
            "Unknown",

          dist_km: 0,

          rating: 5,

          reviews: 0,

          tagline:
            "New Cutato barber",

          about:
            application.experience ||
            "Professional barber on Cutato.",

          active: true,

          salon_id: null,
        })
        .select()
        .single();

      if (
        barberError ||
        !barberRow
      ) {
        //------------------------------------------------
        // Remove Auth user if barber creation failed
        //------------------------------------------------

        await adminSupabase.auth.admin.deleteUser(
          authData.user.id
        );

        return NextResponse.json(
          {
            error:
              barberError?.message ||
              "Could not create barber profile.",
          },
          {
            status: 500,
          }
        );
      }

      barberId =
        barberRow.id;

      createdBarberId =
        barberRow.id;
    }

    //------------------------------------------------
    // Create CUTATO profile
    //------------------------------------------------

    const profilePayload = {
      id:
        authData.user.id,

      email,

      role,

      name:
        application.name ||
        application.owner_name ||
        application.salon_name ||
        email.split("@")[0],

      barber_id:
        barberId,

      salon_id:
        salonId,
    };

    const {
      error: profileError,
    } = await adminSupabase
      .from("profiles")
      .insert(
        profilePayload
      );

    //------------------------------------------------
    // Roll back if profile creation fails
    //------------------------------------------------

    if (profileError) {
      console.error(
        "PROFILE CREATION ERROR:",
        profileError
      );

      if (
        createdBarberId
      ) {
        await adminSupabase
          .from("barbers")
          .delete()
          .eq(
            "id",
            createdBarberId
          );
      }

      if (
        createdSalonId
      ) {
        await adminSupabase
          .from("salons")
          .delete()
          .eq(
            "id",
            createdSalonId
          );
      }

      await adminSupabase.auth.admin.deleteUser(
        authData.user.id
      );

      return NextResponse.json(
        {
          error:
            profileError.message,
        },
        {
          status: 500,
        }
      );
    }

    //------------------------------------------------
    // Mark application approved
    //------------------------------------------------

    const {
      error: updateError,
    } = await adminSupabase
      .from("applications")
      .update({
        status:
          "approved",
      })
      .eq(
        "id",
        applicationId
      );

    if (updateError) {
      console.error(
        "APPLICATION STATUS UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    //------------------------------------------------
    // Send approval email
    //------------------------------------------------

    let emailSent =
      false;

    try {
      await sendApprovalEmail({
        to: email,

        role,

        temporaryPassword,
      });

      emailSent =
        true;
    } catch (emailError) {
      //------------------------------------------------
      // Do NOT fail approval because email failed.
      //------------------------------------------------

      console.error(
        "APPROVAL EMAIL ERROR:",
        emailError
      );
    }

    //------------------------------------------------
    // IMPORTANT:
    // temporaryPassword is returned ONLY so we can
    // test the development approval/login flow.
    //
    // Remove this before production.
    //------------------------------------------------

    return NextResponse.json({
      ok: true,

      email,

      temporaryPassword,

      emailSent,

      role,

      barberId,

      salonId,

      userId:
        authData.user.id,
    });
  } catch (error) {
    console.error(
      "ADMIN APPROVAL ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Approval failed.",
      },
      {
        status: 500,
      }
    );
  }
}

//==================================================
// PATCH
// Change application status
//==================================================

export async function PATCH(
  request: Request
) {
  try {
    const body =
      await request.json();

    const applicationId =
      String(
        body.applicationId || ""
      ).trim();

    const status =
      String(
        body.status || ""
      ).trim();

    //------------------------------------------------
    // Validate application ID
    //------------------------------------------------

    if (!applicationId) {
      return NextResponse.json(
        {
          error:
            "Missing applicationId.",
        },
        {
          status: 400,
        }
      );
    }

    //------------------------------------------------
    // Allowed manual statuses
    //------------------------------------------------

    const allowedStatuses = [
      "pending",
      "rejected",
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid application status.",
        },
        {
          status: 400,
        }
      );
    }

    //------------------------------------------------
    // Update
    //------------------------------------------------

    const {
      data,
      error,
    } = await adminSupabase
      .from("applications")
      .update({
        status,
      })
      .eq(
        "id",
        applicationId
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      ok: true,

      application:
        data,
    });
  } catch (error) {
    console.error(
      "ADMIN APPLICATION PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update application.",
      },
      {
        status: 500,
      }
    );
  }
}