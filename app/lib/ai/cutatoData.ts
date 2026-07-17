import { createClient } from "@supabase/supabase-js";

export type AIBarber = {
  id: string;
  name: string;
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
};

export type AIService = {
  id: string;
  barber_id: string;
  name: string;
  category: string;
  duration_min: number;
  base_price_euro: number;
  description: string | null;
  active: boolean;
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function getAIBarbers(): Promise<
  AIBarber[]
> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("barbers")
    .select(
      `
      id,
      name,
      area,
      address,
      dist_km,
      rating,
      reviews,
      tagline,
      about,
      image_url,
      speciality,
      active
      `
    )
    .eq("active", true)
    .order("rating", {
      ascending: false,
    });

  if (error) {
    console.error(
      "AI BARBERS FETCH ERROR:",
      error.message
    );

    throw error;
  }

  return (data ?? []) as AIBarber[];
}

export async function getAIServices(): Promise<
  AIService[]
> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("services")
    .select(
      `
      id,
      barber_id,
      name,
      category,
      duration_min,
      base_price_euro,
      description,
      active
      `
    )
    .eq("active", true)
    .order("base_price_euro", {
      ascending: true,
    });

  if (error) {
    console.error(
      "AI SERVICES FETCH ERROR:",
      error.message
    );

    throw error;
  }

  return (data ?? []) as AIService[];
}

export async function getCutatoAIContext() {
  const [barbers, services] =
    await Promise.all([
      getAIBarbers(),
      getAIServices(),
    ]);

  return {
    barbers,
    services,
  };
}