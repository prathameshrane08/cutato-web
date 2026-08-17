"use client";

import { supabase } from "@/app/lib/supabase";

export type SupabaseBarber = {
  id: string;
  name: string;
  email?: string | null;
  area: string;
  address: string;
  dist_km: number;
  rating: number;
  reviews: number;
  tagline: string | null;
  about: string | null;
  image_url: string | null;
  speciality: string | null;
  active: boolean;
  salon_id: string | null;
};

export async function getBarbersFromSupabase(): Promise<SupabaseBarber[]> {
  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getBarbersForSalonFromSupabase(
  salonId: string
): Promise<SupabaseBarber[]> {
  if (!salonId) return [];

  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .eq("salon_id", salonId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function upsertBarberToSupabase(
  barber: SupabaseBarber
): Promise<void> {
  const payload = {
    ...barber,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("barbers")
    .upsert(payload);

  if (error) throw error;
}

export async function deleteBarberFromSupabase(
  id: string,
  salonId?: string
): Promise<void> {
  let query = supabase
    .from("barbers")
    .delete()
    .eq("id", id);

  if (salonId) {
    query = query.eq("salon_id", salonId);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function getBarberByIdFromSupabase(
  id: string
): Promise<SupabaseBarber | null> {
  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function getBestActiveBarberFromSupabase(): Promise<SupabaseBarber | null> {
  const { data, error } = await supabase
    .from("barbers")
    .select("*")
    .eq("active", true)
    .order("rating", { ascending: false })
    .order("reviews", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}
