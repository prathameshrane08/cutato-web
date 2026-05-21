"use client";

import { emitStoreUpdate } from "@/app/lib/storeEvents";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentMethod = "online" | "salon";
export type Demand = "quiet" | "normal" | "busy";

export type Booking = {
  id: string;
  createdAt: string;

  barberId: string;
  barberName: string;

  serviceId: string;
  serviceName: string;
  durationMin: number;

  date: string;
  time: string;
  reservedTimes?: string[];

  demand?: "quiet" | "normal" | "busy";

  basePriceEuro?: number;
  servicePriceEuro?: number;
  tipEuro?: number;
  totalEuro?: number;

  paymentMethod?: "online" | "salon";
  userEmail: string;

  status?: BookingStatus;
  assignedBarberId?: string;

  referenceImage?: string;
  haircutBrief?: string;
  aiStyle?: string;
};

const KEY = "cutato_bookings_v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeBooking(b: Booking): Booking {
  return {
    ...b,
    id: String(b.id),
    createdAt: String(b.createdAt),
    barberId: String(b.barberId),
    barberName: String(b.barberName),
    serviceId: String(b.serviceId),
    serviceName: String(b.serviceName),
    durationMin: Number(b.durationMin || 0),
    date: String(b.date),
    time: String(b.time),
    reservedTimes: Array.isArray(b.reservedTimes) ? b.reservedTimes.map(String) : [],
    demand:
      b.demand === "quiet" || b.demand === "busy" || b.demand === "normal"
        ? b.demand
        : "normal",
    basePriceEuro: Number(b.basePriceEuro || 0),
    servicePriceEuro: Number(b.servicePriceEuro || 0),
    tipEuro: Number(b.tipEuro || 0),
    totalEuro: Number(b.totalEuro || 0),
    paymentMethod: b.paymentMethod === "online" ? "online" : "salon",
    userEmail: String(b.userEmail || ""),
    status:
      b.status === "confirmed" ||
      b.status === "completed" ||
      b.status === "cancelled" ||
      b.status === "no_show" ||
      b.status === "pending"
        ? b.status
        : "pending",
    assignedBarberId: b.assignedBarberId ? String(b.assignedBarberId) : undefined,
  };
}

export function readBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<Booking[]>(localStorage.getItem(KEY));
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.map(normalizeBooking);
}

export function writeBookings(list: Booking[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify((list ?? []).map(normalizeBooking)));
  emitStoreUpdate(KEY);
}

export function makeBookingId() {
  return `bk_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function bookingConflicts(
  list: Booking[],
  input: {
    barberId: string;
    date: string;
    reservedTimes: string[];
    ignoreBookingId?: string;
  }
) {
  const wanted = new Set(input.reservedTimes);
  return list.some((b) => {
    if (input.ignoreBookingId && b.id === input.ignoreBookingId) return false;
    if (b.barberId !== input.barberId) return false;
    if (b.date !== input.date) return false;

    const status = b.status ?? "pending";
    if (status === "cancelled" || status === "no_show") return false;

    const taken = b.reservedTimes?.length ? b.reservedTimes : [b.time];
    return taken.some((t) => wanted.has(t));
  });
}

export function addBooking(input: Booking) {
  const all = readBookings();

  if (
    bookingConflicts(all, {
      barberId: input.barberId,
      date: input.date,
      reservedTimes: input.reservedTimes?.length ? input.reservedTimes : [input.time],
    })
  ) {
    throw new Error("That slot has already been booked.");
  }

  const next = [normalizeBooking(input), ...all];
  writeBookings(next);
  return input;
}

export function updateBookingStatus(id: string, status: BookingStatus) {
  const all = readBookings();
  const next = all.map((b) => (b.id === id ? { ...b, status } : b));
  writeBookings(next);
  return next.find((b) => b.id === id) ?? null;
}

export function deleteBooking(id: string) {
  const next = readBookings().filter((b) => b.id !== id);
  writeBookings(next);
}

export function cancelBooking(id: string) {
  return updateBookingStatus(id, "cancelled");
}

export function rescheduleBooking(
  bookingId: string,
  nextData: {
    date: string;
    time: string;
    reservedTimes: string[];
  }
) {
  const all = readBookings();
  const current = all.find((b) => b.id === bookingId);
  if (!current) throw new Error("Booking not found.");

  if (
    bookingConflicts(all, {
      barberId: current.barberId,
      date: nextData.date,
      reservedTimes: nextData.reservedTimes,
      ignoreBookingId: bookingId,
    })
  ) {
    throw new Error("That new slot is already taken.");
  }

  const next = all.map((b) =>
    b.id === bookingId
      ? {
          ...b,
          date: nextData.date,
          time: nextData.time,
          reservedTimes: nextData.reservedTimes,
        }
      : b
  );

  writeBookings(next);
  return next.find((b) => b.id === bookingId) ?? null;
}