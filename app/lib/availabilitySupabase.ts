"use client";

import { supabase } from "@/app/lib/supabase";

export async function getReservedTimesForBarber(barberId: string, date: string): Promise<string[]> {
  // booking_slots exposes booked times without customer data (see supabase/schema.sql).
  const { data, error } = await supabase
    .from("booking_slots")
    .select("reserved_time")
    .eq("barber_id", barberId)
    .eq("date", date)
    .in("status", ["pending", "confirmed"]);

  if (error) {
    console.error(error);
    return [];
  }

  const reserved = (data ?? [])
    .flatMap((x: { reserved_time: string[] | null }) => x.reserved_time || [])
    .filter(Boolean);

  return [...new Set(reserved)];
}
