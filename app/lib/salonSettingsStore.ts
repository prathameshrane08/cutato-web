"use client";
import { emitStoreUpdate } from "@/app/lib/storeEvents";

export type DefaultPaymentMethod = "online" | "salon" | "both";

export type SalonSettings = {
  salonName: string;
  address: string;
  phone: string;
  email: string;
  website: string;

  openingNote: string;
  cancellationPolicy: string;

  currency: string;
  timezone: string;
  defaultPaymentMethod: DefaultPaymentMethod;

  logoUrl: string;
  coverImageUrl: string;

  updatedAt?: string;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

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
  reservedTimes: string[];

  demand: "quiet" | "normal" | "busy";

  basePriceEuro: number;
  servicePriceEuro: number;
  tipEuro: number;
  totalEuro: number;

  paymentMethod: "online" | "salon";
  userEmail: string;

  status?: BookingStatus;
  assignedBarberId?: string;
};
const KEY = "cutato_bookings_v1";
const STORAGE_KEY = "cutato_salon_settings_v1";
export function writeBookings(list: Booking[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list ?? []));
  emitStoreUpdate(KEY);
}

export function defaultSalonSettings(): SalonSettings {
  return {
    salonName: "Cutato Barber Studio",
    address: "Altmarkt 10, 01067 Dresden",
    phone: "+49 000 000000",
    email: "hello@cutato.com",
    website: "",

    openingNote: "Walk-ins welcome when slots are free.",
    cancellationPolicy: "Please cancel at least 2 hours before your appointment.",

    currency: "EUR",
    timezone: "Europe/Berlin",
    defaultPaymentMethod: "both",

    logoUrl: "",
    coverImageUrl: "",

    updatedAt: new Date().toISOString(),
  };
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeSettings(input?: Partial<SalonSettings> | null): SalonSettings {
  const base = defaultSalonSettings();

  return {
    salonName: String(input?.salonName ?? base.salonName),
    address: String(input?.address ?? base.address),
    phone: String(input?.phone ?? base.phone),
    email: String(input?.email ?? base.email),
    website: String(input?.website ?? base.website),

    openingNote: String(input?.openingNote ?? base.openingNote),
    cancellationPolicy: String(input?.cancellationPolicy ?? base.cancellationPolicy),

    currency: String(input?.currency ?? base.currency),
    timezone: String(input?.timezone ?? base.timezone),
    defaultPaymentMethod:
      input?.defaultPaymentMethod === "online" ||
      input?.defaultPaymentMethod === "salon" ||
      input?.defaultPaymentMethod === "both"
        ? input.defaultPaymentMethod
        : base.defaultPaymentMethod,

    logoUrl: String(input?.logoUrl ?? base.logoUrl),
    coverImageUrl: String(input?.coverImageUrl ?? base.coverImageUrl),

    updatedAt: String(input?.updatedAt ?? base.updatedAt),
  };
}

export function readSalonSettings(): SalonSettings {
  if (typeof window === "undefined") return defaultSalonSettings();

  const parsed = safeParse<SalonSettings>(localStorage.getItem(STORAGE_KEY));
  if (!parsed) return defaultSalonSettings();

  return normalizeSettings(parsed);
}

export function writeSalonSettings(settings: SalonSettings) {
  if (typeof window === "undefined") return;

  const normalized = normalizeSettings({
    ...settings,
    updatedAt: new Date().toISOString(),
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function patchSalonSettings(patch: Partial<SalonSettings>) {
  const current = readSalonSettings();
  const next = normalizeSettings({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });

  writeSalonSettings(next);
  return next;
}

export function resetSalonSettings() {
  const next = defaultSalonSettings();
  writeSalonSettings(next);
  return next;
}

export function getSalonDisplayName() {
  return readSalonSettings().salonName;
}

export function getSalonPrimaryContact() {
  const s = readSalonSettings();
  return {
    phone: s.phone,
    email: s.email,
    website: s.website,
    address: s.address,
  };
}

export function getSalonPaymentDefaults() {
  const s = readSalonSettings();
  return {
    currency: s.currency,
    timezone: s.timezone,
    defaultPaymentMethod: s.defaultPaymentMethod,
  };
}