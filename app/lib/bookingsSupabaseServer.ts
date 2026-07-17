import { createClient } from "@supabase/supabase-js";

export type AvailabilityBooking = {
  date: string;
  time: string;
  reservedTimes: string[];
  status: string;
};

type SupabaseAvailabilityBooking = {
  date: string;
  time: string;
  reserved_time: string[] | null;
  status: string | null;
};

function getServerSupabaseClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing."
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

export async function getServerBookingsForBarber(
  barberId: string
): Promise<AvailabilityBooking[]> {
  const supabase =
    getServerSupabaseClient();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "date, time, reserved_time, status"
    )
    .or(
      `barber_id.eq.${barberId},assigned_barber_id.eq.${barberId}`
    )
    .order("date", {
      ascending: true,
    })
    .order("time", {
      ascending: true,
    });

  if (error) {
    console.error(
      "SERVER BARBER BOOKINGS ERROR:",
      error.message
    );

    console.error(
      "SERVER BARBER BOOKINGS DETAILS:",
      error.details
    );

    throw new Error(
      error.message ||
        "Could not load barber bookings."
    );
  }

  return (
    (data ?? []) as SupabaseAvailabilityBooking[]
  ).map((booking) => {
    return {
      date: booking.date,
      time: booking.time,
      reservedTimes: Array.isArray(
        booking.reserved_time
      )
        ? booking.reserved_time
        : [],
      status:
        booking.status ?? "pending",
    };
  });
}