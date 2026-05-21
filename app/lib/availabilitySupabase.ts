"use client";

import { supabase } from "@/app/lib/supabase";

export async function getReservedTimesForBarber(
  barberId: string,
  date: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("reserved_time")
    .eq("barber_id", barberId)
    .eq("date", date)
    .in("status", ["pending", "confirmed"]);

  if (error) {
    console.error(error);
    return [];
  }

  const reserved = (data ?? [])
    .flatMap((x: any) => x.reserved_time || [])
    .filter(Boolean);

  return [...new Set(reserved)];
}