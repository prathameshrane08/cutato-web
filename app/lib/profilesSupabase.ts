"use client";

import { supabase } from "@/app/lib/supabase";
import type { UserRole } from "@/app/Components/auth";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  barber_id: string | null;
};

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(profile: Profile): Promise<void> {
  const { error } = await supabase.from("profiles").upsert(profile);

  if (error) throw error;
}