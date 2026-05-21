"use client";

import { supabase } from "@/app/lib/supabase";
import type { Booking, BookingStatus } from "@/app/lib/bookingStore";

export type SupabaseBooking = {
  id: string;
  created_at: string;
  user_id: string | null;

  barber_id: string;
  barber_name: string;

  service_id: string;
  service_name: string;
  duration_min: number;

  date: string;
  time: string;
  reserved_time: string[] | null;

  demand: "quiet" | "normal" | "busy" | null;

  base_price_euro: number;
  service_price_euro: number;
  tip_euro: number;
  total_euro: number;

  payment_method: "online" | "salon";
  user_email: string;

  status: BookingStatus;
  assigned_barber_id: string | null;

  reference_image: string | null;
  haircut_brief: string | null;
  ai_style: string | null;
};

export function mapSupabaseBooking(row: SupabaseBooking): Booking {
  return {
    id: row.id,
    createdAt: row.created_at,

    barberId: row.barber_id,
    barberName: row.barber_name,

    serviceId: row.service_id,
    serviceName: row.service_name,
    durationMin: Number(row.duration_min || 0),

    date: row.date,
    time: row.time,
    reservedTimes: Array.isArray(row.reserved_time) ? row.reserved_time : [],

    demand: row.demand || "normal",

    basePriceEuro: Number(row.base_price_euro || 0),
    servicePriceEuro: Number(row.service_price_euro || 0),
    tipEuro: Number(row.tip_euro || 0),
    totalEuro: Number(row.total_euro || 0),

    paymentMethod: row.payment_method || "salon",
    userEmail: row.user_email,
    

    status: row.status || "pending",
    assignedBarberId: row.assigned_barber_id || row.barber_id,

    referenceImage: row.reference_image ?? undefined,
    haircutBrief: row.haircut_brief ?? undefined,
    aiStyle: row.ai_style ?? undefined,
  };
}

export function mapBookingToSupabase(b: Booking) {
  return {
    id: b.id,
    created_at: b.createdAt,

    barber_id: b.barberId,
    barber_name: b.barberName,

    service_id: b.serviceId,
    service_name: b.serviceName,
    duration_min: Number(b.durationMin || 30),

    date: b.date,
    time: b.time,
    reserved_time: b.reservedTimes ?? [],

    demand: b.demand || "normal",

    base_price_euro: Number(b.basePriceEuro || 0),
    service_price_euro: Number(b.servicePriceEuro || 0),
    tip_euro: Number(b.tipEuro || 0),
    total_euro: Number(b.totalEuro || 0),

    payment_method: b.paymentMethod || "salon",
    user_email: b.userEmail,
    user_id: (b as any).userId || null,

    status: b.status || "pending",
    assigned_barber_id: b.assignedBarberId || b.barberId,

    reference_image: b.referenceImage ?? null,
    haircut_brief: b.haircutBrief ?? null,
    ai_style: b.aiStyle ?? null,
      };
}

export async function createBookingInSupabase(b: Booking): Promise<Booking> {
  const payload = mapBookingToSupabase(b);

  const { error } = await supabase
    .from("bookings")
    .insert([payload]);

  if (error) {
    console.error("SUPABASE BOOKING ERROR MESSAGE:", error.message);
    console.error("SUPABASE BOOKING ERROR DETAILS:", error.details);
    console.error("SUPABASE BOOKING ERROR HINT:", error.hint);
    console.error("SUPABASE BOOKING ERROR CODE:", error.code);
    console.error("BOOKING PAYLOAD:", payload);

    throw new Error(
      `${error.message || "Supabase insert failed"} ${
        error.details ? `- ${error.details}` : ""
      }`
    );
  }

  return b;
}

export async function getBookingsForUser(email: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_email", email.trim().toLowerCase())
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as SupabaseBooking[]).map(mapSupabaseBooking);
}

export async function getBookingsForBarber(barberId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error("GET BARBER BOOKINGS ERROR:", error.message);
    console.error("DETAILS:", error.details);
    throw error;
  }

  return ((data ?? []) as SupabaseBooking[]).map(mapSupabaseBooking);
}

export async function getAllBookingsFromSupabase(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as SupabaseBooking[]).map(mapSupabaseBooking);
}

export async function updateBookingStatusInSupabase(
  id: string,
  status: BookingStatus
): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

export async function getBookingByIdFromSupabase(id: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapSupabaseBooking(data as SupabaseBooking) : null;
}

export async function getBookingsFromSupabase(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    throw error;
  }

  return ((data ?? []) as SupabaseBooking[]).map(mapSupabaseBooking);
}

export async function updateBookingAssignmentInSupabase(
  id: string,
  barberId: string,
  barberName: string
): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({
      barber_id: barberId,
      assigned_barber_id: barberId,
      barber_name: barberName,
    })
    .eq("id", id);

  if (error) throw error;
}