"use client";

import { emitStoreUpdate, subscribeStoreUpdates } from "@/app/lib/storeEvents";
import { useCallback, useEffect, useMemo, useState } from "react";
/**
 * Unified Barber store
 * - Persists to localStorage
 * - Used by both customer app and portal pages
 * - Keeps backward compatibility with useCustomerBarbers()
 */

export type Barber = {
  id: string;
  name: string;

  // public profile fields
  area: string;
  address: string;
  distKm: number;
  rating: number;
  reviews: number;

  // optional profile details
  tagline?: string;
  about?: string;

  imageUrl?: string;
  speciality?: string;

  // optional location for maps
  lat?: number;
  lng?: number;

  // ownership / visibility
  salonId?: string;
  active?: boolean;
};

export type CustomerBarber = Barber;

const LS_KEY = "cutato_customer_barbers_v1";

function uid(prefix = "b") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeBarber(b: Barber): Barber {
  return {
    ...b,
    id: String(b.id ?? ""),
    name: String(b.name ?? "Barber"),
    area: String(b.area ?? "City Center"),
    address: String(b.address ?? ""),
    distKm: clamp(Number(b.distKm ?? 0), 0, 99),
    rating: clamp(Number(b.rating ?? 0), 0, 5),
    reviews: clamp(Number(b.reviews ?? 0), 0, 999999),
    tagline: b.tagline ? String(b.tagline) : undefined,
    about: b.about ? String(b.about) : undefined,
    lat: typeof b.lat === "number" ? b.lat : undefined,
    lng: typeof b.lng === "number" ? b.lng : undefined,
    salonId: b.salonId ? String(b.salonId) : undefined,
    active: b.active ?? true,
    imageUrl: b.imageUrl ? String(b.imageUrl) : undefined,
    speciality: b.speciality ? String(b.speciality) : undefined,
  };
}

export function seedDefaultCustomerBarbers(): CustomerBarber[] {
  return [
    normalizeBarber({
      id: "altmarkt",
      name: "Altmarkt Barber Studio",
      area: "Altstadt",
      address: "Altmarkt 10, 01067 Dresden",
      distKm: 1.2,
      rating: 4.8,
      reviews: 312,
      tagline: "Clean fades • Sharp lines • Fast bookings",
      about:
        "Modern studio near Altmarkt. Great for fades, beard trims, and quick appointments. Friendly team and clean setup.",
      lat: 51.0504,
      lng: 13.7373,
      salonId: "salon_altstadt",
      active: true,
    }),
    normalizeBarber({
      id: "fade",
      name: "Fade & Co.",
      area: "Neustadt",
      address: "Alaunstraße 22, 01099 Dresden",
      distKm: 2.6,
      rating: 4.7,
      reviews: 221,
      tagline: "Fade specialists • Beard masters",
      about:
        "Known for clean fades and modern styles. Book instantly and reschedule anytime. Walk-ins welcome when available.",
      lat: 51.0656,
      lng: 13.7507,
      salonId: "salon_neustadt",
      active: true,
    }),
    normalizeBarber({
      id: "abhi",
      name: "Abhi’s Cuts",
      area: "Striesen",
      address: "Borsbergstraße 35, 01309 Dresden",
      distKm: 3.4,
      rating: 4.6,
      reviews: 148,
      tagline: "Classic cuts • Student-friendly",
      about:
        "Affordable, reliable cuts with a calm vibe. Good for quick trims, classic styles, and beard maintenance.",
      lat: 51.0469,
      lng: 13.7876,
      salonId: "salon_striesen",
      active: true,
    }),
    normalizeBarber({
      id: "sednitz",
      name: "Sedlitz Barber Lounge",
      area: "Seidnitz",
      address: "Enderstraße 6, 01277 Dresden",
      distKm: 4.9,
      rating: 4.5,
      reviews: 96,
      tagline: "Relaxed vibe • Precision work",
      about:
        "A relaxed local lounge with experienced barbers. Great for beard trims and tidy cuts. Clean, comfortable setup.",
      lat: 51.0358,
      lng: 13.8079,
      salonId: "salon_seidnitz",
      active: true,
    }),
  ];
}

/**
 * Read from localStorage (client only)
 */
export function readCustomerBarbers(): CustomerBarber[] {
  if (typeof window === "undefined") return seedDefaultCustomerBarbers();

  const parsed = safeParse<CustomerBarber[]>(localStorage.getItem(LS_KEY));
  if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
    return seedDefaultCustomerBarbers();
  }

  return parsed.map(normalizeBarber);
}

/**
 * Alias for portal code
 */
export function readBarbers(): Barber[] {
  return readCustomerBarbers();
}

/**
 * Write to localStorage
 */
export function writeCustomerBarbers(list: CustomerBarber[]) {
  if (typeof window === "undefined") return;

  const clean = (list ?? []).map(normalizeBarber);
  localStorage.setItem(LS_KEY, JSON.stringify(clean));
  emitStoreUpdate(LS_KEY);
}

/**
 * Alias for portal code
 */
export function writeBarbers(list: Barber[]) {
  writeCustomerBarbers(list);
}

/**
 * Ensure defaults exist on first run
 */
export function ensureCustomerBarbersSeeded() {
  if (typeof window === "undefined") return;

  const current = safeParse<CustomerBarber[]>(localStorage.getItem(LS_KEY));
  const defaults = seedDefaultCustomerBarbers();

  if (!current || !Array.isArray(current) || current.length === 0) {
    localStorage.setItem(LS_KEY, JSON.stringify(defaults));
    emitStoreUpdate(LS_KEY);
    return;
  }

  const byId = new Map(current.map((b) => [b.id, b]));
  let changed = false;

  for (const d of defaults) {
    if (!byId.has(d.id)) {
      byId.set(d.id, d);
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify(Array.from(byId.values()).map(normalizeBarber))
    );
    emitStoreUpdate(LS_KEY);
  }
}

export function ensureBarbersSeeded() {
  ensureCustomerBarbersSeeded();
}

export function upsertBarber(b: Barber) {
  const next = normalizeBarber({ ...b, id: b.id || uid("barber") });

  const current = readCustomerBarbers();
  const i = current.findIndex((x) => x.id === next.id);

  if (i >= 0) current[i] = next;
  else current.unshift(next);

  writeCustomerBarbers(current);
  return current;
}

export function removeBarber(id: string) {
  const current = readCustomerBarbers().filter((b) => b.id !== id);
  writeCustomerBarbers(current);
  return current;
}

/**
 * Main hook
 */
export function useCustomerBarbers() {
  const [barbers, setBarbers] = useState<CustomerBarber[]>([]);

  const refresh = useCallback(() => {
  setBarbers(readCustomerBarbers());
}, []);

const upsert = useCallback((b: CustomerBarber) => {
  setBarbers(upsertBarber(b));
}, []);

const remove = useCallback((id: string) => {
  setBarbers(removeBarber(id));
}, []);

const setAll = useCallback((list: CustomerBarber[]) => {
  writeCustomerBarbers(list);
  setBarbers(list.map(normalizeBarber));
}, []);

  const byId = useMemo(() => new Map(barbers.map((b) => [b.id, b])), [barbers]);


  return {
    barbers,
    byId,
    refresh,
    upsert,
    remove,
    setAll,
  };
}